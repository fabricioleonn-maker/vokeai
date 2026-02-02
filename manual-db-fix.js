
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🛠️ Iniciando Correção Manual do Banco de Dados...');

    try {
        // 1. Corrigir tabela TenantIntegrationConfig
        console.log('1️⃣ Adicionando coluna "config" em TenantIntegrationConfig...');
        await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TenantIntegrationConfig' AND column_name='config') THEN 
          ALTER TABLE "TenantIntegrationConfig" ADD COLUMN "config" JSONB DEFAULT '{}'; 
        END IF; 
      END $$;
    `);

        // 2. Corrigir tabela AgentNode (se precisar)
        console.log('2️⃣ Verificando coluna "config" em AgentNode...');
        await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AgentNode' AND column_name='config') THEN 
          ALTER TABLE "AgentNode" ADD COLUMN "config" JSONB DEFAULT '{}'; 
        END IF; 
      END $$;
    `);

        // 3. Criar tabelas do PromoHunter (se não existirem)
        console.log('3️⃣ Criando tabelas do PromoHunter...');

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PromoSource" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "baseUrl" TEXT,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "config" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PromoSource_pkey" PRIMARY KEY ("id")
      );
    `);

        // ... (Outras tabelas poderiam vir aqui, mas vamos focar no erro P2022 principal primeiro)

        console.log('✅ Correções aplicadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao aplicar SQL:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
