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

function validateAppointmentTime(dateStr) {
    if (!dateStr) return 'No date provided.';

    // Strip offset for parsing, then rebuild as Atlantic Time
    const clean = dateStr.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
    const parts = clean.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!parts) return 'Invalid date format.';

    const year = parseInt(parts[1]);
    const month = parseInt(parts[2]);
    const day = parseInt(parts[3]);
    const hour = parseInt(parts[4]);
    const minute = parseInt(parts[5]);

    // Determine Atlantic offset (DST: second Sunday March to first Sunday November)
    const marchFirst = new Date(year, 2, 1);
    const dstStartDay = 8 + (7 - marchFirst.getDay()) % 7;
    const novFirst = new Date(year, 10, 1);
    const dstEndDay = 1 + (7 - novFirst.getDay()) % 7;
    const dateNum = month * 100 + day;
    const isDST = dateNum > (3 * 100 + dstStartDay) && dateNum < (11 * 100 + dstEndDay);
    const offsetHours = isDST ? -3 : -4;

    // Build a UTC date from the local Atlantic time to compare with now
    const appointmentUTC = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
    if (appointmentUTC <= new Date()) {
        return 'Cannot book appointments in the past.';
    }

    // Check day of week (0=Sun, 1=Mon, ... 6=Sat)
    const localDate = new Date(year, month - 1, day);
    const dow = localDate.getDay();
    const timeDecimal = hour + minute / 60;

    // Sunday — closed
    if (dow === 0) return 'Sunday is not available for appointments.';

    // Saturday: 10am-2pm (last slot 1:30, so end by 2pm)
    if (dow === 6) {
        if (timeDecimal < 10 || timeDecimal >= 14) {
            return 'Saturday appointments are only available between 10:00 AM and 2:00 PM Atlantic.';
        }
        return null;
    }

    // Wednesday: 9am-6pm (last slot 5:30, so end by 6pm)
    if (dow === 3) {
        if (timeDecimal < 9 || timeDecimal >= 18) {
            return 'Wednesday appointments are only available between 9:00 AM and 6:00 PM Atlantic.';
        }
        return null;
    }

    // Mon, Tue, Thu, Fri: 9am-1pm (last slot 12:30, so end by 1pm)
    if (timeDecimal < 9 || timeDecimal >= 13) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${dayNames[dow]} appointments are only available between 9:00 AM and 1:00 PM Atlantic.`;
    }

    return null;
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
            // Server-side validation: reject past dates and out-of-hours bookings
            const validationError = validateAppointmentTime(body.date);
            if (validationError) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: validationError })
                };
            }

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
            // Send SMS + email notification (fire-and-forget)
            try {
                const baseUrl = process.env.URL || 'https://thesmartlayer.com';
                fetch(`${baseUrl}/.netlify/functions/send-appointment-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: body.name || 'Unknown',
                        date: formattedDate,
                        type: body.type || 'Consultation',
                        source: body.source || 'Manual'
                    })
                }).catch(e => console.error('Notification error:', e));
            } catch (e) { console.error('Notification trigger error:', e); }
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
