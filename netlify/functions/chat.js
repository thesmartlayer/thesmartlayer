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
            date: { type: "string", description: "Appointment date and time in ISO 8601 format with Atlantic Time offset. ALWAYS use -04:00 offset. Example: 2026-03-05T14:00:00-04:00 for 2pm Atlantic Time." },
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
- Most businesses are live within 48 hours
- We handle all technical work
- No technical skills needed from the client
- Free training included

LIVE DEMO:
- We have a fully working demo at auto.thesmartlayer.com showing everything — website, chatbot, phone agent, customer dashboard, and business owner dashboard
- Anyone can try the Owner View or Customer View without signing up

BOOKING APPOINTMENTS:
- You can book appointments for prospects using the book_appointment tool
- Business hours are Mon-Fri 9am-6pm, Sat 10am-2pm Atlantic Time
- Do NOT book on Sundays
- Default consultation length is 30 minutes, demos are 45 minutes
- When someone wants to book, collect their name and preferred date/time first
- Confirm the date/time with them before using the tool
- If they don't specify a time, suggest a few available slots from the availability info provided
- Today's date is provided in the availability context below

YOUR IDENTITY — CRITICAL:
- You are an AI ASSISTANT for The Smart Layer — NOT the founder, NOT a human team member
- NEVER pretend to be the person they'll meet with
- The consultation/demo will be with "John, our founder" or "our team" — make that clear
- Say things like "I'll book you in with John" or "Our founder will walk you through that"
- NEVER say "I'll see you tomorrow" or "I'll show you the demo" — you are the chatbot, not the consultant
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
- Contact: info@thesmartlayer.com or (855) 404-AIAI (2424)
- Business hours: Mon-Fri 9-6, Sat 10-2, Sun closed`;

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
            return `\n\nAVAILABILITY: Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. No existing appointments in the next 2 weeks — all business-hours slots are open.`;
        }

        const booked = data.records.map(r => {
            const d = new Date(r.fields.Date);
            const dur = r.fields.Duration || 30;
            return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (${dur}min)`;
        }).join('\n  - ');

        return `\n\nAVAILABILITY: Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.\nAlready booked slots (DO NOT double-book these):\n  - ${booked}\nAll other business-hours slots (Mon-Fri 9am-6pm, Sat 10am-2pm) are available.`;
    } catch (e) {
        console.error('Availability fetch error:', e);
        return '';
    }
}

// Create appointment in Airtable
async function createAppointment(input) {
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!airtableKey) throw new Error('No Airtable key');

    // Ensure Atlantic Time offset is included
    let dateStr = input.date;
    if (dateStr && !dateStr.match(/[Zz]$/) && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
        dateStr = dateStr + '-04:00'; // Atlantic Standard Time
    }

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

// Save chat transcript to Airtable
async function saveTranscript(bookingId, messages, source) {
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!airtableKey) return;

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

        // Build summary from last few exchanges
        const lastMessages = messages.filter(m => m.role === 'user').slice(-3);
        const summary = lastMessages.map(m => typeof m.content === 'string' ? m.content : '').filter(Boolean).join(' | ');

        const fields = {
            transcript_id: 'chat-' + Date.now(),
            booking_id: bookingId || '',
            source: source || 'Chatbot',
            full_transcript: transcript,
            summary: summary.slice(0, 500),
            created_at: new Date().toISOString()
        };

        const resp = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transcripts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${airtableKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: [{ fields }] })
        });
        if (!resp.ok) {
            const errText = await resp.text();
            console.error('Transcript Airtable error:', errText);
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
        const { messages } = JSON.parse(event.body);

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

        if (toolUseBlock && toolUseBlock.name === 'book_appointment') {
            // Extract any text Claude said before the tool call
            const prefixText = data.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');

            let toolResultContent;
            try {
                const appointmentId = await createAppointment(toolUseBlock.input);
                const apptDate = new Date(toolUseBlock.input.date);
                const dateStr = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                const timeStr = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                toolResultContent = `Appointment successfully booked! ID: ${appointmentId}. ${toolUseBlock.input.type} for ${toolUseBlock.input.name} on ${dateStr} at ${timeStr}.`;
                // Save transcript linked to this booking
                await saveTranscript(appointmentId, anthropicMessages, 'Chatbot');
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
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ reply: reply || "Your appointment has been booked! We'll see you soon." })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ reply: prefixText || "Your appointment has been booked! We'll be in touch to confirm." })
            };
        }

        // No tool use — just return the text response
        const reply = data.content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('') || "I'd love to help! Could you tell me a bit about your business?";

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
