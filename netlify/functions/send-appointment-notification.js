// netlify/functions/send-appointment-notification.js
// Sends SMS (Twilio) and email (Resend) when a new appointment is booked.
// POST body: { name, date, type, source }

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
const CONFIG_TABLE = 'Config';

function escapeHtml(s) {
    if (s == null || typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDateForDisplay(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Halifax' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Halifax' });
    return `${dateStr} at ${timeStr}`;
}

async function getConfig(apiKey) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONFIG_TABLE}?maxRecords=1`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) return { alert_phone: '', alert_email: '' };
    const data = await res.json();
    const record = (data.records || [])[0];
    const fields = record && record.fields ? record.fields : {};
    return {
        alert_phone: (fields.AlertPhone || '').trim(),
        alert_email: (fields.AlertEmail || '').trim()
    };
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
        console.error('Twilio SMS error:', res.status, err);
        return { ok: false, reason: err };
    }
    return { ok: true };
}

async function sendEmail(to, subject, htmlBody) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.ALERT_FROM_EMAIL || 'alerts@thesmartlayer.com';
    if (!apiKey || !to) return { ok: false, reason: 'missing_config' };
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject,
            html: htmlBody
        })
    });
    if (!res.ok) {
        const err = await res.text();
        console.error('Resend email error:', res.status, err);
        return { ok: false, reason: err };
    }
    return { ok: true };
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { name, date, type, source } = body;
    if (!name || !date || !type) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing name, date, or type' }) };
    }

    const displayDate = formatDateForDisplay(date);
    const sourceLabel = source || 'Booking';
    const smsText = `New booking: ${name} — ${displayDate} (${type}) via ${sourceLabel}`;
    const emailSubject = `New appointment: ${name} — ${displayDate}`;
    const emailHtml = `
        <p><strong>New appointment booked</strong></p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Date &amp; time:</strong> ${escapeHtml(displayDate)}</p>
        <p><strong>Type:</strong> ${escapeHtml(type)}</p>
        <p><strong>Source:</strong> ${escapeHtml(sourceLabel)}</p>
        <p><a href="https://thesmartlayer.com/ceo_dashboard.html">View dashboard</a></p>
    `;

    const config = await getConfig(apiKey);
    const results = { sms: null, email: null };

    if (config.alert_phone) {
        results.sms = await sendSms(config.alert_phone, smsText);
    }
    if (config.alert_email) {
        results.email = await sendEmail(config.alert_email, emailSubject, emailHtml);
    }

    const anySent = (results.sms && results.sms.ok) || (results.email && results.email.ok);
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: anySent, results })
    };
};
