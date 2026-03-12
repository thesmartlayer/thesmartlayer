// netlify/functions/update-appointments.js
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa'; 
const TABLE_NAME = 'Appointments';
const TRANSCRIPTS_TABLE = 'Transcripts';

function normalizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    return phone.replace(/\D/g, '').slice(-10);
}

async function linkRetellTranscriptToAppointment(airtableKey, newAppointmentId, appointmentPhone) {
    const norm = normalizePhone(appointmentPhone);
    if (!norm || !newAppointmentId || !airtableKey) return;
    try {
        const formula = encodeURIComponent("{Source}='Retell'");
        const url = `https://api.airtable.com/v0/${BASE_ID}/${TRANSCRIPTS_TABLE}?filterByFormula=${formula}&maxRecords=30`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${airtableKey}` } });
        if (!res.ok) return;
        const data = await res.json();
        const noBooking = (r) => {
            const b = r.fields && r.fields.booking_id;
            return b === undefined || b === null || b === '' || (Array.isArray(b) && b.length === 0);
        };
        const records = (data.records || []).filter(r => {
            if (!noBooking(r)) return false;
            const cp = (r.fields && r.fields.caller_phone) ? String(r.fields.caller_phone) : '';
            return normalizePhone(cp) === norm;
        });
        if (records.length === 0) return;
        const transcriptId = records[0].id;
        const patchUrl = `https://api.airtable.com/v0/${BASE_ID}/${TRANSCRIPTS_TABLE}/${transcriptId}`;
        await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${airtableKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { booking_id: newAppointmentId } }) // string works for text; use [newAppointmentId] if booking_id is linked record
        });
        const apptUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${newAppointmentId}`;
        await fetch(apptUrl, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${airtableKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { Source: 'Retell' } })
        });
    } catch (e) {
        console.error('linkRetellTranscriptToAppointment error:', e);
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    try {
        const body = JSON.parse(event.body);
        const { action } = body;
        const formattedDate = body.date ? `${body.date}-03:00` : ''; 
        const duration = body.duration || 30; 

        // --- CREATE ACTION ---
        if (action === 'create') {
            const filter = `AND(
                IS_BEFORE({Date}, DATEADD(DATETIME_PARSE('${formattedDate}'), ${duration - 1}, 'minutes')),
                IS_AFTER(DATEADD({Date}, {Duration}, 'minutes'), DATEADD(DATETIME_PARSE('${formattedDate}'), 1, 'minutes'))
            )`;

            const checkUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=${encodeURIComponent(filter)}`;
            const checkResponse = await fetch(checkUrl, {
                headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
            });
            const checkData = await checkResponse.json();

            if (checkData.records && checkData.records.length > 0) {
                return { 
                    statusCode: 409, 
                    headers, 
                    body: JSON.stringify({ error: 'This time slot overlaps with an existing appointment.' }) 
                };
            }

            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    records: [{ 
                        fields: { 
                            Name: body.name || 'Unknown', 
                            Date: formattedDate, 
                            Duration: duration,
                            Phone: body.phone || '',
                            Email: body.email || '',
                            Type: body.type || 'Consultation',
                            Notes: body.notes || '',
                            Source: body.source || 'Manual',
                            Status: 'Scheduled' 
                        } 
                    }] 
                })
            });

            const data = await response.json();
            const newId = data.records[0].id;
            if (body.phone && process.env.AIRTABLE_API_KEY) {
                await linkRetellTranscriptToAppointment(process.env.AIRTABLE_API_KEY, newId, body.phone);
            }
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: newId }) };
        }

        // --- UPDATE ACTION (To move/reschedule) ---
        if (action === 'update') {
            if (!body.id) throw new Error('Missing record ID for update.');

            const fields = {};
            if (body.date) fields.Date = formattedDate;
            if (body.name) fields.Name = body.name;
            if (body.status) fields.Status = body.status;
            if (body.duration) fields.Duration = body.duration;
            if (body.notes !== undefined) fields.Notes = body.notes;

            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ fields })
            });
            
            if (!response.ok) throw new Error('Update failed');
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // --- DELETE ACTION ---
        if (action === 'delete') {
            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
