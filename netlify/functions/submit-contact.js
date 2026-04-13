const twilio = require('twilio');
const { Resend } = require('resend');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const smsConsent = !!body.smsConsent;
    const name = body.name || 'Website contact';
    const business = body.business || '';
    const phone = body.phone || '';
    const email = body.email || '';
    const industry = body.industry || '';
    const messageText = body.message || '';
    const consentStamp = new Date().toISOString();

    const alertPhone = process.env.ALERT_PHONE;
    const alertEmail = process.env.ALERT_EMAIL || 'john@thesmartlayer.com';

    const notes = [
      `Business: ${business}`,
      `Industry: ${industry}`,
      `Message: ${messageText || '(none)'}`,
      `SMS Consent: ${smsConsent ? 'Yes' : 'No'}`,
      `SMS Consent Timestamp: ${consentStamp}`
    ].join('\n');

    const internalMessage = `📩 New Contact Request\nName: ${name}\nBusiness: ${business}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}\nIndustry: ${industry || 'N/A'}\nSMS Consent: ${smsConsent ? 'Yes' : 'No'}\n\n${messageText || ''}`;

    // Internal owner SMS alert.
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    if (alertPhone) {
      await twilioClient.messages.create({
        body: internalMessage,
        from: process.env.TWILIO_FROM_NUMBER,
        to: alertPhone
      });
    }

    // Internal owner email alert.
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL || 'alerts@thesmartlayer.com',
      to: alertEmail,
      subject: 'New Website Contact Request',
      text: internalMessage
    });

    // Airtable lead log (best effort).
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
              Name: name,
              Phone: phone,
              Email: email,
              Source: 'Website',
              Status: 'New',
              Notes: notes
            }
          }]
        })
      });
      if (!airtableRes.ok) {
        const errText = await airtableRes.text();
        console.error('Airtable contact lead write failed:', airtableRes.status, errText);
      }
    } catch (airtableErr) {
      console.error('Airtable contact lead log failed (non-critical):', airtableErr);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Submit contact error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
