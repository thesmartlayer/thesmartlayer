// netlify/functions/chat.js
// Chatbot backend using Anthropic Claude API (Haiku 4.5)
// Supports tool use for booking appointments via Airtable

const AIRTABLE_BASE_ID = 'appoi3JJ82TuvnXwl';
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
- Just provide your website URL, top competitor, core service, and contact info

PRICING (Founding Member Rates — locked in for early clients):
- Starter: $149/month — Professional website, AI chatbot (24/7), customer portal, business dashboard, appointment booking, lead capture, mobile responsive, basic analytics, email support
- Professional (Most Popular): $249/month — Everything in Starter PLUS AI phone assistant (24/7 voice agent), call transcripts, advanced analytics, SMS notifications, calendar integration, priority support, custom AI training
- Complete: $399/month — Everything in Professional PLUS AI Visibility Monitoring (tracks how your business appears in AI search engines monthly), social media OR review management, advanced automation, multi-location support, dedicated account manager
- ALL plans: First month FREE, no credit card required, free training, ongoing support, cancel anytime, no contracts
- These are founding member rates — early clients lock in this price even when rates go up

VALUE CONTEXT (use naturally, don't recite):
- Most agencies charge $2,500-$6,000 just for a basic website, then $100-$500/month for a chatbot separately
- Scheduling tools alone cost $30-100/month, messaging tools $50-200/month, invoicing $20-50/month
- Our platform replaces 4-5 separate subscriptions in one

SETUP:
- Most businesses are live within 72 hours, though timelines may vary depending on complexity
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

YOUR IDENTITY — CRITICAL:
- You are an AI ASSISTANT for The Smart Layer — NOT the founder, NOT a human team member
- NEVER pretend to be the person they'll meet with
- The consultation/demo will be with "John, our founder" or "our team" — make that clear
- Say things like "I'll book you in with John" or "Our founder will walk you through that"
- NEVER use phrases like "See you tomorrow", "I'll see you then", "I'll show you", "Looking forward to meeting you" — these imply YOU are the consultant
- Instead say: "John will see you then" or "You're all set with John"
- Do NOT give away detailed strategy, implementation plans, or deep technical advice
- Tease value and redirect: "That's a great question — John can walk you through exactly how that works for your industry during the consultation"
- Save the real expertise for the human consultation — your job is to spark interest and get the booking

YOUR BEHAVIOR:
- Be warm, friendly, and conversational — not robotic
- Keep responses SHORT (2-3 sentences max). Don't write paragraphs.
- Ask about their business type to give relevant examples
- Gently guide toward booking a free consultation or trying the free AI Visibility Audit
- If asked something you don't know, say "John can cover that in detail during your consultation" 
- Don't over-explain features — give a quick hook and push toward the booking
- Contact: info@thesmartlayer.com or (855) 404-AIAI (2424)`;

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
    // Determine if date falls in DST (second Sunday of March to first Sunday of November)
    const naiveDate = new Date(dateStr);
    const year = naiveDate.getFullYear();
    // Second Sunday of March
    const marchFirst = new Date(year, 2, 1);
    const dstStart = new Date(year, 2, 8 + (7 - marchFirst.getDay()) % 7, 2, 0, 0);
    // First Sunday of November
    const novFirst = new Date(year, 10, 1);
    const dstEnd = new Date(year, 10, 1 + (7 - novFirst.getDay()) % 7, 2, 0, 0);
    const isDST = naiveDate >= dstStart && naiveDate < dstEnd;
    const offset = isDST ? '-03:00' : '-04:00';
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
            source: source || 'Chatbot',
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
                max_tokens: 1024,
                system: systemWithAvailability,
                messages: anthropicMessages,
                tools: [BOOKING_TOOL]
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
                const apptDate = new Date(toolUseBlock.input.date);
                const dateStr = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Moncton' });
                const timeStr = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Moncton' });
                toolResultContent = `Appointment successfully booked! ID: ${appointmentId}. ${toolUseBlock.input.type} for ${toolUseBlock.input.name} on ${dateStr} at ${timeStr}.`;
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
                    max_tokens: 1024,
                    system: systemWithAvailability,
                    messages: followUpMessages,
                    tools: [BOOKING_TOOL]
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
                    body: JSON.stringify({ reply: reply || "Your appointment has been booked! We'll see you soon." })
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
            upsertTranscript(sessionId, convWithReply, null, 'Chatbot');
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
        upsertTranscript(sessionId, conversationWithReply, null, 'Chatbot');

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
