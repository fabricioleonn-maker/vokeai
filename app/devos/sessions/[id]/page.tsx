'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Play, 
  ChevronLeft, 
  Brain, 
  Activity,
  Zap,
  Shield,
  Terminal,
  FileCode,
  RotateCcw,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SessionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/devos/sessions/${id}`);
        const data = await res.json();
        setSession(data);
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleRunLoop = async () => {
    setRunning(true);
    try {
      await fetch('/api/devos/engine/run-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id })
      });
    } catch (err) {
      console.error("Error running loop:", err);
    }
    setRunning(false);
  };

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const res = await fetch(`/api/devos/engine/explain?sessionId=${id}`);
      const data = await res.json();
      setExplanation(data);
    } catch (err) {
      console.error("Error explaining:", err);
    }
    setExplaining(false);
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <Activity size={32} className="text-[#3B82F6] animate-spin" />
          <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Iniciando Kernel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500 pb-4">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between bg-[#151517] border border-[#26262A] p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/devos/sessions')} 
            className="p-2 hover:bg-[#26262A] rounded-lg transition-colors border border-transparent hover:border-[#26262A]"
          >
            <ChevronLeft size={18} className="text-[#94A3B8]" />
          </button>
          <div className="w-10 h-10 rounded-lg bg-[#0A0A0B] border border-[#26262A] flex items-center justify-center">
            <Brain size={20} className="text-[#3B82F6]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest line-clamp-1 max-w-md">{session.objective || session.title}</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] font-mono text-[#64748B]">ITER: {session.currentIteration}/{session.maxIterations}</span>
               <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                  session.status === 'ACTIVE' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 
                  session.status === 'BLOCKED' ? 'bg-amber-500/10 text-amber-500' : 'bg-[#26262A] text-[#94A3B8]'
               }`}>{session.status}</span>
               <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest">Mode: {session.executionMode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExplain}
            className="px-4 py-2 text-[10px] font-bold uppercase text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg border border-[#3B82F6]/20 transition-all"
          >
            {explaining ? 'Analyzing...' : 'Knowledge Inference'}
          </button>
          
          <button 
            onClick={handleRunLoop}
            disabled={running || session.status === 'COMPLETED'}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              running ? 'bg-[#26262A] text-[#94A3B8] animate-pulse border border-[#26262A]' : 
              'bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-lg shadow-[#3B82F6]/20'
            }`}
          >
            {running ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} />}
            {session.executionMode === 'auto' ? 'RUN AUTO LOOP' : 'EXECUTE CYCLE'}
          </button>
        </div>
      </div>

      {/* Main Cognitive Layout (3-Column) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Column 1: Planner (Tasks) */}
        <section className="lg:col-span-3 bg-[#151517] border border-[#26262A] rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#26262A] bg-[#1A1A1C]/50 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#3B82F6]" />
              Cognitive Plan
            </h3>
            <span className="text-[10px] font-mono text-[#64748B] opacity-70">{session.tasks?.length || 0} Nodes</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
            {session.tasks?.map((task: any, i: number) => (
              <div key={task.id} className={`p-4 rounded-xl border transition-all ${
                task.status === 'COMPLETED' ? 'bg-[#0F0F10] border-[#26262A]/50 opacity-50' :
                task.status === 'IN_PROGRESS' || task.status === 'ACTIVE' ? 'bg-[#3B82F6]/5 border-[#3B82F6]/30' : 'bg-[#0A0A0B] border-[#26262A]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-[#3B82F6]">T_0{i+1}</span>
                  <span className={`text-[9px] font-black uppercase ${
                    task.status === 'COMPLETED' ? 'text-emerald-500' : 
                    task.status === 'BLOCKED' ? 'text-amber-500' : 'text-[#64748B]'
                  }`}>{task.status}</span>
                </div>
                <h4 className={`text-xs font-bold leading-tight ${task.status === 'COMPLETED' ? 'text-slate-400' : 'text-slate-200'}`}>
                  {task.title}
                </h4>
                {task.priority === 'CRITICAL' && (
                  <div className="mt-3 text-[9px] font-black text-[#3B82F6] uppercase flex items-center gap-1 opacity-70">
                    <Zap size={10} fill="currentColor" /> CRITICAL_PATH
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Column 2: Executor (Processing Area) */}
        <section className="lg:col-span-5 bg-[#151517] border border-[#26262A] rounded-xl flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-[#26262A] bg-[#1A1A1C]/50 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-[#3B82F6]" />
              Kernel Execution
            </h3>
            <div className={`w-2 h-2 rounded-full ${running ? 'bg-[#3B82F6] animate-pulse' : 'bg-[#26262A]'}`} />
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col relative z-10">
            <AnimatePresence mode="wait">
              {explanation ? (
                <motion.div 
                  key="explanation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#3B82F6]/20">
                     <div className="text-[10px] font-black text-[#3B82F6] uppercase mb-4 flex items-center gap-2">
                        <Brain size={12} /> Decision Reasoning
                     </div>
                     <p className="text-sm font-medium text-slate-300 italic leading-relaxed">"{explanation.summary}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#26262A]">
                      <div className="text-[9px] font-bold text-[#64748B] uppercase mb-1">Target Task</div>
                      <div className="text-xs font-bold text-white line-clamp-1">{explanation.nextTaskTitle}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#26262A]">
                      <div className="text-[9px] font-bold text-[#64748B] uppercase mb-1">Confidence</div>
                      <div className="text-xs font-bold text-[#3B82F6]">{Math.round(explanation.confidence * 100)}%</div>
                    </div>
                  </div>
                  <button onClick={() => setExplanation(null)} className="text-[10px] font-bold text-[#64748B] hover:text-[#3B82F6] uppercase transition-colors flex items-center gap-2">
                    <RotateCcw size={10} /> Reset Execution View
                  </button>
                </motion.div>
              ) : (
                <motion.div key="execution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col space-y-6">
                  {session.tasks?.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'ACTIVE').map((task: any) => (
                    <div key={task.id} className="space-y-6">
                       <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-[#26262A] relative">
                          <div className="flex items-center gap-2 text-[#3B82F6] mb-4">
                            <Terminal size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Active Suggestion</span>
                          </div>
                          <p className="text-sm font-medium text-slate-200 leading-relaxed mb-6">{task.suggestion || 'Analyzing next possible move to achieve objective...'}</p>
                          
                          {task.files && task.files.length > 0 && (
                            <div className="pt-4 border-t border-[#26262A]/50 space-y-3">
                              <span className="text-[10px] font-black text-[#64748B] uppercase tracking-tighter">Affected Filesystem Nodes</span>
                              <div className="flex flex-wrap gap-2">
                                {task.files.map((f: string) => (
                                  <div key={f} className="flex items-center gap-2 px-2 py-1 bg-[#151517] border border-[#26262A] rounded text-[10px] font-mono text-[#3B82F6]">
                                    <FileCode size={12} />
                                    {f.split('/').pop()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )) || (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                       <Cpu size={48} className={running ? 'animate-spin' : ''} />
                       <p className="text-[11px] font-black uppercase tracking-widest uppercase">Engine Idle</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Column 3: Auditor (Logs & Shield) */}
        <section className="lg:col-span-4 bg-[#151517] border border-[#26262A] rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#26262A] bg-[#1A1A1C]/50 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} className="text-[#3B82F6]" />
              Engineering Logs
            </h3>
            <span className="text-[9px] font-black text-rose-500 uppercase animate-pulse">Live Stream</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#0A0A0B] font-mono text-[11px] space-y-4 thin-scrollbar">
            {session.auditLogs?.map((log: any) => (
              <div key={log.id} className="group border-b border-[#26262A]/30 pb-3 last:border-0 hover:bg-white/[0.02] transition-all px-2 rounded">
                <div className="flex items-center justify-between mb-1.5 opacity-50 text-[9px]">
                  <span className={`${log.status === 'error' ? 'text-rose-500' : 'text-[#3B82F6]'} font-bold`}>
                    [{log.actor.toUpperCase()}]
                  </span>
                  <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-200 leading-relaxed font-bold mb-1">
                  {log.action.replace(/_/g, ' ')}
                </div>
                {log.reason && (
                  <p className="text-[10px] text-[#94A3B8] leading-tight italic">
                    {log.reason}
                  </p>
                )}
              </div>
            ))}
            {(!session.auditLogs || session.auditLogs.length === 0) && (
              <div className="text-center py-10 opacity-30 italic text-[10px]">
                Awaiting kernel telemetry...
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
