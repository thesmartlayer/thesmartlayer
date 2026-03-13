// netlify/functions/get-client-analytics.js
// Fetches detailed per-client stats from a client's Airtable base

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };

    const baseId = event.queryStringParameters && event.queryStringParameters.base_id;
    if (!baseId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing base_id' }) };

    async function fetchTable(table) {
        try {
            const res = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?pageSize=100`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data.records || [];
        } catch (e) {
            console.error(`Failed to fetch ${table}:`, e);
            return [];
        }
    }

    try {
        const [appointments, leads, transcripts] = await Promise.all([
            fetchTable('Appointments'),
            fetchTable('Leads'),
            fetchTable('Transcripts')
        ]);

        const sourceCount = { Manual: 0, Chatbot: 0, Retell: 0, Other: 0 };
        const typeCount = { Consultation: 0, Demo: 0, Onboarding: 0, 'Follow-up': 0, Other: 0 };
        appointments.forEach(r => {
            const src = (r.fields && r.fields.Source || '').toLowerCase();
            if (src.includes('chat') || src.includes('bot')) sourceCount.Chatbot++;
            else if (src.includes('retell') || src.includes('phone')) sourceCount.Retell++;
            else if (src === 'manual' || src === '') sourceCount.Manual++;
            else sourceCount.Other++;

            const typ = r.fields && r.fields.Type || '';
            if (typeCount[typ] !== undefined) typeCount[typ]++;
            else typeCount.Other++;
        });

        const leadStatus = { New: 0, Contacted: 0, Closed: 0, Other: 0 };
        leads.forEach(r => {
            const s = r.fields && r.fields.Status || 'New';
            if (leadStatus[s] !== undefined) leadStatus[s]++;
            else leadStatus.Other++;
        });

        const chatbotConversations = transcripts.filter(r => {
            const src = (r.fields && (r.fields.Source || r.fields.source) || '').toLowerCase();
            return src.includes('chat') || src.includes('bot');
        }).length;

        const retellCalls = transcripts.filter(r => {
            const src = (r.fields && (r.fields.Source || r.fields.source) || '').toLowerCase();
            return src.includes('retell') || src.includes('phone');
        }).length;

        const totalAppts = appointments.length;
        const totalLeads = leads.length;
        const conversionRate = totalLeads > 0 ? Math.round((totalAppts / totalLeads) * 100) : 0;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentAppts = appointments.filter(r => {
            const d = r.fields && r.fields.Date;
            return d && new Date(d) >= thirtyDaysAgo;
        }).length;
        const recentLeads = leads.filter(r => {
            const d = r.createdTime;
            return d && new Date(d) >= thirtyDaysAgo;
        }).length;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                totals: {
                    appointments: totalAppts,
                    leads: totalLeads,
                    chatbotConversations,
                    retellCalls,
                    transcripts: transcripts.length,
                    conversionRate
                },
                recent30d: {
                    appointments: recentAppts,
                    leads: recentLeads
                },
                sourceBreakdown: sourceCount,
                typeBreakdown: typeCount,
                leadStatus
            })
        };
    } catch (error) {
        console.error('get-client-analytics error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
