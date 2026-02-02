const dotenv = require('dotenv');
dotenv.config();

async function testOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('Testing OpenAI with key:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Say hello in Portuguese' }],
                max_tokens: 10
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('✅ OpenAI Success:', data.choices[0].message.content);
        } else {
            console.error('❌ OpenAI Error:', data.error);
        }
    } catch (err) {
        console.error('❌ Fetch Error:', err.message);
    }
}

testOpenAI();
