import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏗️ Criando usuário e tenant com suporte a campos obrigatórios...');

  const hashedAdminPassword = await bcrypt.hash('Synkra@2026', 12);
  const now = new Date();

  try {
    // Usamos connectOrCreate para garantir que não haja duplicidade e resolver IDs corretamente
    const result = await prisma.user.upsert({
      where: { email: 'dev@synkra.com.br' },
      update: {
        password: hashedAdminPassword,
        updatedAt: now
      },
      create: {
        email: 'dev@synkra.com.br',
        password: hashedAdminPassword,
        name: 'Voke Developer',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
        tenant: {
          connectOrCreate: {
            where: { slug: 'synkra-dev' },
            create: {
              slug: 'synkra-dev',
              name: 'Synkra Development',
              status: 'active',
              createdAt: now,
              updatedAt: now,
              plan: {
                connectOrCreate: {
                  where: { slug: 'pro' },
                  create: {
                    slug: 'pro',
                    name: 'Pro Plan',
                    tier: 'pro',
                    limits: {}
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('✅ USUÁRIO PRONTO PARA LOGIN:', result.email);
    console.log('🚀 Pode clicar em Entrar agora!');

  } catch (error) {
    console.error('❌ Erro Fatal no Setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
