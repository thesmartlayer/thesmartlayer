// netlify/functions/chat.js
// Chatbot backend using Anthropic Claude API (Haiku 4.5 for cost efficiency)

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

YOUR BEHAVIOR:
- Be warm, friendly, and conversational — not robotic
- Keep responses concise (2-4 sentences usually)
- Ask about their business type to give relevant examples
- Gently guide toward booking a free consultation or trying the free AI Visibility Audit
- If asked something you don't know, offer to connect them with the team
- Contact: info@thesmartlayer.com or (855) 404-AIAI (2424)
- Business hours: Mon-Fri 9-6, Sat 10-2, Sun closed`;

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

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: SYSTEM_PROMPT,
                messages: anthropicMessages
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
        const reply = data.content?.[0]?.text || "I'd love to help! Could you tell me a bit about your business?";

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
