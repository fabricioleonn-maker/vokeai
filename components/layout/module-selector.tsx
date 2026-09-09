'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModuleStore } from '@/lib/module-store';
import { MODULE_CONFIGS, ModuleKey } from '@/lib/module-config';
import { 
  ChevronDown, 
  LayoutDashboard, 
  Brain, 
  Shield, 
  Zap,
  Check
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

export function ModuleSelector({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const { activeModule, setActiveModule } = useModuleStore();
  const [open, setOpen] = useState(false);

  const currentConfig = MODULE_CONFIGS[activeModule] || MODULE_CONFIGS.admin;

  const handleModuleSelect = (key: ModuleKey) => {
    setActiveModule(key);
    router.push(MODULE_CONFIGS[key].route);
    setOpen(false);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'layout-dashboard': return <LayoutDashboard size={18} />;
      case 'brain': return <Brain size={18} />;
      default: return <Zap size={18} />;
    }
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button className={`flex items-center gap-3 w-full rounded-2xl transition-all group outline-none border ${
          activeModule === 'devos' 
          ? 'bg-transparent border-[#26262A] hover:border-[#3B82F6]/30' 
          : 'bg-gray-50 border-gray-100 hover:border-cyan-500/30'
        } ${isCollapsed ? 'p-2 justify-center' : 'p-3'}`}>
          <div className={`rounded-xl flex items-center justify-center shrink-0 ${
            activeModule === 'devos' 
            ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20' 
            : 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
          } ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
            {getIcon(currentConfig.icon)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 text-left overflow-hidden">
              <div className={`text-[9px] font-black uppercase tracking-tighter ${
                activeModule === 'devos' ? 'text-[#64748b]' : 'text-gray-400'
              }`}>Módulo</div>
              <div className={`text-sm font-bold truncate leading-tight ${
                activeModule === 'devos' ? 'text-white' : 'text-slate-800'
              }`}>{currentConfig.name}</div>
            </div>
          )}
          {!isCollapsed && (
            <ChevronDown size={14} className={`transition-transform duration-300 ${
              activeModule === 'devos' ? 'text-[#64748b]' : 'text-gray-400'
            } ${open ? 'rotate-180' : ''}`} />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="z-50 min-w-[220px] bg-[#0F0F10] border border-[#26262A] p-2 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          sideOffset={8}
        >
          {Object.entries(MODULE_CONFIGS).map(([key, config]) => (
            <DropdownMenu.Item
              key={key}
              onClick={() => handleModuleSelect(key as ModuleKey)}
              className="flex items-center gap-3 p-3 rounded-xl cursor-not-allowed hover:bg-[#151517] outline-none group cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${key === 'devos' ? 'text-blue-400 bg-blue-400/10' : 'text-cyan-400 bg-cyan-400/10'}`}>
                {getIcon(config.icon)}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{config.name}</div>
                <div className="text-[10px] text-[#94A3B8] line-clamp-1">{config.description}</div>
              </div>
              {activeModule === key && (
                <Check size={14} className="text-[#3B82F6]" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
