// netlify/functions/retell-webhook.js
// Receives Retell call_ended / call_analyzed webhooks, saves transcript to Airtable,
// and optionally links to an appointment by matching caller phone to recent bookings.
//
// Setup: In Retell dashboard (Account or Agent webhooks), set webhook URL to:
//   https://YOUR-SITE.netlify.app/.netlify/functions/retell-webhook
// Ensure RETELL_API_KEY and AIRTABLE_API_KEY (and optionally AIRTABLE_BASE_ID) are set in Netlify.

const crypto = require('crypto');

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';

function verifyRetellSignature(rawBody, signature, apiKey) {
    if (!signature || !apiKey) return false;
    try {
        const hmac = crypto.createHmac('sha256', apiKey);
        const digest = hmac.update(rawBody, 'utf8').digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
    } catch (e) {
        return false;
    }
}

function normalizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10); // last 10 digits (handles +1 etc.)
}

function phoneMatches(callerNorm, appointmentPhone) {
    if (!callerNorm) return false;
    const aptNorm = normalizePhone(String(appointmentPhone || ''));
    if (aptNorm === callerNorm) return true;
    // US: also match 1+10 vs 10
    if (callerNorm.length === 10 && aptNorm === '1' + callerNorm) return true;
    if (aptNorm.length === 10 && callerNorm === '1' + aptNorm) return true;
    return false;
}

async function findAppointmentByPhone(airtableKey, fromNumber) {
    const normalized = normalizePhone(fromNumber);
    if (!normalized) return null;
    try {
        // Sort by createdTime desc so the most recently created appointment (e.g. just added after call) is found first
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Appointments?sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=50`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${airtableKey}` } });
        if (!res.ok) return null;
        const data = await res.json();
        let records = (data.records || []).filter(r => r.fields && r.fields.Date);
        // Prefer most recently created (in case appointment was created after call_ended)
        records.sort((a, b) => (b.createdTime || '').localeCompare(a.createdTime || ''));
        const match = records.find(r => phoneMatches(normalized, (r.fields.Phone || '').toString()));
        return match ? match.id : null;
    } catch (e) {
        console.error('findAppointmentByPhone error:', e);
        return null;
    }
}

async function setAppointmentSource(airtableKey, appointmentId, source) {
    if (!airtableKey || !appointmentId) return;
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Appointments/${appointmentId}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${airtableKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: { Source: source } })
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('Retell set appointment source error:', res.status, err);
        }
    } catch (e) {
        console.error('Retell set appointment source error:', e);
    }
}

async function saveRetellTranscript(airtableKey, callId, transcript, bookingId, fromNumber) {
    if (!airtableKey || !callId) return;
    const transcriptText = typeof transcript === 'string' ? transcript : (transcript || '');
    const callerPhone = fromNumber && String(fromNumber).replace(/\D/g, '').length >= 10 ? String(fromNumber) : null;

    try {
        // Upsert: avoid duplicate transcripts when both call_ended and call_analyzed fire
        const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts?filterByFormula=${encodeURIComponent(`{transcript_id}='${String(callId).replace(/'/g, "\\'")}'`)}&maxRecords=1`;
        const findRes = await fetch(findUrl, { headers: { 'Authorization': `Bearer ${airtableKey}` } });
        if (findRes.ok) {
            const findData = await findRes.json();
            if (findData.records && findData.records.length > 0) {
                const recordId = findData.records[0].id;
                const updateFields = {
                    Source: 'Retell',
                    full_transcript: transcriptText || '(No transcript)'
                };
                if (bookingId) updateFields.booking_id = bookingId;
                if (callerPhone) updateFields.caller_phone = callerPhone;
                const patchRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts/${recordId}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${airtableKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields: updateFields })
                });
                if (!patchRes.ok) console.error('Retell transcript update error:', await patchRes.text());
                if (bookingId) await setAppointmentSource(airtableKey, bookingId, 'Retell');
                return;
            }
        }

        const fields = {
            transcript_id: callId,
            Source: 'Retell',
            full_transcript: transcriptText || '(No transcript)'
        };
        if (bookingId) fields.booking_id = bookingId;
        if (callerPhone) fields.caller_phone = callerPhone;

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${airtableKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: [{ fields }] })
        });
        if (!res.ok) console.error('Retell transcript save error:', res.status, await res.text());
        if (bookingId) await setAppointmentSource(airtableKey, bookingId, 'Retell');
    } catch (e) {
        console.error('Retell transcript save error:', e);
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-retell-signature',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // GET: so you can open the URL in a browser to confirm the function is deployed (no 404)
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ok: true, message: 'Retell webhook endpoint' })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: '' };
    }

    const rawBody = event.body || '';
    const signature = event.headers['x-retell-signature'] || event.headers['X-Retell-Signature'];
    const apiKey = process.env.RETELL_API_KEY;
    const skipVerify = process.env.RETELL_WEBHOOK_SKIP_VERIFY === 'true' || process.env.RETELL_WEBHOOK_SKIP_VERIFY === '1';

    // Verify signature unless skipped (set RETELL_WEBHOOK_SKIP_VERIFY=true in Netlify if test always returns 401)
    if (!skipVerify && apiKey && signature && !verifyRetellSignature(rawBody, signature, apiKey)) {
        console.error('Retell webhook: invalid signature');
        return { statusCode: 401, headers, body: '' };
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        console.error('Retell webhook: invalid JSON');
        return { statusCode: 400, headers, body: '' };
    }

    const { event: eventType, call } = payload;
    if (!call || !call.call_id) {
        return { statusCode: 204, headers, body: '' };
    }

    // Save transcript when call ends or when analysis is ready (full transcript available)
    if (eventType === 'call_ended' || eventType === 'call_analyzed') {
        const transcript = call.transcript || call.transcript_with_tool_calls;
        const transcriptStr = typeof transcript === 'string'
            ? transcript
            : (Array.isArray(transcript) ? transcript.map(t => (t.role || t.type || '') + ': ' + (t.content || t.message || '')).join('\n\n') : '');

        const airtableKey = process.env.AIRTABLE_API_KEY;
        if (airtableKey) {
            let bookingId = null;
            if (call.from_number) {
                bookingId = await findAppointmentByPhone(airtableKey, call.from_number);
            }
            await saveRetellTranscript(airtableKey, call.call_id, transcriptStr, bookingId, call.from_number);
        }
    }

    return { statusCode: 204, headers, body: '' };
};
