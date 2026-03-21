// netlify/functions/update-config.js
// Saves notification preferences to Config table

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
const TABLE = 'Config';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '' };

    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };

    try {
        const body = JSON.parse(event.body || '{}');
        const alertPhone = body.alert_phone !== undefined ? String(body.alert_phone || '').trim() : undefined;
        const alertEmail = body.alert_email !== undefined ? String(body.alert_email || '').trim() : undefined;

        // Check if a config record already exists
        const listRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}?maxRecords=1`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!listRes.ok) {
            const err = await listRes.text();
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch config' }) };
        }

        const listData = await listRes.json();
        const existing = (listData.records || [])[0];

        const fields = {};
        if (alertPhone !== undefined) fields.AlertPhone = alertPhone;
        if (alertEmail !== undefined) fields.AlertEmail = alertEmail;

        if (Object.keys(fields).length === 0) {
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        if (existing) {
            // Update existing record
            const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}/${existing.id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            if (!patchRes.ok) {
                const err = await patchRes.text();
                return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
            }
        } else {
            // Create new record
            const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: [{ fields }] })
            });
            if (!createRes.ok) {
                const err = await createRes.text();
                return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
            }
        }

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
