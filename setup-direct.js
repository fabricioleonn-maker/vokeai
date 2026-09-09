const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const hashedAdminPassword = await bcrypt.hash('Synkra@2026', 12);

  console.log('⚡ Running Direct JS User Injection...');

  try {
    // 1. Plan
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
    console.log('✅ Plan Created');

    // 2. Tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'synkra-dev' },
      update: { updatedAt: now },
      create: {
        slug: 'synkra-dev',
        name: 'Synkra Development',
        planId: plan.id,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    });
    console.log('✅ Tenant Created');

    // 3. User
    const user = await prisma.user.upsert({
      where: { email: 'dev@synkra.com.br' },
      update: { updatedAt: now, tenantId: tenant.id },
      create: {
        email: 'dev@synkra.com.br',
        password: hashedAdminPassword,
        name: 'Voke Developer',
        role: 'admin',
        tenantId: tenant.id,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log('✅ USER CREATED:', user.email);

  } catch (err) {
    console.error('❌ Insertion Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
