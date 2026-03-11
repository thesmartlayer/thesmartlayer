const BASE_ID = 'appI1VGevInWPeMRa';
const TABLE_NAME = 'Appointments';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
            headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
        });
        
        const data = await response.json();
        
        const cleanRecords = data.records
            .filter(r => r.fields.Date) 
            .map(r => ({
                id: r.id,
                name: r.fields.Name || 'Anonymous',
                date: r.fields.Date.split('-03:00')[0], 
                duration: r.fields.Duration || 30
            }));

        return { statusCode: 200, headers, body: JSON.stringify(cleanRecords) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
