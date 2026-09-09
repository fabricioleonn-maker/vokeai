'use client';

import { ReactNode, useState } from 'react';
import { DevOsSidebar } from '@/components/layout/devos-sidebar';
import {
  X, Menu, Brain, Settings, MessageSquare,
  LayoutDashboard, Activity, Database, Shield, Zap,
  Bot, ChevronRight
} from 'lucide-react';

interface DevOsLayoutProps {
  children: ReactNode;
}

export function DevOsLayout({ children }: DevOsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans"> {/* Changed background and text color, removed selection color */}
      {/* Sidebar */}
      <DevOsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'pl-64' : 'pl-20'} min-h-screen`}> {/* Changed ml- to pl- and removed p-5 lg:p-10 */}
        {/* Header/Nav */}
        <header className="h-16 border-b border-[#26262A] bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[#151517] rounded-lg transition-colors border border-[#26262A]"
            >
              <Brain size={20} className="text-[#3B82F6]" /> {/* New button with Brain icon and blue color */}
            </button>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase tracking-widest">DevOS Console</h1>
              <p className="text-[11px] text-[#94A3B8] font-medium">Sistema operacional de execução inteligente</p>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-5 lg:p-10"> {/* Added padding back to inner div */}
          {children}
        </div>
      </main>

      {/* Overlay - Removed as per new structure */}

      {/* Global CSS Overrides for DevOS (Inject into page) */}
      <style jsx global>{`
        body {
          background-color: #0A0A0B !important; /* Changed body background color */
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0A0A0B; /* Changed scrollbar track background */
        }
        ::-webkit-scrollbar-thumb {
          background: #27272A;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #3B82F6;
        }
      `}</style>
    </div>
  );
}
