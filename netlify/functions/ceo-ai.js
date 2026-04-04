// netlify/functions/ceo-ai.js
// CEO AI Command Bar — answers questions about dashboard data using Claude Haiku 4.5

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return { statusCode: 200, headers, body: JSON.stringify({ reply: 'AI not configured — missing API key.' }) };
  }

  try {
    const { question, data } = JSON.parse(event.body || '{}');
    if (!question) {
      return { statusCode: 200, headers, body: JSON.stringify({ reply: 'No question provided.' }) };
    }

    const now = new Date().toLocaleString('en-US', { timeZone: 'America/Moncton', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    const systemPrompt = `You are John's CEO AI assistant for The Smart Layer. You answer questions about his business data — leads, appointments, transcripts, and clients.

Current date and time: ${now} (Atlantic Time)

RULES:
- Be concise. 2-3 sentences max unless asked for detail.
- Never use markdown, bullet points, or formatting — plain text only (this displays in a terminal-style interface).
- If the data doesn't contain the answer, say so honestly.
- When summarizing transcripts, keep it brief — key points only.
- When counting or filtering, be precise with numbers.
- You are talking to John, the CEO. Be direct and useful.`;

    const dataContext = `Here is John's current business data:

LEADS (${(data.leads || []).length} total):
${JSON.stringify(data.leads || [], null, 0)}

APPOINTMENTS (${(data.appointments || []).length} total):
${JSON.stringify(data.appointments || [], null, 0)}

TRANSCRIPTS (${(data.transcripts || []).length} total):
${JSON.stringify(data.transcripts || [], null, 0)}

CLIENTS (${(data.clients || []).length} total):
${JSON.stringify(data.clients || [], null, 0)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          { role: 'user', content: dataContext + '\n\nQuestion: ' + question }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', response.status, err);
      return { statusCode: 200, headers, body: JSON.stringify({ reply: 'AI is temporarily unavailable. Try again in a moment.' }) };
    }

    const result = await response.json();
    const reply = result.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || 'No response generated.';

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (err) {
    console.error('CEO AI error:', err);
    return { statusCode: 200, headers, body: JSON.stringify({ reply: 'Something went wrong. Try again.' }) };
  }
};
