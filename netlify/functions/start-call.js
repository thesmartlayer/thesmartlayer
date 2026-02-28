// netlify/functions/start-call.js
exports.handler = async (event) => {
  const response = await fetch("https://api.retellai.com/v2/create-web-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.RETELL_API_KEY}`, // Safely pulls from Netlify vault
    },
    body: JSON.stringify({
      agent_id: "agent_8f46294464def2baed3167671d", // Paste your Agent ID here
    }),
  });

  const data = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ accessToken: data.access_token }),
  };

};
