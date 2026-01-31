'use client';

import Image from 'next/image';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot, LayoutDashboard, Users, CreditCard, Cpu, Plug,
  FileText, ChevronRight, Menu, X, LogOut, MessageSquare, Home, Brain
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tenants', icon: Users, label: 'Tenants' },
  { href: '/admin/plans', icon: CreditCard, label: 'Planos' },
  { href: '/admin/agents', icon: Cpu, label: 'Agentes' },
  { href: '/admin/personality', icon: Brain, label: 'Personalidade IA' },
  { href: '/admin/integrations', icon: Plug, label: 'Integrações' },
  { href: '/admin/audit', icon: FileText, label: 'Auditoria' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/25 lg:hidden"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-center">
            <Link href="/" className="flex items-center justify-center w-full">
              <div className="relative h-20 w-full">
                <Image
                  src="/logo_voke_ai_transparent.png"
                  alt="Voke AI"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {menuItems?.map((item) => {
              const isActive = pathname === item?.href ||
                (item?.href !== '/admin' && pathname?.startsWith?.(item?.href ?? ''));
              return (
                <Link
                  key={item?.href}
                  href={item?.href ?? '/admin'}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'bg-cyan-50 text-cyan-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-500' : ''}`} />
                  <span>{item?.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-cyan-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-3 border-t border-gray-100 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all"
            >
              <Home className="w-5 h-5" />
              <span>Início</span>
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 rounded-xl transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Abrir Chat</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-56 min-h-screen">
        <div className="p-5 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
