// netlify/functions/get-transcripts.js
// Fetches chat transcripts from Airtable, optionally filtered by booking_id

const AIRTABLE_BASE_ID = 'appI1VGevInWPeMRa';
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
        
        let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}?sort%5B0%5D%5Bfield%5D=created_at&sort%5B0%5D%5Bdirection%5D=desc&pageSize=20`;
        
        if (bookingId) {
            const filter = `{booking_id}='${bookingId}'`;
            url += `&filterByFormula=${encodeURIComponent(filter)}`;
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
            booking_id: r.fields.booking_id || '',
            source: r.fields.source || '',
            full_transcript: r.fields.full_transcript || '',
            summary: r.fields.summary || '',
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
