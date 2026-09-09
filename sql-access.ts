import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Injetando acesso via SQL Direto...');

  const hashedAdminPassword = await bcrypt.hash('Synkra@2026', 12);
  const now = new Date().toISOString();

  try {
    // 1. Criar Plano (se não existir)
    await prisma.$executeRaw`
      INSERT INTO "Plan" (id, slug, name, tier, limits, "updatedAt")
      VALUES ('cl_pro_plan', 'pro', 'Pro Plan', 'pro', '{}'::jsonb, ${now}::timestamp)
      ON CONFLICT (slug) DO NOTHING;
    `;

    // 2. Criar Tenant
    await prisma.$executeRaw`
      INSERT INTO "Tenant" (id, slug, name, status, "planId", "createdAt", "updatedAt")
      VALUES ('cl_dev_tenant', 'synkra-dev', 'Synkra Dev', 'active', 'cl_pro_plan', ${now}::timestamp, ${now}::timestamp)
      ON CONFLICT (slug) DO NOTHING;
    `;

    // 3. Criar Usuário
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, password, name, role, "tenantId", "createdAt", "updatedAt")
      VALUES ('cl_dev_user', 'dev@synkra.com.br', ${hashedAdminPassword}, 'Voke Developer', 'admin', 'cl_dev_tenant', ${now}::timestamp, ${now}::timestamp)
      ON CONFLICT (email) DO UPDATE SET password = ${hashedAdminPassword}, "tenantId" = 'cl_dev_tenant';
    `;

    console.log('✅ USUÁRIO CRIADO COM SUCESSO! Tente logar agora.');
  } catch (err) {
    console.error('❌ Falha na Injeção SQL:', err);
  }
}

main().finally(() => prisma.$disconnect());
