// netlify/functions/update-appointments.js
// Handles create, update, and delete for Appointments table with conflict checking

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

        // Ensure Date is in a format Airtable likes (ISO 8601)
        let formattedDate = body.date;
        if (formattedDate && !formattedDate.includes('Z') && !formattedDate.includes('+')) {
            formattedDate = `${formattedDate}Z`;
        }

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
            // 1. CONFLICT CHECK: See if someone is already booked at this exact time
            const checkUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=IS_SAME({Date}, '${formattedDate}')`;
            const checkResponse = await fetch(checkUrl, {
                headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
            });
            const checkData = await checkResponse.json();

            // 2. REJECT if slot is taken
            if (checkData.records && checkData.records.length > 0) {
                console.log(`Conflict detected for: ${formattedDate}`);
                return {
                    statusCode: 409, // Conflict
                    headers,
                    body: JSON.stringify({ error: 'That time slot is already taken.' })
                };
            }

            // 3. PROCEED if slot is clear
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

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Airtable Error:', errorData);
                throw new Error(`Create failed: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, id: data.records[0].id })
            };
        }

        // UPDATE ACTION (For dragging/dropping or editing existing ones)
        if (action === 'update') {
            const fields = {};
            if (body.date) fields.Date = formattedDate;
            if (body.name) fields.Name = body.name;
            if (body.duration) fields.Duration = body.duration;
            if (body.type) fields.Type = body.type;
            if (body.status) fields.Status = body.status;
            if (body.notes !== undefined) fields.Notes = body.notes;

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
        console.error('Function Error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
