// netlify/functions/chat.js
// Chatbot backend using Anthropic Claude API

const SYSTEM_PROMPT = `You are the AI sales assistant for The Smart Layer, a local business in New Brunswick, Canada that builds AI-powered websites and chatbots for service businesses.

KEY FACTS ABOUT THE SMART LAYER:
- We build professional websites with built-in AI chatbots for local service businesses
- Industries: auto repair, dental, HVAC, restaurants, professional services, salons, and more
- Based in New Brunswick, serving Fredericton, Moncton, and surrounding areas
- Free in-person setup available in Fredericton & Moncton

PRICING:
- Starter: $149/month — Professional website, AI chatbot (24/7), appointment booking, lead capture, mobile responsive, basic analytics, email support
- Professional (Most Popular): $249/month — Everything in Starter PLUS AI phone assistant, call transcripts, advanced analytics, SMS notifications, calendar integration, priority support, custom training
- Complete: $399/month — Everything in Professional PLUS social media OR review management, advanced automation, multi-location support, dedicated account manager, white-label option
- ALL plans include: First month FREE, free training, ongoing support, cancel anytime, no contracts

SETUP:
- Most businesses are live within 48 hours
- We handle all technical work
- No technical skills needed from the client
- Free training included

YOUR BEHAVIOR:
- Be warm, friendly, and conversational — not robotic
- Keep responses concise (2-4 sentences usually)
- Ask about their business type to give relevant examples
- Gently guide toward booking a free consultation
- If asked something you don't know, offer to connect them with the team
- Contact: contact@thesmartlayer.com or (506) 555-SMART
- Business hours: Mon-Fri 9-6, Sat 10-2, Sun closed`;

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ reply: "I'm having a connection issue right now. Please email us at contact@thesmartlayer.com and we'll get right back to you!" })
        };
    }

    try {
        const { messages } = JSON.parse(event.body);

        // Convert messages to Anthropic format
        const anthropicMessages = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
                role: m.role,
                content: m.content
            }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
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
                body: JSON.stringify({ reply: "I'm having a momentary hiccup. Could you try again? Or feel free to email us at contact@thesmartlayer.com!" })
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
            body: JSON.stringify({ reply: "Something went wrong on my end. Please try again or reach out to us at contact@thesmartlayer.com!" })
        };
    }
};
