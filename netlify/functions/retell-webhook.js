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
    return phone.replace(/\D/g, '').slice(-10); // last 10 digits
}

async function findAppointmentByPhone(airtableKey, fromNumber) {
    const normalized = normalizePhone(fromNumber);
    if (!normalized) return null;
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Appointments?sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=30`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${airtableKey}` } });
        if (!res.ok) return null;
        const data = await res.json();
        const records = (data.records || []).filter(r => r.fields && r.fields.Date);
        const match = records.find(r => normalizePhone((r.fields.Phone || '').toString()) === normalized);
        return match ? match.id : null;
    } catch (e) {
        console.error('findAppointmentByPhone error:', e);
        return null;
    }
}

async function saveRetellTranscript(airtableKey, callId, transcript, bookingId) {
    if (!airtableKey || !callId) return;
    const transcriptText = typeof transcript === 'string' ? transcript : (transcript || '');
    const fields = {
        transcript_id: callId,
        Source: 'Retell',
        full_transcript: transcriptText || '(No transcript)'
    };
    if (bookingId) fields.booking_id = bookingId;

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${airtableKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: [{ fields }] })
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('Retell transcript save error:', res.status, err);
        }
    } catch (e) {
        console.error('Retell transcript save error:', e);
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-retell-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: '' };
    }

    const rawBody = event.body || '';
    const signature = event.headers['x-retell-signature'] || event.headers['X-Retell-Signature'];
    const apiKey = process.env.RETELL_API_KEY;

    if (apiKey && signature && !verifyRetellSignature(rawBody, signature, apiKey)) {
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
            await saveRetellTranscript(airtableKey, call.call_id, transcriptStr, bookingId);
        }
    }

    return { statusCode: 204, headers, body: '' };
};
