
const fetch = require('node-fetch');

async function testChat() {
    try {
        const response = await fetch('http://localhost:3000/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Olá, teste de conexão",
                tenantId: "cm6h7m6v00000uxm35q9y3y3b", // Sample ID from previous debug
                channel: "web",
                isTestMode: true
            })
        });

        const data = await response.json();
        console.log('STATUS:', response.status);
        console.log('DATA:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('FETCH FAILED:', e);
    }
}

testChat();
