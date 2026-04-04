// netlify/functions/chat.js
// Chatbot backend using Anthropic Claude API (Haiku 4.5)
// Supports tool use for booking appointments via Airtable

const AIRTABLE_BASE_ID = 'appI1VGevInWPeMRa';
const AIRTABLE_TABLE = 'Appointments';

const BOOKING_TOOL = {
    name: "book_appointment",
    description: "Book a consultation or demo appointment for a potential client interested in The Smart Layer's services. Use this when a customer wants to schedule a meeting, consultation, demo, or follow-up. Always confirm the date/time with the customer before booking.",
    input_schema: {
        type: "object",
        properties: {
            name: { type: "string", description: "Client's full name" },
            phone: { type: "string", description: "Client's phone number (optional)" },
            email: { type: "string", description: "Client's email address (optional)" },
            date: { type: "string", description: "Appointment date and time as local Atlantic Time in format YYYY-MM-DDTHH:MM:SS. Do NOT include any timezone offset or Z suffix. Just the plain local time. Example: 2026-03-05T14:00:00 for 2pm, 2026-03-11T16:00:00 for 4pm." },
            type: { type: "string", enum: ["Consultation", "Demo", "Follow-up"], description: "Type of appointment. Default to Consultation for new prospects, Demo if they want to see the platform." },
            duration: { type: "number", description: "Duration in minutes. Default 30 for consultations, 45 for demos." },
            notes: { type: "string", description: "Any relevant notes about what the client needs or their business type" }
        },
        required: ["name", "date", "type"]
    }
};

const AUDIT_TOOL = {
    name: "submit_audit",
    description: "Submit a free AI Visibility Audit request. Use this when a customer wants an audit of their online presence. Collect their website URL, top competitor, core service, and contact info (email or phone). This does NOT book an appointment — it submits the audit request and notifies John.",
    input_schema: {
        type: "object",
        properties: {
            url: { type: "string", description: "Customer's website URL" },
            rival: { type: "string", description: "Their top local competitor" },
            service: { type: "string", description: "Their core service (e.g., tire changes, family dentistry)" },
            contact: { type: "string", description: "Email or phone number to send the report to" },
            name: { type: "string", description: "Customer's name or business name" }
        },
        required: ["url", "rival", "service", "contact"]
    }
};

