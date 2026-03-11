const BASE_ID = 'appI1VGevInWPeMRa';
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
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
            headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
        });

        const data = await response.json();

        // Normalize Airtable records into the shape expected by the dashboards
        const appointments = (data.records || [])
            .filter((r) => r.fields && r.fields.Date)
            .map((r) => {
                const f = r.fields;
                // Strip any timezone offset (e.g. -03:00, -04:00) so frontend can handle it
                const rawDate = typeof f.Date === 'string'
                    ? f.Date.replace(/[+-]\d{2}:\d{2}$/, '')
                    : f.Date;

                return {
                    id: r.id,
                    name: f.Name || 'Anonymous',
                    date: rawDate,
                    duration: f.Duration || 30,
                    phone: f.Phone || '',
                    email: f.Email || '',
                    type: f.Type || 'Consultation',
                    notes: f.Notes || '',
                    source: f.Source || '',
                    status: f.Status || 'Scheduled',
                    created: r.createdTime
                };
            });

        // Dashboards expect: { appointments: [...] }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ appointments })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
