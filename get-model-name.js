const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const key = process.env.GEMINI_API_KEY;

async function test() {
    try {
        // List all models
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        const listData = await listResponse.json();

        // Save to file for inspection
        fs.writeFileSync('gemini-models-list.json', JSON.stringify(listData, null, 2));
        console.log('✅ Lista de modelos salva em: gemini-models-list.json');

        // Find generateContent models
        const models = listData.models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent')
        );

        console.log(`\n📌 Modelos disponíveis para generateContent (${models.length}):`);
        models.forEach((m, i) => {
            const name = m.name.replace('models/', '');
            console.log(`${i + 1}. ${name}`);
        });

        if (models.length > 0) {
            const firstModel = models[0].name.replace('models/', '');
            console.log(`\n✅ Usando modelo: ${firstModel}`);
            console.log(`📝 Cole isso no código: "${firstModel}"`);
        }
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

test();
