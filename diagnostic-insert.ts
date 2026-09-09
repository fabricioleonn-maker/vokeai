import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  console.log('🔍 Iniciando Diagnóstico de Inserção...');

  try {
    console.log('1. Tentando criar/conectar Plano...');
    const plan = await prisma.plan.upsert({
      where: { slug: 'pro' },
      update: {},
      create: { slug: 'pro', name: 'Pro Plan', tier: 'pro', limits: {} }
    });
    console.log('✅ Plano OK');

    console.log('2. Tentando criar Tenant...');
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'synkra-dev-diag' },
      update: { updatedAt: now },
      create: { 
        slug: 'synkra-dev-diag', 
        name: 'Diag Tenant', 
        planId: plan.id,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    });
    console.log('✅ Tenant OK');

    console.log('3. Tentando criar Usuário...");
    const user = await prisma.user.upsert({
      where: { email: 'diag@synkra.com.br' },
      update: { updatedAt: now },
      create: {
        email: 'diag@synkra.com.br',
        password: 'dummy',
        role: 'admin',
        tenantId: tenant.id,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log('✅ Usuário OK');

  } catch (error: any) {
    console.error('❌ ERRO DETECTADO:', error.message);
    console.error('Dados do Erro:', JSON.stringify(error, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
