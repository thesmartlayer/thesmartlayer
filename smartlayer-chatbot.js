// Smart Layer Chatbot Widget - v3.0 (Redesigned UI)
(function() {
    'use strict';
    
    const CONFIG = {
        businessName: "The Smart Layer",
        primaryColor: "#3b82f6",
        accentColor: "#f59e0b",
        email: "info@thesmartlayer.com",
        phoneNumber: "(855) 404-AIAI (2424)"
    };

    function createChatbot() {
        const container = document.createElement('div');
        const chatWindow = document.createElement('div');
        let isOpen = false;
        let messages = [
            { role: 'assistant', content: `Hey there! 👋 I'm the AI assistant for ${CONFIG.businessName}. What kind of business are you running?` }
        ];

        // Container
        container.id = 'smartlayer-chatbot';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999998;font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
        
        // Floating Button
        const button = document.createElement('button');
        button.id = 'smartlayer-chat-btn';
        button.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        button.style.cssText = `
            background:linear-gradient(135deg,#3b82f6,#2563eb);
            color:white;border:none;border-radius:50%;width:60px;height:60px;
            cursor:pointer;font-size:24px;
            box-shadow:0 4px 20px rgba(59,130,246,0.4),0 0 0 0 rgba(59,130,246,0.3);
            transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
            display:flex;align-items:center;justify-content:center;
            animation:chatPulse 3s ease-in-out infinite;
        `;
        button.onmouseover = () => { button.style.transform='scale(1.1)'; button.style.boxShadow='0 6px 24px rgba(59,130,246,0.5)'; };
        button.onmouseout = () => { button.style.transform='scale(1)'; button.style.boxShadow='0 4px 20px rgba(59,130,246,0.4)'; };

        // Inject animations
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes chatPulse {
                0%,100% { box-shadow:0 4px 20px rgba(59,130,246,0.4),0 0 0 0 rgba(59,130,246,0.3); }
                50% { box-shadow:0 4px 20px rgba(59,130,246,0.4),0 0 0 12px rgba(59,130,246,0); }
            }
            @keyframes msgFadeIn {
                from { opacity:0; transform:translateY(8px); }
                to { opacity:1; transform:translateY(0); }
            }
            @keyframes typingDot {
                0%,60%,100% { opacity:0.3; transform:translateY(0); }
                30% { opacity:1; transform:translateY(-4px); }
            }
            #smartlayer-chat-window ::-webkit-scrollbar { width:5px; }
            #smartlayer-chat-window ::-webkit-scrollbar-track { background:transparent; }
            #smartlayer-chat-window ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:3px; }
        `;
        document.head.appendChild(styleSheet);

        // Chat Window
        chatWindow.id = 'smartlayer-chat-window';
        chatWindow.style.cssText = `
            display:none;position:fixed;bottom:100px;right:24px;
            width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 140px);
            background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);
            border-radius:20px;
            box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08);
            flex-direction:column;overflow:hidden;z-index:999999;
        `;

        // Logic
        async function sendMessage() {
            const input = chatWindow.querySelector('#sl-msg-input');
            const text = input.value.trim();
            if (!text) return;

            messages.push({ role: 'user', content: text });
            input.value = '';
            messages.push({ role: 'assistant', content: '...' });
            render();

            try {
                const response = await fetch('/.netlify/functions/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: messages.filter(m => m.content !== '...') })
                });
                const data = await response.json();
                messages.pop();
                messages.push({ role: 'assistant', content: data.reply || "I'd love to help! Tell me about your business." });
            } catch (e) {
                messages.pop();
                messages.push({ role: 'assistant', content: `Connection issue — please email us at ${CONFIG.email} or call ${CONFIG.phoneNumber}` });
            }
            render();
        }

        function render() {
            const isTyping = messages.length > 0 && messages[messages.length - 1].content === '...';
            
            chatWindow.innerHTML = `
                <!-- Header -->
                <div style="
                    background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#2563eb 100%);
                    padding:18px 20px;display:flex;justify-content:space-between;align-items:center;
                    border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;
                ">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="
                            width:36px;height:36px;border-radius:10px;
                            background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);
                            display:flex;align-items:center;justify-content:center;
                            border:1px solid rgba(255,255,255,0.2);
                        ">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:14px;color:white;letter-spacing:-0.01em;">Smart Layer AI</div>
                            <div style="display:flex;align-items:center;gap:5px;">
                                <div style="width:6px;height:6px;background:#4ade80;border-radius:50%;box-shadow:0 0 6px rgba(74,222,128,0.6);"></div>
                                <span style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:500;">Online now</span>
                            </div>
                        </div>
                    </div>
                    <button id="sl-close" style="
                        background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);
                        color:white;width:32px;height:32px;border-radius:8px;cursor:pointer;
                        display:flex;align-items:center;justify-content:center;
                        transition:all 0.2s;font-size:16px;line-height:1;
                    ">✕</button>
                </div>

                <!-- Messages -->
                <div id="sl-msg-box" style="
                    flex:1;overflow-y:auto;padding:16px 16px 8px;
                    display:flex;flex-direction:column;gap:12px;
                ">
                    ${messages.map((m, i) => {
                        if (m.content === '...') {
                            return `
                                <div style="align-self:flex-start;max-width:80%;animation:msgFadeIn 0.3s ease;">
                                    <div style="display:flex;align-items:flex-end;gap:8px;">
                                        <div style="
                                            width:28px;height:28px;border-radius:8px;flex-shrink:0;
                                            background:linear-gradient(135deg,#3b82f6,#6366f1);
                                            display:flex;align-items:center;justify-content:center;
                                        ">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                            </svg>
                                        </div>
                                        <div style="
                                            padding:12px 16px;border-radius:14px 14px 14px 4px;
                                            background:rgba(255,255,255,0.06);
                                            border:1px solid rgba(255,255,255,0.08);
                                        ">
                                            <div style="display:flex;gap:4px;padding:4px 0;">
                                                <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.4);animation:typingDot 1.2s infinite;animation-delay:0s;"></span>
                                                <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.4);animation:typingDot 1.2s infinite;animation-delay:0.15s;"></span>
                                                <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.4);animation:typingDot 1.2s infinite;animation-delay:0.3s;"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        if (m.role === 'user') {
                            return `
                                <div style="align-self:flex-end;max-width:80%;animation:msgFadeIn 0.3s ease;">
                                    <div style="
                                        padding:12px 16px;border-radius:14px 14px 4px 14px;
                                        background:linear-gradient(135deg,#3b82f6,#2563eb);
                                        color:white;font-size:13.5px;line-height:1.55;
                                        box-shadow:0 2px 8px rgba(59,130,246,0.25);
                                    ">${escapeHtml(m.content)}</div>
                                </div>
                            `;
                        }
                        
                        return `
                            <div style="align-self:flex-start;max-width:80%;animation:msgFadeIn 0.3s ease;">
                                <div style="display:flex;align-items:flex-end;gap:8px;">
                                    <div style="
                                        width:28px;height:28px;border-radius:8px;flex-shrink:0;
                                        background:linear-gradient(135deg,#3b82f6,#6366f1);
                                        display:flex;align-items:center;justify-content:center;
                                    ">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                        </svg>
                                    </div>
                                    <div style="
                                        padding:12px 16px;border-radius:14px 14px 14px 4px;
                                        background:rgba(255,255,255,0.06);
                                        border:1px solid rgba(255,255,255,0.08);
                                        color:#e2e8f0;font-size:13.5px;line-height:1.55;
                                    ">${m.content.replace(/\n/g, '<br>')}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Input -->
                <div style="
                    padding:12px 16px 16px;
                    background:rgba(15,23,42,0.6);
                    border-top:1px solid rgba(255,255,255,0.06);
                    flex-shrink:0;
                ">
                    <div style="
                        display:flex;gap:8px;align-items:center;
                        background:rgba(255,255,255,0.06);
                        border:1px solid rgba(255,255,255,0.1);
                        border-radius:12px;padding:4px 4px 4px 16px;
                        transition:border-color 0.2s;
                    " id="sl-input-wrap">
                        <input id="sl-msg-input" type="text" placeholder="Type your message..."
                            style="
                                flex:1;border:none;background:transparent;
                                color:#e2e8f0;font-size:13.5px;outline:none;
                                font-family:inherit;padding:8px 0;
                            "
                        >
                        <button id="sl-send-btn" style="
                            background:linear-gradient(135deg,#3b82f6,#2563eb);
                            color:white;border:none;
                            width:36px;height:36px;border-radius:9px;
                            cursor:pointer;display:flex;align-items:center;justify-content:center;
                            transition:all 0.2s;flex-shrink:0;
                        ">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div style="text-align:center;margin-top:8px;">
                        <span style="font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:0.03em;">Powered by The Smart Layer</span>
                    </div>
                </div>
            `;

            // Event listeners
            chatWindow.querySelector('#sl-send-btn').onclick = sendMessage;
            chatWindow.querySelector('#sl-close').onclick = () => {
                chatWindow.style.display = 'none';
                button.style.display = 'flex';
                isOpen = false;
            };
            chatWindow.querySelector('#sl-close').onmouseover = (e) => { e.target.style.background = 'rgba(255,255,255,0.2)'; };
            chatWindow.querySelector('#sl-close').onmouseout = (e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; };
            chatWindow.querySelector('#sl-msg-input').onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
            chatWindow.querySelector('#sl-msg-input').onfocus = () => {
                document.getElementById('sl-input-wrap').style.borderColor = 'rgba(59,130,246,0.5)';
            };
            chatWindow.querySelector('#sl-msg-input').onblur = () => {
                document.getElementById('sl-input-wrap').style.borderColor = 'rgba(255,255,255,0.1)';
            };
            chatWindow.querySelector('#sl-send-btn').onmouseover = (e) => { e.currentTarget.style.opacity = '0.85'; };
            chatWindow.querySelector('#sl-send-btn').onmouseout = (e) => { e.currentTarget.style.opacity = '1'; };

            // Scroll to bottom
            const msgBox = chatWindow.querySelector('#sl-msg-box');
            msgBox.scrollTop = msgBox.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Open chat
        button.onclick = () => {
            chatWindow.style.display = 'flex';
            button.style.display = 'none';
            isOpen = true;
            render();
            setTimeout(() => {
                const input = chatWindow.querySelector('#sl-msg-input');
                if (input) input.focus();
            }, 100);
        };

        container.appendChild(button);
        container.appendChild(chatWindow);
        document.body.appendChild(container);

        // Expose hide/show for demo fullscreen toggle
        window._smartLayerChatbot = {
            hide: () => { container.style.display = 'none'; },
            show: () => { container.style.display = 'block'; },
            isOpen: () => isOpen
        };
    }

    if (document.readyState === 'complete') createChatbot();
    else window.addEventListener('load', createChatbot);
})();
