// netlify/functions/retell-webhook.js
// Receives Retell webhooks, saves transcript to Airtable Transcripts table,
// links to most recent appointment, and sets Source to "Retell".
//
// Webhook URL: https://thesmartlayer.com/.netlify/functions/retell-webhook

const { Retell } = require('retell-sdk');
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';

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

    const coreFields = {
        transcript_id: callId,
        Source: 'Retell',
        full_transcript: transcriptText || '(No transcript)'
    };
    // booking_id may be a text field or linked-record field depending on base schema.
    // If it looks like an Airtable record id, prefer linked-record shape.
    if (bookingId) coreFields.booking_id = /^rec[a-zA-Z0-9]+$/.test(String(bookingId)) ? [bookingId] : bookingId;
    if (fromNumber) coreFields.caller_phone = String(fromNumber);

    try {
        // Check if record already exists (upsert to avoid duplicates from call_ended + call_analyzed)
        const findRes = await airtableFetch(airtableKey,
            `Transcripts?filterByFormula=${encodeURIComponent(`{transcript_id}='${String(callId).replace(/'/g, "\\'")}'`)}&maxRecords=1`);

        if (findRes.ok) {
            const findData = await findRes.json();
            if (findData.records && findData.records.length > 0) {
                // UPDATE existing
                let patchRes = await airtableFetch(airtableKey, `Transcripts/${findData.records[0].id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ fields: coreFields })
                });
                if (!patchRes.ok) {
                    const errText = await patchRes.text();
                    console.error('Transcript update failed:', patchRes.status, errText);
                    // Fallback: retry without booking_id if field-type mismatch broke PATCH.
                    if (bookingId) {
                        const fallbackFields = { ...coreFields };
                        delete fallbackFields.booking_id;
                        patchRes = await airtableFetch(airtableKey, `Transcripts/${findData.records[0].id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ fields: fallbackFields })
                        });
                        if (!patchRes.ok) console.error('Transcript update fallback failed:', patchRes.status, await patchRes.text());
                        else console.log('Transcript updated (fallback, no booking_id):', findData.records[0].id);
                    }
                } else {
                    console.log('Transcript updated:', findData.records[0].id);
                }
                if (bookingId) await setAppointmentSource(airtableKey, bookingId);
                return;
            }
        }

        // CREATE new
        let createRes = await airtableFetch(airtableKey, 'Transcripts', {
            method: 'POST',
            body: JSON.stringify({ records: [{ fields: coreFields }] })
        });
        if (!createRes.ok) {
            const errText = await createRes.text();
            console.error('Transcript create failed:', createRes.status, errText);
            // Fallback: retry without booking_id if schema mismatch on booking field.
            if (bookingId) {
                const fallbackFields = { ...coreFields };
                delete fallbackFields.booking_id;
                createRes = await airtableFetch(airtableKey, 'Transcripts', {
                    method: 'POST',
                    body: JSON.stringify({ records: [{ fields: fallbackFields }] })
                });
                if (!createRes.ok) {
                    console.error('Transcript create fallback failed:', createRes.status, await createRes.text());
                } else {
                    const createData = await createRes.json();
                    console.log('Transcript created (fallback, no booking_id):', createData.records && createData.records[0] && createData.records[0].id);
                }
            }
        } else {
            const createData = await createRes.json();
            console.log('Transcript created:', createData.records && createData.records[0] && createData.records[0].id);
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

    let payload;
    try { payload = JSON.parse(rawBody); }
    catch (e) { return { statusCode: 400, headers, body: '' }; }

    if (!apiKey) {
        console.error('Missing RETELL_API_KEY for webhook verification');
        return { statusCode: 500, headers, body: '' };
    }
    if (!signature) {
        console.error('Missing x-retell-signature header');
        return { statusCode: 401, headers, body: '' };
    }
    try {
        const valid = await Retell.verify(JSON.stringify(payload), apiKey, signature);
        if (!valid) {
            console.error('Invalid webhook signature (Retell SDK verify)');
            return { statusCode: 401, headers, body: '' };
        }
    } catch (e) {
        console.error('Signature verification error:', e.message);
        return { statusCode: 401, headers, body: '' };
    }

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
