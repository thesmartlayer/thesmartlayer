// netlify/functions/update-appointments.js
// Handles create, update (drag/drop), and delete for Appointments table

const BASE_ID = 'appoi3JJ82TuvnXwl';
const TABLE_NAME = 'Appointments';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        const { action } = body;

        // DELETE an appointment
        if (action === 'delete') {
            const response = await fetch(
                `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // CREATE a new appointment
        if (action === 'create') {
            const fields = {
                Name: body.name || '',
                Date: body.date || '',
                Phone: body.phone || '',
                Email: body.email || '',
                Duration: body.duration || 30,
                Type: body.type || 'Consultation',
                Status: 'Scheduled',
                Source: body.source || 'Manual',
                Notes: body.notes || ''
            };

            const response = await fetch(
                `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ records: [{ fields }] })
                }
            );
            if (!response.ok) throw new Error(`Create failed: ${response.status}`);
            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, id: data.records[0].id })
            };
        }

        // UPDATE an existing appointment (drag/drop, edit)
        if (action === 'update') {
            const fields = {};
            if (body.date) fields.Date = body.date;
            if (body.name) fields.Name = body.name;
            if (body.duration) fields.Duration = body.duration;
            if (body.type) fields.Type = body.type;
            if (body.status) fields.Status = body.status;
            if (body.notes !== undefined) fields.Notes = body.notes;

            const response = await fetch(
                `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
            if (!response.ok) throw new Error(`Update failed: ${response.status}`);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action. Use: create, update, delete' })
        };

    } catch (error) {
        console.error('Error updating appointment:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
