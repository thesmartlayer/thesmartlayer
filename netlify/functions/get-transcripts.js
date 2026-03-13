// netlify/functions/get-transcripts.js
// Fetches chat transcripts from Airtable, optionally filtered by booking_id

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
const AIRTABLE_TABLE = 'Transcripts';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };
    }

    try {
        const bookingId = event.queryStringParameters && event.queryStringParameters.booking_id;
        const phone = event.queryStringParameters && event.queryStringParameters.phone;

        let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}?sort%5B0%5D%5Bfield%5D=created_at&sort%5B0%5D%5Bdirection%5D=desc&pageSize=50`;

        if (bookingId) {
            const safeId = String(bookingId).replace(/'/g, "\\'");
            const filter = `OR({booking_id}='${safeId}', FIND('${safeId}', ARRAYJOIN({booking_id}, ','))>0)`;
            url += `&filterByFormula=${encodeURIComponent(filter)}`;
        } else if (phone) {
            const digits = String(phone).replace(/\D/g, '').slice(-10);
            if (digits.length >= 7) {
                const filter = `FIND('${digits}', SUBSTITUTE({caller_phone}, '-', ''))>0`;
                url += `&filterByFormula=${encodeURIComponent(filter)}`;
            }
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Airtable error:', err);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch transcripts' }) };
        }

        const data = await response.json();
        const transcripts = (data.records || []).map(r => ({
            id: r.id,
            transcript_id: r.fields.transcript_id || '',
            booking_id: Array.isArray(r.fields.booking_id) ? (r.fields.booking_id[0] || '') : (r.fields.booking_id || ''),
            source: r.fields.Source || r.fields.source || '',
            full_transcript: r.fields.full_transcript || '',
            summary: r.fields.summary || '',
            caller_phone: r.fields.caller_phone || '',
            created_at: r.fields.created_at || ''
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ transcripts })
        };
    } catch (error) {
        console.error('Get transcripts error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
    }
};
