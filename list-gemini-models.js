
const dotenv = require('dotenv');
dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error('❌ GEMINI_API_KEY não encontrada no .env');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log('🔍 Buscando modelos disponíveis para sua chave...');

fetch(url)
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            console.error('❌ Erro na API:', data.error);
            return;
        }

        if (!data.models) {
            console.log('⚠️ Nenhum modelo retornado. Resposta:', data);
            return;
        }

        console.log('✅ Modelos Disponíveis:');
        const models = data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => `   - ${m.name.replace('models/', '')} (${m.displayName})`);

        console.log(models.join('\n'));
    })
    .catch(err => console.error('❌ Erro de conexão:', err));
