'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Brain, 
  Activity,
  ArrowRight,
  Shield,
  Clock,
  Terminal,
  Database,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DevOsSessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/devos/sessions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data);
          setError(null);
        } else {
          setSessions([]);
          setError("Invalid cognitive payload received.");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching sessions:", err);
        setError("Connection failure to Kernel API.");
        setLoading(false);
      });
  }, []);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { color: '#22C55E', label: 'Completed' };
      case 'ACTIVE': return { color: '#3B82F6', label: 'Active' };
      case 'BLOCKED': return { color: '#F59E0B', label: 'Blocked' };
      case 'FAILED': return { color: '#EF4444', label: 'Failed' };
      default: return { color: '#94A3B8', label: 'Offline' };
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#26262A] pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest">
            Cognitive Registry
          </h1>
          <p className="mt-1 text-[#64748B] text-[11px] font-medium uppercase tracking-wider flex items-center gap-2">
            <Terminal size={12} className="text-[#3B82F6]" />
            History of Autonomous Process Execution
          </p>
        </div>
        
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-[#3B82F6]/10 group">
          <Plus size={16} />
          <span>INITIALIZE NEW SESSION</span>
          <ArrowRight size={14} className="ml-1 opacity-50 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </header>

      {/* Sessions Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session, idx) => {
          const status = getStatusInfo(session.status);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={session.id} 
              className="group bg-[#151517] border border-[#26262A] rounded-xl hover:border-[#3B82F6]/50 transition-all flex flex-col overflow-hidden"
            >
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0A0A0B] border border-[#26262A] flex items-center justify-center group-hover:border-[#3B82F6]/30 transition-colors">
                      <Brain size={18} className="text-[#3B82F6]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest line-clamp-1">{session.objective}</h3>
                      <p className="text-[10px] font-mono text-[#64748B] mt-0.5">ID: {session.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#26262A] flex items-center gap-1.5" style={{ color: status.color }}>
                      <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: status.color }} />
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-[9px] font-black text-[#64748B] uppercase mb-2">
                    <span>Task Progress</span>
                    <span className="text-white">{session.progress}%</span>
                  </div>
                  <div className="h-1 bg-[#0A0A0B] rounded-full overflow-hidden border border-[#26262A]/50">
                    <div 
                      className="h-full bg-[#3B82F6] transition-all duration-1000" 
                      style={{ width: `${session.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2 rounded bg-[#0A0A0B]/50 border border-[#26262A]/50 text-[10px] flex items-center gap-2">
                    <Clock size={12} className="text-[#64748B]" />
                    <span className="text-[#94A3B8] font-bold">{new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0A0A0B]/50 border border-[#26262A]/50 text-[10px] flex items-center gap-2">
                    <Activity size={12} className="text-[#64748B]" />
                    <span className="text-[#94A3B8] font-bold">Iter: {session.currentIteration}</span>
                  </div>
                </div>
              </div>

              <Link 
                href={`/devos/sessions/${session.id}`}
                className="p-3 bg-[#1A1A1C] border-t border-[#26262A] flex items-center justify-center gap-2 text-[10px] font-black text-[#94A3B8] uppercase hover:text-white hover:bg-[#3B82F6] transition-all"
              >
                Open Session Console
                <ArrowRight size={12} />
              </Link>
            </motion.div>
          );
        })}

        {loading && (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-[#151517] border border-[#26262A] rounded-xl h-64 animate-pulse" />
          ))
        )}

        {error && (
          <div className="col-span-full py-20 bg-[#151517] border border-rose-500/20 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#0A0A0B] border border-rose-500/30 flex items-center justify-center mb-4">
              <AlertCircle size={24} className="text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cognitive Link Failure</h3>
            <p className="mt-2 text-[11px] text-[#64748B] font-medium max-w-xs">{error}</p>
          </div>
        )}

        {sessions.length === 0 && !loading && !error && (
          <div className="col-span-full py-20 bg-[#151517] border border-dashed border-[#26262A] rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#0A0A0B] border border-[#26262A] flex items-center justify-center mb-4">
              <Database size={24} className="text-[#26262A]" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">No Active Registry</h3>
            <p className="mt-2 text-[11px] text-[#64748B] font-medium max-w-xs">Initialize a cognitive process to begin historical tracking in the DevOS Kernel.</p>
          </div>
        )}
      </div>
    </div>
  );
}
