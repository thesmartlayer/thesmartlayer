// Smart Layer Chatbot Widget - v2.2 (Enhanced for Mobile & HTML Support)
(function() {
    'use strict';
    
    const CONFIG = {
        businessName: "The Smart Layer",
        primaryColor: "#3b82f6",
        accentColor: "#f59e0b",
        email: "info@thesmartlayer.com",
        phoneNumber: "1-506-555-0199"
    };

    function createChatbot() {
        // --- 1. SETUP VARIABLES ---
        const container = document.createElement('div');
        const chatWindow = document.createElement('div');
        let isOpen = false;
        let messages = [
            { role: 'assistant', content: `Hi there! 👋 I'm the AI assistant for ${CONFIG.businessName}. What kind of business are you running?` }
        ];

        // --- 2. CREATE UI ELEMENTS ---
        container.id = 'smartlayer-chatbot';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: system-ui, sans-serif;';
        
        const button = document.createElement('button');
        button.innerHTML = '💬';
        button.style.cssText = `background: ${CONFIG.primaryColor}; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; cursor: pointer; font-size: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.2s;`;
        button.onmouseover = () => button.style.transform = 'scale(1.1)';
        button.onmouseout = () => button.style.transform = 'scale(1)';

        // Responsive Chat Window Setup
        chatWindow.style.cssText = `
            display: none; 
            position: fixed; 
            bottom: 100px; 
            right: 24px; 
            width: 380px; 
            max-width: 90vw; 
            height: 600px; 
            max-height: 80vh; 
            background: white; 
            border-radius: 16px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.2); 
            flex-direction: column; 
            overflow: hidden;
            z-index: 999999;
        `;

        // --- 3. LOGIC FUNCTIONS ---
        async function sendMessage() {
            const input = chatWindow.querySelector('#message-input');
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
                messages.push({ role: 'assistant', content: data.reply || "I'm back! How can I help?" });
            } catch (e) {
                messages.pop();
                messages.push({ role: 'assistant', content: "Connection error. Please email us at " + CONFIG.email });
            }
            render();
        }

        function render() {
            chatWindow.innerHTML = `
                <div style="background: ${CONFIG.primaryColor}; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 10px; height: 10px; background: #4ade80; border-radius: 50%;"></div>
                        <strong>${CONFIG.businessName} Assistant</strong>
                    </div>
                    <button id="close-chat" style="background:none; border:none; color:white; font-size: 24px; cursor:pointer; line-height: 1;">×</button>
                </div>
                <div id="msg-box" style="flex:1; overflow-y: auto; padding: 15px; background: #f8fafc; display: flex; flex-direction: column; gap: 12px;">
                    ${messages.map(m => `
                        <div style="align-self: ${m.role === 'user' ? 'flex-end' : 'flex-start'}; max-width: 85%;">
                            <div style="padding: 12px 16px; border-radius: ${m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px'}; font-size: 14px; line-height: 1.5; background: ${m.role === 'user' ? CONFIG.primaryColor : 'white'}; color: ${m.role === 'user' ? 'white' : '#1e293b'}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                ${m.content.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: 15px; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 8px;">
                    <input id="message-input" type="text" placeholder="Type your message..." style="flex:1; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; outline: none; font-size: 14px;">
                    <button id="send-btn" style="background: ${CONFIG.primaryColor}; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: opacity 0.2s;">Send</button>
                </div>
            `;

            chatWindow.querySelector('#send-btn').onclick = sendMessage;
            chatWindow.querySelector('#close-chat').onclick = () => {
                chatWindow.style.display = 'none';
                button.style.display = 'block';
            };
            chatWindow.querySelector('#message-input').onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
            
            const msgBox = chatWindow.querySelector('#msg-box');
            msgBox.scrollTop = msgBox.scrollHeight;
        }

        // --- 4. INIT ---
        button.onclick = () => {
            chatWindow.style.display = 'flex';
            button.style.display = 'none';
            render();
            chatWindow.querySelector('#message-input').focus();
        };

        container.appendChild(button);
        container.appendChild(chatWindow);
        document.body.appendChild(container);
    }

    if (document.readyState === 'complete') createChatbot();
    else window.addEventListener('load', createChatbot);
})();