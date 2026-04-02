const twilio = require('twilio');
const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { url, rival, service, contact, smsConsent, name, source } = JSON.parse(event.body || '{}');

    // Determine if contact is email or phone
    const isEmail = contact && contact.includes('@');
    const contactEmail = isEmail ? contact : '';
    const contactPhone = !isEmail ? contact : '';
    const displayName = name || 'Audit Request';

    const alertPhone = process.env.ALERT_PHONE;
    const alertEmail = process.env.ALERT_EMAIL || 'john@thesmartlayer.com';

    const notes = `Website: ${url}\nCompetitor: ${rival}\nCore Service: ${service}\nSMS Consent: ${smsConsent ? 'Yes' : 'No'}`;

    const message = `📋 New Audit Request\nName: ${displayName}\nContact: ${contact}\nWebsite: ${url}\nCompetitor: ${rival}\nService: ${service}\nSMS Consent: ${smsConsent ? 'Yes' : 'No'}`;

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
      subject: 'New AI Visibility Audit Request',
      text: message
    });

    // Log to Airtable Leads (non-blocking)
    try {
      const baseId = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
      const airtableRes = await fetch(`https://api.airtable.com/v0/${baseId}/Leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              Name: displayName,
              Phone: contactPhone,
              Email: contactEmail,
              Source: source || 'Audit Form',
              Status: 'New',
              Notes: notes
            }
          }]
        })
      });
      if (!airtableRes.ok) {
        const errText = await airtableRes.text();
        console.error('Airtable lead write failed:', airtableRes.status, errText);
      }
    } catch (airtableErr) {
      console.error('Airtable log failed (non-critical):', airtableErr);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Submit audit error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
