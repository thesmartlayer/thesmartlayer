// netlify/functions/retell-webhook.js
// Receives Retell webhooks, saves transcript to Airtable Transcripts table,
// links to most recent appointment, and sets Source to "Retell".
//
// Webhook URL: https://thesmartlayer.com/.netlify/functions/retell-webhook

const crypto = require('crypto');
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';

function verify(rawBody, signature, apiKey) {
    if (!signature || !apiKey) return false;
    try {
        const digest = crypto.createHmac('sha256', apiKey).update(rawBody, 'utf8').digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
    } catch (e) { return false; }
}

function normalizePhone(p) {
    if (!p || typeof p !== 'string') return '';
    return p.replace(/\D/g, '').slice(-10);
}

async function airtableFetch(airtableKey, path, options) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${airtableKey}`,
            'Content-Type': 'application/json',
            ...(options && options.headers)
        }
    });
    return res;
}

// Find the most recent appointment to link this call to.
// Strategy 1: match by caller phone (for real phone calls)
// Strategy 2: find most recently created appointment in last 30 min (for web calls with no phone)
async function findAppointmentToLink(airtableKey, fromNumber) {
    try {
        const res = await airtableFetch(airtableKey, 'Appointments?sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=50');
        if (!res.ok) { console.error('findAppointment: Airtable error', res.status); return null; }
        const data = await res.json();
        let records = (data.records || []).filter(r => r.fields && r.fields.Date);
        records.sort((a, b) => (b.createdTime || '').localeCompare(a.createdTime || ''));

        // Strategy 1: match by phone
        const callerNorm = normalizePhone(fromNumber);
        if (callerNorm) {
            const phoneMatch = records.find(r => {
                const aptNorm = normalizePhone(String(r.fields.Phone || ''));
                return aptNorm === callerNorm;
            });
            if (phoneMatch) {
                console.log('Matched appointment by phone:', phoneMatch.id);
                return phoneMatch.id;
            }
        }

        // Strategy 2: most recently created appointment (within last 30 min)
        // This handles web calls where there's no from_number
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        const recentMatch = records.find(r => {
            const created = new Date(r.createdTime).getTime();
            return created > thirtyMinAgo;
        });
        if (recentMatch) {
            console.log('Matched appointment by recency:', recentMatch.id);
            return recentMatch.id;
        }

        console.log('No appointment match found');
        return null;
    } catch (e) {
        console.error('findAppointmentToLink error:', e);
        return null;
    }
}

async function setAppointmentSource(airtableKey, appointmentId) {
    try {
        const res = await airtableFetch(airtableKey, `Appointments/${appointmentId}`, {
            method: 'PATCH',
            body: JSON.stringify({ fields: { Source: 'Retell' } })
        });
        if (!res.ok) console.error('setAppointmentSource error:', res.status, await res.text());
    } catch (e) { console.error('setAppointmentSource error:', e); }
}

async function saveTranscript(airtableKey, callId, transcriptText, bookingId, fromNumber) {
    if (!airtableKey || !callId) return;

    // Core fields that we KNOW exist in the table
    const coreFields = {
        transcript_id: callId,
        Source: 'Retell',
        full_transcript: transcriptText || '(No transcript)'
    };
    if (bookingId) coreFields.booking_id = bookingId;

    try {
        // Check if record already exists (upsert to avoid duplicates from call_ended + call_analyzed)
        const findRes = await airtableFetch(airtableKey,
            `Transcripts?filterByFormula=${encodeURIComponent(`{transcript_id}='${String(callId).replace(/'/g, "\\'")}'`)}&maxRecords=1`);

        if (findRes.ok) {
            const findData = await findRes.json();
            if (findData.records && findData.records.length > 0) {
                // UPDATE existing
                const patchRes = await airtableFetch(airtableKey, `Transcripts/${findData.records[0].id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ fields: coreFields })
                });
                if (!patchRes.ok) console.error('Transcript update failed:', patchRes.status, await patchRes.text());
                else console.log('Transcript updated:', findData.records[0].id);
                if (bookingId) await setAppointmentSource(airtableKey, bookingId);
                return;
            }
        }

        // CREATE new
        const createRes = await airtableFetch(airtableKey, 'Transcripts', {
            method: 'POST',
            body: JSON.stringify({ records: [{ fields: coreFields }] })
        });
        if (!createRes.ok) {
            console.error('Transcript create failed:', createRes.status, await createRes.text());
        } else {
            const createData = await createRes.json();
            console.log('Transcript created:', createData.records && createData.records[0] && createData.records[0].id);

            // Try to set caller_phone separately (won't break if column is missing)
            if (fromNumber && createData.records && createData.records[0]) {
                try {
                    await airtableFetch(airtableKey, `Transcripts/${createData.records[0].id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ fields: { caller_phone: String(fromNumber) } })
                    });
                } catch (e) { /* caller_phone column might not exist, that's OK */ }
            }
        }
        if (bookingId) await setAppointmentSource(airtableKey, bookingId);
    } catch (e) {
        console.error('saveTranscript error:', e);
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-retell-signature',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    if (event.httpMethod === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: 'Retell webhook endpoint' }) };
    }

    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '' };

    const rawBody = event.body || '';
    const signature = event.headers['x-retell-signature'] || event.headers['X-Retell-Signature'];
    const apiKey = process.env.RETELL_API_KEY;
    const skipVerify = process.env.RETELL_WEBHOOK_SKIP_VERIFY === 'true' || process.env.RETELL_WEBHOOK_SKIP_VERIFY === '1';

    if (!skipVerify && apiKey && signature && !verify(rawBody, signature, apiKey)) {
        console.error('Invalid webhook signature');
        return { statusCode: 401, headers, body: '' };
    }

    let payload;
    try { payload = JSON.parse(rawBody); }
    catch (e) { return { statusCode: 400, headers, body: '' }; }

    const { event: eventType, call } = payload;
    console.log('Retell webhook received:', eventType, call && call.call_id, 'type:', call && call.call_type, 'from:', call && call.from_number);

    if (!call || !call.call_id) return { statusCode: 204, headers, body: '' };

    if (eventType === 'call_ended' || eventType === 'call_analyzed') {
        const transcript = call.transcript || call.transcript_with_tool_calls;
        const transcriptStr = typeof transcript === 'string'
            ? transcript
            : (Array.isArray(transcript)
                ? transcript.map(t => {
                    const role = (t.role || '').replace('agent', 'AI Agent').replace('user', 'Caller');
                    return role + ': ' + (t.content || t.message || t.words || '');
                }).join('\n\n')
                : '');

        console.log('Transcript length:', transcriptStr.length, 'chars');

        const airtableKey = process.env.AIRTABLE_API_KEY;
        if (airtableKey) {
            const bookingId = await findAppointmentToLink(airtableKey, call.from_number || '');
            await saveTranscript(airtableKey, call.call_id, transcriptStr, bookingId, call.from_number);
        } else {
            console.error('No AIRTABLE_API_KEY set');
        }
    }

    return { statusCode: 204, headers, body: '' };
};
