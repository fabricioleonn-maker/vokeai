'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Brain, LayoutDashboard, Database, 
  Terminal, ShieldCheck, Settings, 
  ChevronLeft, ChevronRight, LogOut,
  MessageSquare, FolderKanban, Wand2, ShieldAlert, Activity
} from 'lucide-react';

import { ModuleSelector } from './module-selector';

interface DevOsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { href: '/devos', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/devos/projects', icon: FolderKanban, label: 'Projetos' },
  { href: '/devos/sessions', icon: Database, label: 'Sessões' },
  { href: '/devos/prompt-agent', icon: Wand2, label: 'PromptAgent' },
  { href: '/devos/validator', icon: ShieldAlert, label: 'ValidatorAgent' },
  { href: '/devos/executions', icon: Activity, label: 'Execuções' },
  { href: '/devos/audit', icon: ShieldCheck, label: 'Auditoria' },
  { href: '/devos/settings', icon: Settings, label: 'Configurações' },
];

export function DevOsSidebar({ isOpen, onClose }: DevOsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 ${isOpen ? 'w-64' : 'w-20'} bg-[#0A0A0B] border-r border-[#26262A] transition-all duration-300 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header / Brand */}
        <div className="p-4 border-b border-[#26262A]">
          <ModuleSelector isCollapsed={!isOpen} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/devos' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-[#3B82F6]/5 text-white border-l-2 border-[#3B82F6]' 
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#151517] border-l-2 border-transparent'}
                `}
              >
                <Icon size={18} className={`${isActive ? 'text-[#3B82F6]' : 'text-[#64748B] group-hover:text-[#94A3B8]'}`} />
                {isOpen && <span className="text-sm font-medium tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div className="p-4 border-t border-[#26262A] space-y-3">
          {isOpen && (
            <div className="p-3 rounded-xl bg-[#0F0F10] border border-[#26262A] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                <span>Kernel v1.1</span>
                <span className="text-[#3B82F6]">Secure</span>
              </div>
              <div className="h-1 w-full bg-[#26262A] rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-[#3B82F6]" />
              </div>
            </div>
          )}
          <Link 
            href="/devos/settings"
            className="flex items-center gap-3 w-full px-3 py-2 text-[#94A3B8] hover:text-white transition-colors"
          >
            <Settings size={18} />
            {isOpen && <span className="text-sm font-medium">Settings</span>}
          </Link>
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 w-full px-3 py-2 text-rose-500 hover:text-rose-400 transition-colors"
          >
            <MessageSquare size={18} />
            {isOpen && <span className="text-sm font-medium">Emergency Exit</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
