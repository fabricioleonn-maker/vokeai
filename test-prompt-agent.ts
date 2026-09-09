import { PromptAgent } from './lib/devos/agents/prompt-agent';
import { prisma } from './lib/db';

async function testPromptAgent() {
  console.log('🧪 Iniciando Teste do PromptAgent...');

  const input = {
    intent: 'quero testar o agente agora',
    context: {
      project: 'teste',
      module: 'teste',
      environment: 'dev' as const,
    },
    tenantId: 'synkra-dev', // ID criado no passo anterior
    userId: 'diag-user-id',
  };

  try {
    const result = await PromptAgent.process(input);
    console.log('📦 Resultado do Processamento:', JSON.stringify(result, null, 2));

    if (result.status === 'success') {
      console.log('✅ TESTE BEM-SUCEDIDO');
    } else {
      console.error('❌ TESTE FALHOU:', result.error);
    }
  } catch (err: any) {
    console.error('💥 EXPLODIU:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testPromptAgent();
