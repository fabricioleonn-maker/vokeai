
require('dotenv').config();

console.log('🔍 Diagnosticando Variáveis de Ambiente de IA:');
console.log('---------------------------------------------');

const provider = process.env.LLM_PROVIDER;
const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

console.log(`1. LLM_PROVIDER: ${provider ? `'${provider}'` : '(não definido - auto-detecção ativada)'}`);

console.log('2. Chaves de API:');
if (geminiKey) {
    console.log(`   ✅ GEMINI_API_KEY: Encontrada (Termina em ...${geminiKey.slice(-4)})`);
} else {
    console.log('   ❌ GEMINI_API_KEY: NÃO ENCONTRADA');
}

if (openaiKey) {
    console.log(`   ✅ OPENAI_API_KEY: Encontrada (Termina em ...${openaiKey.slice(-4)})`);
} else {
    console.log('   ❌ OPENAI_API_KEY: NÃO ENCONTRADA');
}

console.log('\n3. Lógica de Seleção Atual:');
let selected = provider;
if (!selected) {
    if (geminiKey) selected = 'gemini';
    else if (openaiKey) selected = 'openai';
    else selected = 'ollama';
}
console.log(`   👉 O sistema escolheria: [${selected.toUpperCase()}]`);
