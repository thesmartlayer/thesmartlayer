// netlify/functions/get-leads.js
exports.handler = async (event) => {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID || "appI1VGevInWPeMRa";
  const TABLE = "Leads";
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}?sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=desc`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );
    const data = await response.json();
    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.error.message }),
      };
    }
    const leads = data.records.map((r) => ({
      id: r.id,
      name: r.fields.Name || "",
      business: r.fields.Business_Name || "",
      phone: r.fields.Phone || "",
      email: r.fields.Email || "",
      source: r.fields.Source || "",
      status: r.fields.Status || "",
      notes: r.fields.Notes || "",
      created: r.createdTime,
    }));
    return {
      statusCode: 200,
      body: JSON.stringify({ leads }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
