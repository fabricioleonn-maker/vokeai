import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Setup de Acesso Manual...');

  // 1. Criar Plan (Obrigatório para o Tenant)
  const plan = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      slug: 'pro',
      name: 'Pro Plan',
      tier: 'pro',
      limits: {}
    }
  });

  // 2. Criar Tenant (Obrigatório para o Synkra)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'synkra-dev' },
    update: { 
      planId: plan.id,
      updatedAt: new Date()
    },
    create: {
      slug: 'synkra-dev',
      name: 'Synkra Development',
      planId: plan.id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  console.log('✅ Tenant Criado:', tenant.id);

  // 3. Criar Usuário Admin
  const hashedAdminPassword = await bcrypt.hash('Synkra@2026', 12);
  const user = await prisma.user.upsert({
    where: { email: 'dev@synkra.com.br' },
    update: { 
      tenantId: tenant.id,
      updatedAt: new Date()
    },
    create: {
      email: 'dev@synkra.com.br',
      password: hashedAdminPassword,
      name: 'Voke Developer',
      role: 'admin',
      tenantId: tenant.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  console.log('✅ Usuário Criado:', user.email);
  console.log('\n🎉 Setup concluído! Use as credenciais acima no login.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
