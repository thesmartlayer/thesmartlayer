// netlify/functions/get-config.js
// Reads notification preferences from Config table

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
const TABLE = 'Config';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };

    try {
        const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}?maxRecords=1`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Config fetch error:', res.status, err);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch config' }) };
        }

        const data = await res.json();
        const record = (data.records || [])[0];
        const fields = record && record.fields ? record.fields : {};

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                alert_phone: fields.AlertPhone || '',
                alert_email: fields.AlertEmail || '',
                id: record ? record.id : null
            })
        };
    } catch (error) {
        console.error('get-config error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