const SYSTEM_PROMPT = `You are the AI sales assistant for The Smart Layer, a local business in New Brunswick, Canada that builds AI-powered business platforms for service businesses.

KEY FACTS ABOUT THE SMART LAYER:
- We build complete business platforms: professional website + AI chatbot + customer portal + business dashboard
- Industries: auto repair, dental, HVAC, restaurants, professional services, salons, and more
- Based in New Brunswick, serving Fredericton, Moncton, and surrounding areas
- Free in-person setup available in Fredericton & Moncton

WHAT CLIENTS GET (3-Layer Platform):
1. YOUR WEBSITE — A professional, mobile-responsive site with a built-in AI chatbot that answers customer questions 24/7, captures leads, and books appointments automatically.
2. CUSTOMER PORTAL — Your customers can log in to view their appointments, message your business directly, manage their vehicles/profile, and view invoices.
3. BUSINESS DASHBOARD — You manage everything from one place: approve/deny bookings, view a visual calendar, message customers, send invoices, read AI chat/call transcripts, configure services and pricing, and track where leads come from (chat, phone, website).

AI VISIBILITY AUDIT (FREE):
- We offer a free 24-hour AI Visibility Audit for any local business
- We check: Google Business Profile, website SEO, how your business appears in ChatGPT/Perplexity/Google AI Overviews, competitor comparison, and local citations
- You get a detailed report with scores and recommendations — no obligation
- To submit an audit: collect the caller's name, website URL, top competitor, core service, and contact info, then use the submit_audit tool. Always ask for their name first. Do NOT book an appointment for audits.
- After submitting, confirm the audit is on its way and they'll have results within 24 hours

AI VISIBILITY FIX (One-Time Service):
- After the audit, if issues are found, we offer a one-time fix starting at $249
- John reviews the audit results and fixes Google Business Profile, SEO issues, local citations, and AI search presence
- Everything the audit flags gets addressed — typically completed within about a week
- No subscription required — this is a standalone service
- For ongoing monthly monitoring after the fix, the Complete plan ($399/mo) includes that
- Only mention the fix when someone asks about fixing issues or what happens after the audit. Don't lead with it.

PRICING (Founding Member Rates — locked in for early clients):
- Starter: $149/month — Professional website, AI chatbot (24/7), customer portal, business dashboard, appointment booking, lead capture, mobile responsive, basic analytics, email support
- Professional (Most Popular): $249/month — Everything in Starter PLUS AI phone assistant (24/7 voice agent), call transcripts, advanced analytics, SMS notifications, calendar integration, priority support, custom AI training
- Complete: $399/month — Everything in Professional PLUS AI Visibility Monitoring (tracks how your business appears in AI search engines monthly), social media OR review management (your choice), advanced SMS follow-up, John as your direct point of contact for strategy
- Complete Plus: $499/month — Everything in Complete PLUS Multi-Agent AI Office (specialized AI agents that warm-transfer between departments), social media AND review management (both included), priority feature beta access
- ALL plans: First month FREE (includes website, AI chatbot, and AI phone agent), no credit card required, free training, ongoing support, cancel anytime with 30 days notice, no contracts
- These are founding member rates — early clients lock in this price even when rates go up

VALUE CONTEXT (use naturally, don't recite):
- Most agencies charge $2,500-$6,000 just for a basic website, then $100-$500/month for a chatbot separately
- Scheduling tools alone cost $30-100/month, messaging tools $50-200/month, invoicing $20-50/month
- Our platform replaces 4-5 separate subscriptions in one

SETUP:
- Website and AI chatbot are typically live within 48-72 hours. AI phone agent training takes a few additional days. Full platform setup is usually complete within the first week.
- Free trial starts when your website goes live
- We handle all technical work
- No technical skills needed from the client
- Free training included

LIVE DEMO:
- We have a fully working demo at auto.thesmartlayer.com showing everything — website, chatbot, phone agent, customer dashboard, and business owner dashboard
- Anyone can try the Owner View or Customer View without signing up

BOOKING APPOINTMENTS:
- You can book appointments for prospects using the book_appointment tool
- AVAILABILITY (Atlantic Time) — these are the ONLY times you may book:
  Monday: 9:00 AM, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30 (last slot)
  Tuesday: 9:00 AM, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30 (last slot)
  Wednesday: 9:00 AM, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 1:00, 1:30, 2:00, 2:30, 3:00, 3:30, 4:00, 4:30, 5:00, 5:30 (last slot)
  Thursday: 9:00 AM, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30 (last slot)
  Friday: 9:00 AM, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30 (last slot)
  Saturday: 10:00 AM, 10:30, 11:00, 11:30, 12:00, 12:30, 1:00, 1:30 (last slot)
  Sunday: CLOSED — no appointments
- ANY of the slots listed above are valid. 11:00 AM on a Monday IS available. Do not reject valid times.
- Do NOT book outside these slots. If someone requests a time not listed, explain and suggest the nearest open slot.
- Default consultation length is 30 minutes, demos are 45 minutes
- When someone wants to book, collect their name and preferred date/time first
- Confirm the date/time with them before using the tool
- If they don't specify a time, suggest a few available slots from the availability info provided
- Today's date is provided in the availability context below

VIRTUAL VS IN-PERSON:
- ALL consultations and demos are VIRTUAL by default (Zoom or phone call)
- Proactively tell customers: "Consultations are virtual — Zoom or phone, whichever you prefer"
- Only offer in-person if the customer specifically asks. If they request in-person, say: "We can do in-person in Fredericton or Moncton! I'll submit your preferred time and John will confirm availability within a few hours."
- For in-person requests, still book the appointment but add "IN-PERSON REQUEST — needs John's confirmation" to the notes field

AVAILABILITY CLARITY:
- When a requested time is already booked, say it CLEARLY: "That slot is already taken" — do not be vague or wishy-washy
- Then immediately suggest 2-3 specific open slots nearby
- NEVER book an overlapping time. If the availability info shows a slot is booked, it is booked. Period.

CRITICAL — NO DOUBLE BOOKING:
- You may ONLY call the book_appointment tool ONCE per conversation
- If the confirmation message shows a wrong time, do NOT try to fix it by booking again
- Instead say: "Let me flag this for John to confirm — you'll get a confirmation email shortly"
- If anything seems off after booking, direct them to contact us rather than rebooking

YOUR BEHAVIOR — THIS IS CRITICAL, FOLLOW STRICTLY:
- Be warm, friendly, and conversational — not robotic
- Keep responses to 2-3 SHORT sentences. This is your #1 rule. NEVER write more than 4 sentences in a single response.
- NEVER use bullet points, numbered lists, or markdown formatting (no bold, no asterisks). Write in plain conversational sentences only.
- Ask about their business type to give relevant examples
- Gently guide toward booking a free consultation or trying the free AI Visibility Audit
- If asked something you don't know, say "John can cover that in detail during your consultation"
- Don't over-explain features — give a quick hook and push toward the booking
- When someone asks about fixing visibility/online issues, offer the one-time visibility fix (starting at $249) FIRST. Only mention monthly plans if they ask about ongoing tools like chatbots, phone agents, or portals. If they're interested in ongoing monitoring after the fix, mention the Complete plan as a natural bridge.
- When quoting pricing for monthly plans, mention only the plan that fits — don't list all plans unless asked
- Contact: info@thesmartlayer.com or (855) 404-AIAI (2424)

YOUR IDENTITY — CRITICAL, NEVER BREAK THESE RULES:
- You are an AI ASSISTANT for The Smart Layer — NOT the founder, NOT a human team member
- The consultation/demo will be with "John, our founder" — make that clear
- Say things like "I'll book you in with John" or "Our founder will walk you through that"
- NEVER say "See you tomorrow", "I'll see you then", "I'll show you", "Looking forward to meeting you", "See you then", or "We'll see you soon" — these imply YOU are the consultant
- ALWAYS say "John will see you then" or "You're all set with John" after booking
- Do NOT give away detailed strategy or deep technical advice — tease value and redirect to the consultation`;

