// netlify/functions/get-clients.js
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';

async function fetchClientStats(apiKey, baseId) {
    if (!baseId) return { appointments: 0, leads: 0, transcripts: 0 };
    try {
        const [apptsRes, leadsRes, transcriptsRes] = await Promise.all([
            fetch(`https://api.airtable.com/v0/${baseId}/Appointments?pageSize=100`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            }),
            fetch(`https://api.airtable.com/v0/${baseId}/Leads?pageSize=100`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            }),
            fetch(`https://api.airtable.com/v0/${baseId}/Transcripts?pageSize=100`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            })
        ]);
        const apptsData = apptsRes.ok ? await apptsRes.json() : { records: [] };
        const leadsData = leadsRes.ok ? await leadsRes.json() : { records: [] };
        const transcriptsData = transcriptsRes.ok ? await transcriptsRes.json() : { records: [] };
        return {
            appointments: (apptsData.records || []).length,
            leads: (leadsData.records || []).length,
            transcripts: (transcriptsData.records || []).length
        };
    } catch (e) {
        console.error('fetchClientStats error for base', baseId, e);
        return { appointments: 0, leads: 0, transcripts: 0 };
    }
}

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
        const clientsRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Clients?pageSize=100`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!clientsRes.ok) {
            const err = await clientsRes.text();
            console.error('Clients fetch error:', clientsRes.status, err);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch clients' }) };
        }

        const clientsData = await clientsRes.json();
        const records = clientsData.records || [];

        const clients = await Promise.all(records.map(async (r) => {
            const f = r.fields;
            const clientBaseId = f.Base_ID || '';
            const stats = await fetchClientStats(apiKey, clientBaseId);
            return {
                id: r.id,
                name: f.Name || '',
                url: f.URL || '',
                industry: f.Industry || '',
                plan: f.Plan || '',
                status: f.Status || '',
                contact: f.Contact || '',
                email: f.Email || '',
                phone: f.Phone || '',
                notes: f.Notes || '',
                base_id: clientBaseId,
                Website_Live: !!f.Website_Live,
                Chatbot_Active: !!f.Chatbot_Active,
                Phone_Agent_Active: !!f.Phone_Agent_Active,
                AI_Visibility_Active: !!f.AI_Visibility_Active,
                Social_Media_Active: !!f.Social_Media_Active,
                Review_Mgmt_Active: !!f.Review_Mgmt_Active,
                Portal_Active: !!f.Portal_Active,
                created: r.createdTime,
                stats
            };
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ clients })
        };
    } catch (error) {
        console.error('get-clients error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
