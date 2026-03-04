// netlify/functions/get-appointments.js
// Reads Appointments table from Airtable for CEO dashboard calendar

const BASE_ID = 'appoi3JJ82TuvnXwl';
const TABLE_NAME = 'Appointments';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=asc`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Airtable error: ${response.status}`);
        }

        const data = await response.json();

        const appointments = data.records.map(record => ({
            id: record.id,
            name: record.fields.Name || '',
            date: record.fields.Date || '',
            phone: record.fields.Phone || '',
            email: record.fields.Email || '',
            duration: record.fields.Duration || 30,
            type: record.fields.Type || 'Consultation',
            status: record.fields.Status || 'Scheduled',
            source: record.fields.Source || '',
            notes: record.fields.Notes || '',
            created: record.createdTime
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ appointments })
        };

    } catch (error) {
        console.error('Error fetching appointments:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch appointments' })
        };
    }
};
