async function testLLM() {
    const API_KEY = "6617f23f5d56466cb492698ace78b3ff"; // Copiado do .env

    console.log('🤖 Testando Conexão com LLM (Abacus.AI - Fetch Nativo)...');
    console.log('🔑 Key:', API_KEY.substring(0, 5) + '...');

    try {
        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Say 'Hello World' in Portuguese." }
                ],
                max_tokens: 100,
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            console.error('❌ Erro HTTP:', response.status, response.statusText);
            const text = await response.text();
            console.error('   Detalhes:', text);
            return;
        }

        const data = await response.json();
        console.log('✅ Sucesso!');
        console.log('📝 Resposta:', data.choices[0].message.content);

    } catch (error) {
        console.error('❌ Erro de Rede/Execução:', error);
    }
}

testLLM();
