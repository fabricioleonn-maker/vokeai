'use client';

import { useState } from 'react';
import { 
  Settings, Shield, Zap, Cpu, 
  Database, Bell, Save, RefreshCcw,
  CheckCircle2, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setStatus('Configurações do Kernel persistidas.');
      setTimeout(() => setStatus(null), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <header>
        <div className="flex items-center gap-2 text-[#3B82F6] mb-2">
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Kernel Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações do DevOS</h1>
        <p className="text-[#94A3B8] text-sm mt-1 font-medium">Controle de parâmetros globais, estratégia de execução e limites de tenant.</p>
      </header>

      <div className="space-y-6">
        {/* Orchestration Section */}
        <section className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#26262A] bg-[#0F0F10] flex items-center gap-2">
            <Zap size={16} className="text-[#3B82F6]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest">Orquestração Cognitiva</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-8">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Modo de Estratégia Default</h3>
                <p className="text-[11px] text-[#64748B]">Define o equilíbrio entre velocidade e precisão para novos projetos.</p>
              </div>
              <select className="bg-[#0A0A0B] border border-[#26262A] text-white text-xs font-bold p-2.5 rounded-xl outline-none focus:border-[#3B82F6]">
                <option>SAFE (Default)</option>
                <option>FAST (Performance)</option>
                <option>DEEP (Thorough)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between gap-8 pt-6 border-t border-[#26262A]">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Parallel Execution</h3>
                <p className="text-[11px] text-[#64748B]">Permite que sessões independentes rodem em paralelo no Global Scheduler.</p>
              </div>
              <div className="w-12 h-6 bg-[#3B82F6] rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all" />
              </div>
            </div>
          </div>
        </section>

        {/* Security & Access Section */}
        <section className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#26262A] bg-[#0F0F10] flex items-center gap-2">
            <Shield size={16} className="text-[#3B82F6]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest">Segurança & Governança</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-8">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Audit Retention</h3>
                <p className="text-[11px] text-[#64748B]">Tempo de permanência dos logs de decisão imutáveis no ledger.</p>
              </div>
              <select className="bg-[#0A0A0B] border border-[#26262A] text-white text-xs font-bold p-2.5 rounded-xl outline-none focus:border-[#3B82F6]">
                <option>90 Dias</option>
                <option>1 Ano</option>
                <option>Indeterminado</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between gap-8 pt-6 border-t border-[#26262A]">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Tenant Quota (AI Tokens)</h3>
                <p className="text-[11px] text-[#64748B]">Limite mensal de processamento cognitivo para este tenant.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-white">5,000,000</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Unlimited Plan</p>
              </div>
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex items-center justify-between p-6 bg-[#0F0F10] border border-[#26262A] rounded-2xl shadow-2xl">
          <div className="flex items-center gap-2">
            {status && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-emerald-500 text-xs font-bold"
              >
                <CheckCircle2 size={14} />
                {status}
              </motion.div>
            )}
          </div>
          <div className="flex gap-4">
             <button className="flex items-center gap-2 px-6 py-2.5 hover:bg-[#26262A] text-[#94A3B8] rounded-xl text-xs font-bold transition-all">
                <RefreshCcw size={16} />
                RESTAURAR PADRÃO
             </button>
             <button 
               onClick={handleSave}
               disabled={saving}
               className="flex items-center gap-2 px-8 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50"
             >
               {saving ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
               {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