// Fetch existing appointments for availability context
async function getAvailability() {
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!airtableKey) return '';

    try {
        const now = new Date();
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const filterFormula = `AND(IS_AFTER({Date},'${now.toISOString().split('T')[0]}'),IS_BEFORE({Date},'${twoWeeks.toISOString().split('T')[0]}'),{Status}!='Cancelled')`;

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=asc`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${airtableKey}` }
        });

        if (!response.ok) return '';
        const data = await response.json();

        if (!data.records || data.records.length === 0) {
            return `\n\nAVAILABILITY: Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Moncton' })}. No existing appointments in the next 2 weeks. Available hours: Mon/Tue/Thu/Fri 9am-1pm, Wed 9am-6pm, Sat 10am-2pm. Sunday CLOSED.`;
        }

        const booked = data.records.map(r => {
            const d = new Date(r.fields.Date);
            const dur = r.fields.Duration || 30;
            return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Moncton' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Moncton' })} (${dur}min)`;
        }).join('\n  - ');

        return `\n\nAVAILABILITY: Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Moncton' })}.\nAlready booked slots (DO NOT double-book these):\n  - ${booked}\nAvailable hours: Mon/Tue/Thu/Fri 9am-1pm, Wed 9am-6pm, Sat 10am-2pm. Sunday CLOSED.`;
    } catch (e) {
        console.error('Availability fetch error:', e);
        return '';
    }
}

