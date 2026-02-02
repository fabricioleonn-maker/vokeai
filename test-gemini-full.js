const dotenv = require('dotenv');
dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error('❌ GEMINI_API_KEY não encontrada');
    process.exit(1);
}

// Test 1: List models
console.log('📋 TESTE 1: Listando modelos disponíveis...\n');
fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`)
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            console.error('❌ Erro ao listar modelos:', JSON.stringify(data.error, null, 2));
            return;
        }

        const generateModels = data.models.filter(m =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes('generateContent')
        );

        console.log(`✅ ${generateModels.length} modelos com suporte a generateContent:\n`);
        generateModels.forEach(m => {
            const modelName = m.name.replace('models/', '');
            console.log(`   📌 ${modelName}`);
            console.log(`      Display: ${m.displayName || 'N/A'}`);
            console.log(`      Methods: ${m.supportedGenerationMethods.join(', ')}\n`);
        });

        // Test 2: Try to use the first available model
        if (generateModels.length > 0) {
            const testModel = generateModels[0].name;
            console.log(`\n🧪 TESTE 2: Testando chamada com modelo ${testModel}...\n`);

            return fetch(`https://generativelanguage.googleapis.com/v1/${testModel}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'Say hello in Portuguese' }] }]
                })
            });
        }
    })
    .then(r => r ? r.json() : null)
    .then(data => {
        if (!data) return;

        if (data.error) {
            console.error('❌ Erro na chamada:', JSON.stringify(data.error, null, 2));
        } else {
            console.log('✅ SUCESSO! Resposta:');
            console.log(data.candidates[0].content.parts[0].text);
        }
    })
    .catch(err => console.error('❌ Erro de conexão:', err.message));
