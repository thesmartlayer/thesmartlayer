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
        const formattedDate = body.date ? `${body.date}-03:00` : ''; 
        const duration = body.duration || 30; 

        if (action === 'create') {
            // Buffer logic: subtract/add 1 min so back-to-back (10:00-10:30 and 10:30-11:00) is allowed
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
                            Status: 'Scheduled' 
                        } 
                    }] 
                })
            });

            if (!response.ok) throw new Error('Airtable creation failed');
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

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