// Create appointment in Airtable
async function createAppointment(input) {
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!airtableKey) throw new Error('No Airtable key');

    // Compute correct Atlantic Time offset (AST=-04:00, ADT=-03:00)
    let dateStr = input.date;
    // Strip any offset Claude may have added
    dateStr = dateStr.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
    // Determine DST: second Sunday of March 2am to first Sunday of November 2am
    const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    let offset = '-04:00'; // fallback AST
    if (parts) {
        const year = parseInt(parts[1]);
        const month = parseInt(parts[2]);
        const day = parseInt(parts[3]);
        // Second Sunday of March
        const marchFirst = new Date(year, 2, 1);
        const dstStartDay = 8 + (7 - marchFirst.getDay()) % 7;
        // First Sunday of November
        const novFirst = new Date(year, 10, 1);
        const dstEndDay = 1 + (7 - novFirst.getDay()) % 7;
        // Check if date falls in DST period
        const dateNum = month * 100 + day; // simple MMDD comparison
        const dstStartNum = 3 * 100 + dstStartDay; // March
        const dstEndNum = 11 * 100 + dstEndDay; // November
        if (dateNum > dstStartNum && dateNum < dstEndNum) {
            offset = '-03:00'; // ADT
        } else if (dateNum === dstStartNum || dateNum === dstEndNum) {
            // On transition days, just use DST (close enough for booking)
            offset = '-03:00';
        }
    }
    dateStr = dateStr + offset;

    const fields = {
        Name: input.name,
        Date: dateStr,
        Type: input.type || 'Consultation',
        Duration: input.duration || (input.type === 'Demo' ? 45 : 30),
        Status: 'Scheduled',
        Source: 'Chatbot'
    };
    if (input.phone) fields.Phone = input.phone;
    if (input.email) fields.Email = input.email;
    if (input.notes) fields.Notes = input.notes;

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${airtableKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: [{ fields }] })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Airtable create failed: ${err}`);
    }

    const data = await response.json();
    return data.records[0].id;
}

// Submit audit request via submit-audit function (creates lead + sends notifications)
async function submitAudit(input, sessionId) {
    const baseUrl = process.env.URL || 'https://thesmartlayer.com';
    const payload = {
        url: input.url || '',
        rival: input.rival || '',
        service: input.service || '',
        contact: input.contact || '',
        name: input.name || 'Audit Request',
        source: 'Chatbot',
        session_id: sessionId || '',
        smsConsent: false
    };

    try {
        const response = await fetch(`${baseUrl}/.netlify/functions/submit-audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.text();
            console.error('Submit audit error:', err);
        }
    } catch (e) {
        console.error('Submit audit fetch error:', e);
    }
}

