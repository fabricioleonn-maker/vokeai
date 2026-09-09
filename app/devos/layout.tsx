import { DevOsLayout } from '@/components/layout/devos-layout';

export default function DevOsRootLayout({ children }: { children: React.ReactNode }) {
  return <DevOsLayout>{children}</DevOsLayout>;
}
