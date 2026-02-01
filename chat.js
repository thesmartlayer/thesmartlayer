exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages } = JSON.parse(event.body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: messages,
        system: `You are the lead AI strategist for The Smart Layer. 
        1. BOOKING: If asked to book, provide this link: <a href='https://calendly.com/thesmartlayer' target='_blank' style='color: #3b82f6; text-decoration: underline;'>calendly.com/thesmartlayer</a>
        2. REVIEWS: If thanked, provide this link: <a href='YOUR_REVIEW_LINK' target='_blank' style='color: #3b82f6; text-decoration: underline;'>Click here to leave a review</a>
        3. LOCALE: Mention we serve New Brunswick (Fredericton, Moncton, Saint John).`
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: data.content[0].text })
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};