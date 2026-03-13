// netlify/functions/update-clients.js
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
const TABLE = 'Clients';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '' };

    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };

    try {
        const body = JSON.parse(event.body);
        const { action } = body;

        if (action === 'create') {
            const fields = {};
            if (body.name) fields.Name = body.name;
            if (body.url) fields.URL = body.url;
            if (body.industry) fields.Industry = body.industry;
            if (body.plan) fields.Plan = body.plan;
            if (body.status) fields.Status = body.status;
            if (body.contact) fields.Contact = body.contact;
            if (body.email) fields.Email = body.email;
            if (body.phone) fields.Phone = body.phone;
            if (body.notes !== undefined) fields.Notes = body.notes || '';
            if (body.base_id !== undefined) fields.Base_ID = body.base_id || '';
            const svcFields = ['Website_Live','Chatbot_Active','Phone_Agent_Active','AI_Visibility_Active','Social_Media_Active','Review_Mgmt_Active','Portal_Active'];
            svcFields.forEach(k => { if (body[k] !== undefined || body[k.toLowerCase()] !== undefined) fields[k] = !!(body[k] !== undefined ? body[k] : body[k.toLowerCase()]); });

            const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: [{ fields }] })
            });

            if (!res.ok) {
                const err = await res.text();
                return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
            }
            const data = await res.json();
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.records[0].id }) };
        }

        if (action === 'update') {
            if (!body.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
            const fields = {};
            if (body.name !== undefined) fields.Name = body.name;
            if (body.url !== undefined) fields.URL = body.url;
            if (body.industry !== undefined) fields.Industry = body.industry;
            if (body.plan !== undefined) fields.Plan = body.plan;
            if (body.status !== undefined) fields.Status = body.status;
            if (body.contact !== undefined) fields.Contact = body.contact;
            if (body.email !== undefined) fields.Email = body.email;
            if (body.phone !== undefined) fields.Phone = body.phone;
            if (body.notes !== undefined) fields.Notes = body.notes;
            if (body.base_id !== undefined) fields.Base_ID = body.base_id;
            const svcFields = ['Website_Live','Chatbot_Active','Phone_Agent_Active','AI_Visibility_Active','Social_Media_Active','Review_Mgmt_Active','Portal_Active'];
            svcFields.forEach(k => { if (body[k] !== undefined || body[k.toLowerCase()] !== undefined) fields[k] = !!(body[k] !== undefined ? body[k] : body[k.toLowerCase()]); });

            const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}/${body.id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });

            if (!res.ok) {
                const err = await res.text();
                return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
            }
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        if (action === 'delete') {
            if (!body.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
            const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}/${body.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) {
                const err = await res.text();
                return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
            }
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
