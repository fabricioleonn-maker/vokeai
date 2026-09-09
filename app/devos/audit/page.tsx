'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, Brain, History, 
  Fingerprint, Search, Filter,
  FileText, ArrowDownRight, AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/devos/audit')
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'ARCHITECTURE': return <ShieldCheck className="text-emerald-500" size={16} />;
      case 'STRATEGY': return <Brain className="text-[#3B82F6]" size={16} />;
      case 'REPLAN': return <History className="text-amber-500" size={16} />;
      case 'RISK': return <AlertTriangle className="text-rose-500" size={16} />;
      default: return <FileText className="text-slate-500" size={16} />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <header>
        <div className="flex items-center gap-2 text-[#3B82F6] mb-2">
          <Fingerprint size={20} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Immutable Ledger</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Registro de Auditoria</h1>
        <p className="text-[#94A3B8] text-sm mt-1 font-medium">Log persistente de todas as decisões cognitivas tomadas pelo kernel DevOS.</p>
      </header>

      {/* Audit Registry */}
      <div className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[120px] pointer-events-none" />

        <div className="p-5 border-b border-[#26262A] bg-[#0F0F10]/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0B] border border-[#26262A] rounded-xl text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
            <Search size={14} className="text-[#475569]" />
            <span>Pesquisar Eventos</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Filtrar por:</span>
            <div className="flex gap-2">
              {['Tudo', 'Decisões', 'Riscos', 'Arquitetura'].map(f => (
                <button key={f} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${f === 'Tudo' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]' : 'border-[#26262A] text-[#64748B] hover:text-white hover:border-[#3B82F6]/50'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#26262A]">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="p-6 h-20 animate-pulse bg-white/5" />
            ))
          ) : logs.length === 0 ? (
            <div className="p-20 text-center">
              <ShieldCheck className="mx-auto text-[#26262A] mb-4" size={48} />
              <p className="text-[#64748B] text-xs font-bold uppercase tracking-[0.1em]">Ledger Limpo. Nenhuma decisão estratégica pendente.</p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={log.id} className="group">
                <div 
                  className={`p-6 flex items-center justify-between cursor-pointer transition-all ${expandedId === log.id ? 'bg-[#0F0F10]' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`p-2 rounded-lg bg-[#0A0A0B] border border-[#26262A] shadow-inner`}>
                        {getLogIcon(log.type)}
                      </div>
                      <div className="w-[1px] h-4 bg-[#26262A]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white tracking-tight">{log.reasoning.split('\n')[0].slice(0, 60)}...</span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#26262A] text-[#3B82F6]">{log.type}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-[#475569] font-bold tracking-widest uppercase">Context: {log.brain?.project?.name || 'Kernel'}</span>
                        <span className="text-[10px] text-[#475569] font-medium">• {new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-[#475569] transition-transform duration-300 ${expandedId === log.id ? 'rotate-180' : ''}`} />
                </div>
                
                <AnimatePresence>
                  {expandedId === log.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-[#0A0A0B]/50"
                    >
                      <div className="p-6 border-t border-[#26262A]/50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Brain size={12} className="text-[#3B82F6]" />
                              Cognitive Rationale
                            </h4>
                            <p className="text-xs text-[#94A3B8] leading-relaxed font-medium bg-[#0A0A0B] p-4 rounded-xl border border-[#26262A]">
                              {log.reasoning}
                            </p>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <ArrowDownRight size={12} className="text-[#3B82F6]" />
                              System Impact
                            </h4>
                            <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#26262A] space-y-3">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-[#64748B]">Security Level</span>
                                <span className="text-emerald-500">Verified</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-[#64748B]">Resource Path</span>
                                <span className="text-white font-mono break-all">{log.impact || `/kernel/orchestration/${log.id.slice(0, 8)}`}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
