// Smart Layer Chatbot Widget - v3.0 (Anthropic-powered)
(function() {
    'use strict';

    const CONFIG = {
        businessName: "The Smart Layer",
        primaryColor: "#3b82f6",
        accentColor: "#f59e0b",
        email: "contact@thesmartlayer.com",
        phoneNumber: "(506) 555-SMART"
    };

    function createChatbot() {
        const container = document.createElement('div');
        container.id = 'smartlayer-chatbot';

        let isOpen = false;
        let isLoading = false;
        let messages = [
            { role: 'assistant', content: `Hi there! 👋 I'm the AI assistant for ${CONFIG.businessName}. What kind of business are you running? I'd love to show you how we can help.` }
        ];

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            #smartlayer-chatbot * { box-sizing: border-box; margin: 0; padding: 0; }

            .sl-chat-btn {
                position: fixed; bottom: 24px; right: 24px; z-index: 999998;
                background: ${CONFIG.primaryColor}; color: white; border: none;
                border-radius: 50%; width: 60px; height: 60px; cursor: pointer;
                font-size: 24px; box-shadow: 0 4px 20px rgba(59,130,246,0.4);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex; align-items: center; justify-content: center;
            }
            .sl-chat-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(59,130,246,0.5); }
            .sl-chat-btn.hidden { display: none; }

            .sl-chat-badge {
                position: absolute; top: -4px; right: -4px;
                width: 20px; height: 20px; background: #ef4444;
                border-radius: 50%; border: 2px solid white;
                font-size: 11px; font-weight: 700; color: white;
                display: flex; align-items: center; justify-content: center;
            }

            .sl-chat-window {
                position: fixed; bottom: 24px; right: 24px; z-index: 999999;
                width: 400px; max-width: calc(100vw - 32px); height: 600px; max-height: calc(100vh - 48px);
                background: #ffffff; border-radius: 16px;
                box-shadow: 0 12px 48px rgba(0,0,0,0.2);
                display: none; flex-direction: column; overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                animation: sl-slide-up 0.3s ease;
            }
            .sl-chat-window.open { display: flex; }

            @keyframes sl-slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .sl-chat-header {
                background: ${CONFIG.primaryColor}; color: white;
                padding: 16px 20px; display: flex; justify-content: space-between;
                align-items: center; flex-shrink: 0;
            }
            .sl-chat-header-left { display: flex; align-items: center; gap: 10px; }
            .sl-chat-status { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: sl-pulse 2s infinite; }
            @keyframes sl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .sl-chat-header-title { font-weight: 700; font-size: 15px; }
            .sl-chat-header-sub { font-size: 11px; opacity: 0.85; }
            .sl-chat-close { background: none; border: none; color: white; font-size: 22px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s; line-height: 1; }
            .sl-chat-close:hover { background: rgba(255,255,255,0.2); }

            .sl-chat-messages {
                flex: 1; overflow-y: auto; padding: 16px;
                background: #f8fafc; display: flex; flex-direction: column; gap: 12px;
            }
            .sl-chat-messages::-webkit-scrollbar { width: 4px; }
            .sl-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

            .sl-msg { max-width: 85%; animation: sl-msg-in 0.25s ease; }
            .sl-msg-user { align-self: flex-end; }
            .sl-msg-assistant { align-self: flex-start; }
            @keyframes sl-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

            .sl-msg-bubble {
                padding: 12px 16px; font-size: 14px; line-height: 1.55;
                border-radius: 16px; word-wrap: break-word;
            }
            .sl-msg-user .sl-msg-bubble {
                background: ${CONFIG.primaryColor}; color: white;
                border-bottom-right-radius: 4px;
            }
            .sl-msg-assistant .sl-msg-bubble {
                background: white; color: #1e293b;
                border-bottom-left-radius: 4px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            }

            .sl-typing { display: flex; gap: 4px; padding: 12px 16px; }
            .sl-typing-dot {
                width: 8px; height: 8px; background: #94a3b8;
                border-radius: 50%; animation: sl-bounce 1.4s infinite;
            }
            .sl-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .sl-typing-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes sl-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

            .sl-chat-input-area {
                padding: 12px 16px; background: white;
                border-top: 1px solid #e2e8f0; display: flex; gap: 8px;
                flex-shrink: 0;
            }
            .sl-chat-input {
                flex: 1; border: 1px solid #e2e8f0; padding: 10px 14px;
                border-radius: 10px; outline: none; font-size: 14px;
                font-family: inherit; transition: border-color 0.2s;
                background: #f8fafc;
            }
            .sl-chat-input:focus { border-color: ${CONFIG.primaryColor}; background: white; }
            .sl-chat-input:disabled { opacity: 0.6; }

            .sl-chat-send {
                background: ${CONFIG.primaryColor}; color: white; border: none;
                padding: 10px 16px; border-radius: 10px; cursor: pointer;
                font-weight: 600; font-size: 14px; font-family: inherit;
                transition: all 0.2s; display: flex; align-items: center; gap: 4px;
            }
            .sl-chat-send:hover:not(:disabled) { background: #2563eb; }
            .sl-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }

            .sl-chat-footer {
                padding: 8px 16px; background: #f8fafc;
                border-top: 1px solid #f1f5f9; text-align: center;
                flex-shrink: 0;
            }
            .sl-chat-footer a {
                color: #94a3b8; text-decoration: none; font-size: 11px;
                transition: color 0.2s;
            }
            .sl-chat-footer a:hover { color: ${CONFIG.primaryColor}; }

            @media (max-width: 480px) {
                .sl-chat-window { bottom: 0; right: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; border-radius: 0; }
            }
        `;
        document.head.appendChild(style);

        // Chat button
        const button = document.createElement('button');
        button.className = 'sl-chat-btn';
        button.innerHTML = '\uD83D\uDCAC<span class="sl-chat-badge">1</span>';

        // Chat window
        const chatWindow = document.createElement('div');
        chatWindow.className = 'sl-chat-window';

        function formatMessage(text) {
            return text
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }

        function render() {
            chatWindow.innerHTML = `
                <div class="sl-chat-header">
                    <div class="sl-chat-header-left">
                        <div class="sl-chat-status"></div>
                        <div>
                            <div class="sl-chat-header-title">${CONFIG.businessName}</div>
                            <div class="sl-chat-header-sub">AI Assistant \u2022 Typically replies instantly</div>
                        </div>
                    </div>
                    <button class="sl-chat-close" id="sl-close">\u00D7</button>
                </div>
                <div class="sl-chat-messages" id="sl-messages">
                    ${messages.map(m => `
                        <div class="sl-msg sl-msg-${m.role}">
                            <div class="sl-msg-bubble">${formatMessage(m.content)}</div>
                        </div>
                    `).join('')}
                    ${isLoading ? `
                        <div class="sl-msg sl-msg-assistant">
                            <div class="sl-msg-bubble sl-typing">
                                <div class="sl-typing-dot"></div>
                                <div class="sl-typing-dot"></div>
                                <div class="sl-typing-dot"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="sl-chat-input-area">
                    <input class="sl-chat-input" id="sl-input" type="text" placeholder="Type your message..." ${isLoading ? 'disabled' : ''}>
                    <button class="sl-chat-send" id="sl-send" ${isLoading ? 'disabled' : ''}>Send</button>
                </div>
                <div class="sl-chat-footer">
                    <a href="https://thesmartlayer.com" target="_blank">Powered by The Smart Layer</a>
                </div>
            `;

            chatWindow.querySelector('#sl-close').onclick = closeChat;
            chatWindow.querySelector('#sl-send').onclick = sendMessage;
            chatWindow.querySelector('#sl-input').onkeydown = (e) => {
                if (e.key === 'Enter' && !isLoading) sendMessage();
            };

            const msgBox = chatWindow.querySelector('#sl-messages');
            msgBox.scrollTop = msgBox.scrollHeight;

            if (!isLoading && isOpen) {
                const input = chatWindow.querySelector('#sl-input');
                if (input) input.focus();
            }
        }

        async function sendMessage() {
            const input = chatWindow.querySelector('#sl-input');
            const text = input.value.trim();
            if (!text || isLoading) return;

            messages.push({ role: 'user', content: text });
            isLoading = true;
            render();

            try {
                const response = await fetch('/.netlify/functions/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: messages.filter(m => m.role === 'user' || m.role === 'assistant')
                    })
                });
                const data = await response.json();
                messages.push({ role: 'assistant', content: data.reply || "I'd love to help! Could you tell me more about your business?" });
            } catch (e) {
                messages.push({ role: 'assistant', content: `I'm having trouble connecting right now. You can reach us at ${CONFIG.email} or call ${CONFIG.phoneNumber} \u2014 we'd love to chat!` });
            }

            isLoading = false;
            render();
        }

        function openChat() {
            isOpen = true;
            chatWindow.classList.add('open');
            button.classList.add('hidden');
            const badge = button.querySelector('.sl-chat-badge');
            if (badge) badge.style.display = 'none';
            render();
        }

        function closeChat() {
            isOpen = false;
            chatWindow.classList.remove('open');
            button.classList.remove('hidden');
        }

        button.onclick = openChat;

        container.appendChild(button);
        container.appendChild(chatWindow);
        document.body.appendChild(container);
    }

    if (document.readyState === 'complete') createChatbot();
    else window.addEventListener('load', createChatbot);
})();
