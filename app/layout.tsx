import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

// Google Analytics Measurement ID (configurável via env)
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-PLACEHOLDER';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Voke AI - Agentes Inteligentes',
  description: 'Plataforma multi-tenant para orquestração de Agentes de IA',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg'
  },
  openGraph: {
    title: 'Voke AI',
    description: 'Agentes Inteligentes',
    images: ['/og-image.png']
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
      {GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-PLACEHOLDER' && (
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
