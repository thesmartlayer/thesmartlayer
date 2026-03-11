// netlify/functions/update-appointments.js
const BASE_ID = 'appI1VGevInWPeMRa'; 
const TABLE_NAME = 'Appointments';

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

        // FIXED: Forces Moncton timezone offset (-03:00) instead of UTC (Z)
        let formattedDate = body.date ? `${body.date}-03:00` : '';

        // DELETE ACTION
        if (action === 'delete') {
            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
            });
            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // CREATE ACTION
        if (action === 'create') {
            // 1. CONFLICT CHECK
            const checkUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=IS_SAME({Date}, '${formattedDate}')`;
            const checkResponse = await fetch(checkUrl, {
                headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
            });
            const checkData = await checkResponse.json();

            // 2. REJECT if slot is taken
            if (checkData.records && checkData.records.length > 0) {
                return {
                    statusCode: 409, 
                    headers,
                    body: JSON.stringify({ error: 'That time slot is already taken.' })
                };
            }

            // 3. PROCEED with booking
            const fields = {
                Name: body.name || '',
                Date: formattedDate || '',
                Phone: body.phone || '',
                Email: body.email || '',
                Duration: body.duration || 30,
                Type: body.type || 'Consultation',
                Status: 'Scheduled',
                Source: body.source || 'Manual',
                Notes: body.notes || ''
            };

            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ records: [{ fields }] })
            });

            if (!response.ok) throw new Error(`Create failed: ${response.status}`);
            
            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, id: data.records[0].id })
            };
        }

        // UPDATE ACTION
        if (action === 'update') {
            const fields = {};
            if (body.date) fields.Date = formattedDate;
            if (body.name) fields.Name = body.name;
            if (body.status) fields.Status = body.status;

            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ fields })
            });
            if (!response.ok) throw new Error(`Update failed: ${response.status}`);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action.' }) };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
