// netlify/functions/update-appointments.js
const BASE_ID = 'appI1VGevInWPeMRa'; // Confirm this matches your Smart Layer Base ID!
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

        // Validation for the 'date' field to ensure Airtable likes it
        let formattedDate = body.date;
        if (formattedDate && !formattedDate.includes('Z') && !formattedDate.includes('+')) {
            // If the AI sends 2026-03-11T11:00:00, we add a 'Z' to make it a valid ISO string
            formattedDate = `${formattedDate}Z`;
        }

        if (action === 'delete') {
            const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${body.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
            });
            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        if (action === 'create') {
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
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.records[0].id }) };
        }

        // ... (Keep the rest of your update logic the same, just use formattedDate for fields.Date)

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action.' }) };

    } catch (error) {
        console.error('Function Error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