// Save or update chat transcript in Airtable (upsert by sessionId)
async function upsertTranscript(sessionId, messages, bookingId, source) {
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!airtableKey || !sessionId) return;

    try {
        // Build readable transcript
        const transcript = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => {
                const role = m.role === 'user' ? 'Customer' : 'AI Assistant';
                const text = typeof m.content === 'string' ? m.content : '[tool interaction]';
                return `${role}: ${text}`;
            })
            .join('\n\n');

        // Build summary from last few user messages
        const lastMessages = messages.filter(m => m.role === 'user').slice(-3);
        const summary = lastMessages.map(m => typeof m.content === 'string' ? m.content : '').filter(Boolean).join(' | ');

        // Check if transcript record already exists for this session
        const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts?filterByFormula=${encodeURIComponent(`{transcript_id}='${sessionId}'`)}&maxRecords=1`;
        const findResp = await fetch(findUrl, {
            headers: { 'Authorization': `Bearer ${airtableKey}` }
        });

        if (findResp.ok) {
            const findData = await findResp.json();
            if (findData.records && findData.records.length > 0) {
                // UPDATE existing record
                const recordId = findData.records[0].id;
                const updateFields = {
                    full_transcript: transcript,
                    summary: summary.slice(0, 500)
                };
                if (bookingId) updateFields.booking_id = bookingId;

                const updateResp = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts/${recordId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${airtableKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: updateFields })
                });
                if (!updateResp.ok) {
                    const errText = await updateResp.text();
                    console.error('Transcript update error:', errText);
                }
                return;
            }
        }

        // CREATE new record
        const fields = {
            transcript_id: sessionId,
            booking_id: bookingId || '',
            Source: source || 'Chatbot',
            full_transcript: transcript,
            summary: summary.slice(0, 500),
            created_at: new Date().toISOString()
        };

        const createResp = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${airtableKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: [{ fields }] })
        });
        if (!createResp.ok) {
            const errText = await createResp.text();
            console.error('Transcript create error:', errText);
        }
    } catch (e) {
        console.error('Transcript save error:', e);
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ reply: "I'm having a connection issue right now. Please email us at info@thesmartlayer.com and we'll get right back to you!" })
        };
    }

    try {
        const { messages, sessionId } = JSON.parse(event.body);

        const anthropicMessages = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }));

        // Get availability context
        const availability = await getAvailability();
        const systemWithAvailability = SYSTEM_PROMPT + availability;

        // First API call — may return text or tool_use
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 512,
                system: systemWithAvailability,
                messages: anthropicMessages,
                tools: [BOOKING_TOOL, AUDIT_TOOL]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', response.status, errorText);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ reply: "I'm having a momentary hiccup. Could you try again? Or feel free to email us at info@thesmartlayer.com!" })
            };
        }

        const data = await response.json();

        // Check if Claude wants to use a tool
        const toolUseBlock = data.content.find(b => b.type === 'tool_use');

        // Guard: prevent double-booking in same conversation
        const alreadyBooked = anthropicMessages.some(m => 
            Array.isArray(m.content) && m.content.some(c => c.type === 'tool_result')
        );

        if (toolUseBlock && toolUseBlock.name === 'submit_audit') {
            // Handle audit submission — no appointment needed
            const prefixText = data.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');

            let toolResultContent;
            try {
                await submitAudit(toolUseBlock.input, sessionId);
                toolResultContent = `Audit request submitted successfully for ${toolUseBlock.input.url || 'their website'}. John has been notified and the report will be delivered within 24 hours.`;
            } catch (e) {
                console.error('Audit submit error:', e);
                toolResultContent = 'Audit request noted. John will follow up within 24 hours.';
            }

            // Send tool result back for final response
            const auditFollowUp = [
                ...anthropicMessages,
                { role: 'assistant', content: data.content },
                { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResultContent }] }
            ];

            const auditResp = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 512,
                    system: systemWithAvailability,
                    messages: auditFollowUp,
                    tools: [BOOKING_TOOL, AUDIT_TOOL]
                })
            });

            if (auditResp.ok) {
                const auditData = await auditResp.json();
                const reply = auditData.content
                    .filter(b => b.type === 'text')
                    .map(b => b.text)
                    .join('');
                const fullConvo = [...anthropicMessages, { role: 'assistant', content: reply || 'Audit submitted!' }];
                await upsertTranscript(sessionId, fullConvo, null, 'Chatbot');
                return { statusCode: 200, headers, body: JSON.stringify({ reply: reply || "Your audit request is in! You'll have your report within 24 hours." }) };
            }

            await upsertTranscript(sessionId, anthropicMessages, null, 'Chatbot');
            return { statusCode: 200, headers, body: JSON.stringify({ reply: prefixText || "Your audit request is in! You'll have your report within 24 hours." }) };
        }

        if (toolUseBlock && toolUseBlock.name === 'book_appointment' && !alreadyBooked) {
            // Extract any text Claude said before the tool call
            const prefixText = data.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');

            let toolResultContent;
            let appointmentId = null;
            try {
                appointmentId = await createAppointment(toolUseBlock.input);
                // Parse the naive date string directly (Claude sends local time like 2026-03-07T11:00:00)
                const rawDate = toolUseBlock.input.date.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
                const dp = rawDate.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                let dateStr, timeStr;
                if (dp) {
                    const d = new Date(parseInt(dp[1]), parseInt(dp[2])-1, parseInt(dp[3]));
                    dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    const hr = parseInt(dp[4]);
                    const mn = dp[5];
                    const ampm = hr >= 12 ? 'PM' : 'AM';
                    const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
                    timeStr = hr12 + ':' + mn + ' ' + ampm;
                } else {
                    dateStr = 'the requested date';
                    timeStr = 'the requested time';
                }
                toolResultContent = `Appointment successfully booked! ID: ${appointmentId}. ${toolUseBlock.input.type} for ${toolUseBlock.input.name} on ${dateStr} at ${timeStr}.`;
                // Fire-and-forget push notification
                try {
                    // Compute Atlantic offset for notification date
                    let notifOffset = '-04:00';
                    if (dp) {
                        const ny = parseInt(dp[1]), nm = parseInt(dp[2]), nd = parseInt(dp[3]);
                        const mf = new Date(ny, 2, 1);
                        const dsd = 8 + (7 - mf.getDay()) % 7;
                        const nf = new Date(ny, 10, 1);
                        const ded = 1 + (7 - nf.getDay()) % 7;
                        const dn = nm * 100 + nd;
                        if (dn > 3 * 100 + dsd && dn < 11 * 100 + ded) notifOffset = '-03:00';
                        else if (dn === 3 * 100 + dsd || dn === 11 * 100 + ded) notifOffset = '-03:00';
                    }
                    const baseUrl = process.env.URL || 'https://thesmartlayer.com';
                    fetch(`${baseUrl}/.netlify/functions/send-appointment-notification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: toolUseBlock.input.name,
                            date: rawDate + notifOffset,
                            type: toolUseBlock.input.type || 'Consultation',
                            source: 'Chatbot'
                        })
                    }).catch(e => console.error('Notification error:', e));
                } catch (e) { console.error('Notification trigger error:', e); }
            } catch (bookingError) {
                console.error('Booking error:', bookingError);
                toolResultContent = `Booking failed: ${bookingError.message}. Please ask the customer to try again or contact us directly.`;
            }

            // Second API call — send tool result back, get final response
            const followUpMessages = [
                ...anthropicMessages,
                { role: 'assistant', content: data.content },
                { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResultContent }] }
            ];

            const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 512,
                    system: systemWithAvailability,
                    messages: followUpMessages,
                    tools: [BOOKING_TOOL, AUDIT_TOOL]
                })
            });

            if (followUpResponse.ok) {
                const followUpData = await followUpResponse.json();
                const reply = followUpData.content
                    .filter(b => b.type === 'text')
                    .map(b => b.text)
                    .join('');
                // Save transcript with full conversation including confirmation
                const fullConversation = [
                    ...anthropicMessages,
                    { role: 'assistant', content: reply || 'Appointment booked.' }
                ];
                await upsertTranscript(sessionId, fullConversation, appointmentId, 'Chatbot');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ reply: reply || "Your appointment has been booked! John will be in touch to confirm." })
                };
            }

            // Follow-up failed — still save transcript with what we have
            await upsertTranscript(sessionId, anthropicMessages, appointmentId, 'Chatbot');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ reply: prefixText || "Your appointment has been booked! We'll be in touch to confirm." })
            };
        }

        // Double-booking blocked — return text only
        if (toolUseBlock && alreadyBooked) {
            const textOnly = data.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');
            const convWithReply = [...anthropicMessages, { role: 'assistant', content: textOnly || 'Appointment already booked.' }];
            await upsertTranscript(sessionId, convWithReply, null, 'Chatbot');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ reply: textOnly || "Your appointment is already booked! If anything needs to change, just email info@thesmartlayer.com or call (855) 404-AIAI." })
            };
        }

        // No tool use — just return the text response
        const reply = data.content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('') || "I'd love to help! Could you tell me a bit about your business?";

        // Update transcript on every message
        const conversationWithReply = [
            ...anthropicMessages,
            { role: 'assistant', content: reply }
        ];
        await upsertTranscript(sessionId, conversationWithReply, null, 'Chatbot');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ reply })
        };

    } catch (error) {
        console.error('Chat function error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ reply: "Something went wrong on my end. Please try again or reach out to us at info@thesmartlayer.com!" })
        };
    }
};
