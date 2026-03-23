const twilio = require('twilio');
const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    // Retell sends args inside body.args for custom functions
    const args = body.args || body;
    const summary = args.customer_message || 'No message provided';
    const callerName = args.name || body.name || 'Unknown caller';
    const callerPhone = args.phone_number || body.phone_number || 'No phone';
    const callerEmail = args.email || body.email || 'No email';

    const alertPhone = process.env.ALERT_PHONE || process.env.TWILIO_TO_NUMBER;
    const alertEmail = process.env.ALERT_EMAIL || 'john@thesmartlayer.com';

    const message = `📞 Smart Layer Relay\nFrom: ${callerName}\nPhone: ${callerPhone}\nEmail: ${callerEmail}\n\n${summary}`;

    // Send SMS via Twilio
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    if (alertPhone) {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER,
        to: alertPhone
      });
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL || 'alerts@thesmartlayer.com',
      to: alertEmail,
      subject: `Relay Message from ${callerName}`,
      text: message
    });

    // Log to Airtable Leads (non-blocking)
    try {
      const baseId = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
      await fetch(`https://api.airtable.com/v0/${baseId}/Leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              Name: callerName,
              Phone: callerPhone,
              Email: callerEmail !== 'No email' ? callerEmail : '',
              Source: 'Retell-Relay',
              Status: 'New',
              Notes: summary
            }
          }]
        })
      });
    } catch (airtableErr) {
      console.error('Airtable log failed (non-critical):', airtableErr);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Relay sent to John' })
    };
  } catch (err) {
    console.error('Relay message error:', err);
    return {
      statusCode: 200, // Return 200 so Retell doesn't retry
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Message noted, John will follow up' })
    };
  }
};
