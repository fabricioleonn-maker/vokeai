import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@synkra.com.br' }
  });
  console.log(user ? 'USER_EXISTS' : 'USER_NOT_FOUND');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
