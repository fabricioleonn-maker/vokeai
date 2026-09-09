import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const secret = process.env.NEXTAUTH_SECRET;
const url = process.env.NEXTAUTH_URL;

console.log(`[AUTH-DEBUG] System Init - URL: ${url} | Secret Hash: ${secret?.substring(0, 4)}...${secret?.substring(secret.length - 4)}`);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log(`[AUTH-DEBUG] JWT Callback - Updating token for user: ${user.id}`);
        token.id = user.id;
        token.role = (user as { role?: string })?.role;
        token.tenantId = (user as { tenantId?: string })?.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as { id?: string }).id = token?.id as string;
        (session.user as { role?: string }).role = token?.role as string;
        (session.user as { tenantId?: string }).tenantId = token?.tenantId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login'
  }
};
