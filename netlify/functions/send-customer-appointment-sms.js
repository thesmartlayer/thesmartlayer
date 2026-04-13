// Sends appointment SMS to a customer, only with explicit consent.
// POST body: { name, date, type, phone, smsConsent }

function formatDateForDisplay(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return 'your requested time';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Halifax'
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Halifax'
  });
  return `${dateStr} at ${timeStr}`;
}

function parseSmsConsent(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === 'agreed' || normalized === 'opted_in';
  }
  return false;
}

async function sendSms(phone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from || !phone) return { ok: false, reason: 'missing_config' };
  const to = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '').slice(-10)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Customer SMS error:', res.status, err);
    return { ok: false, reason: err };
  }
  return { ok: true };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, date, type, phone, smsConsent } = body;
  if (!phone || !date || !type) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing phone, date, or type' }) };
  }

  if (!parseSmsConsent(smsConsent)) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, skipped: true, reason: 'no_consent' }) };
  }

  const displayDate = formatDateForDisplay(date);
  const message = `The Smart Layer: Hi ${name || 'there'}, your ${type} is booked for ${displayDate}. Reply STOP to opt out.`;
  const result = await sendSms(phone, message);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: !!result.ok, result })
  };
};
