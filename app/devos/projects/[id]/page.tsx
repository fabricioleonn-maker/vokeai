'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Play, RotateCcw, ChevronLeft, 
  Brain, Shield, Activity, Target, 
  Cpu, Terminal, Zap, CheckCircle2,
  Clock, AlertCircle, FileCode, Beaker,
  Layers, Gauge, History, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectDetailPageV3() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/devos/projects/${id}`);
      const data = await res.json();
      setProject(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/devos/projects/${id}/generate-plan`, { method: 'POST' });
      const session = await res.json();
      if (session.id) router.push(`/devos/sessions/${session.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Cpu className="text-[#3B82F6] animate-spin" size={32} />
        <span className="text-[#64748B] text-xs font-mono uppercase tracking-widest">Initialising Kernel v3.0...</span>
      </div>
    </div>
  );

  const health = project.health || { score: 100, riskLevel: 'LOW' };
  const brain = project.brain || { executionPattern: 'SEQUENTIAL', strategyMode: 'SAFE' };

  return (
    <div className="space-y-8 pb-20">
      {/* breadcrumb */}
      <button 
        onClick={() => router.push('/devos/projects')}
        className="flex items-center gap-2 text-[#64748B] hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
      >
        <ChevronLeft size={14} /> Repository / Projects / {project.name}
      </button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="px-2 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[10px] font-black text-[#3B82F6] uppercase tracking-[0.2em]">
              STRATEGIC ASSET
            </div>
            <div className={`px-2 py-0.5 rounded bg-[#0A0A0B] border ${health.score < 50 ? 'border-rose-500/50 text-rose-500' : 'border-[#26262A] text-[#94A3B8]'} text-[10px] font-black uppercase tracking-[0.2em]`}>
              HEALTH: {health.score}%
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">{project.name}</h1>
          <p className="text-[#94A3B8] max-w-2xl font-medium leading-relaxed text-sm">{project.objective}</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={generatePlan}
             disabled={generating}
             className="flex items-center gap-3 px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-sm font-black transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
           >
             <Play size={16} fill="white" />
             {generating ? 'COMPUTING PLAN...' : 'GENERATE PLAN'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Stats (Top Row-like Grid) */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score Block */}
            <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 translate-x-1 group-hover:translate-x-0 transition-transform">
                <Gauge size={64} className="text-[#3B82F6]" />
              </div>
              <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-4">Project Health</h4>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-4xl font-mono font-black text-white">{health.score}%</span>
                <span className={`text-[10px] font-black mb-1.5 ${health.riskLevel === 'LOW' ? 'text-emerald-500' : health.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-rose-500'}`}>
                  / {health.riskLevel}
                </span>
              </div>
              <div className="h-1 w-full bg-[#0A0A0B] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${health.score > 75 ? 'bg-emerald-500' : health.score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                  style={{ width: `${health.score}%` }} 
                />
              </div>
            </div>

            {/* Cognitive Strategy Block */}
            <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 relative overflow-hidden">
               <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-4">Strategy Layer</h4>
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">Execution</span>
                    <span className="text-xs font-mono font-black text-white bg-[#0A0A0B] px-2 py-0.5 rounded border border-[#26262A]">{brain.executionPattern}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">Precision</span>
                    <span className="text-xs font-mono font-black text-[#3B82F6] bg-[#3B82F6]/5 px-2 py-0.5 rounded border border-[#3B82F6]/20">{brain.strategyMode}</span>
                  </div>
                   <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">Coherence</span>
                    <span className="text-xs font-mono font-black text-white">{(brain.coherenceScore || 1.0) * 100}%</span>
                  </div>
               </div>
            </div>

            {/* Next Action Block */}
            <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-2xl p-6 relative flex flex-col justify-between">
               <h4 className="text-[10px] font-black text-[#3B82F6] uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Zap size={10} fill="#3B82F6" /> Next Recommendation
               </h4>
               <div className="py-2">
                 <p className="text-white text-sm font-bold leading-tight">
                    {health.score < 60 ? 'Run RECOVERY replan cycle to stabilize kernel.' : 'Initialise next Session to progress Objective.'}
                 </p>
               </div>
               <button className="flex items-center justify-between w-full mt-4 p-2.5 rounded-xl bg-[#3B82F6] text-white text-[10px] font-black uppercase tracking-widest group">
                 <span>Dispatch Action</span>
                 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>

          {/* Business & Tech Context (V2 legacy but refined) */}
          <div className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#26262A] bg-[#0F0F10] flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Shield size={14} className="text-[#3B82F6]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Cognitive Blueprint</span>
               </div>
               <span className="text-[10px] font-black text-[#475569] tracking-widest">MEM_V{brain.memoryVersion || 1}</span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <div>
                    <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-3">Strategic Goal</h5>
                    <p className="text-white text-sm font-medium leading-relaxed italic border-l-2 border-[#3B82F6] pl-4">
                      "{project.context?.businessGoal || 'High-performance engineering objective.'}"
                    </p>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-3">Technical Constraints</h5>
                    <div className="flex flex-wrap gap-2">
                       {project.context?.constraints?.map((c: string) => (
                         <span key={c} className="px-2 py-1 rounded bg-[#0A0A0B] border border-[#26262A] text-[#64748B] text-[10px] font-bold">{c}</span>
                       )) || <span className="text-[#475569] text-xs">No active constraints.</span>}
                    </div>
                  </div>
               </div>
               <div className="space-y-6">
                   <div>
                    <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-3">Target Stack</h5>
                    <div className="flex flex-wrap gap-2">
                       {project.context?.techStack?.map((s: string) => (
                         <span key={s} className="px-2 py-1 rounded bg-[#3B82F6]/5 border border-[#3B82F6]/20 text-[#3B82F6] text-[10px] font-bold tracking-tight">{s}</span>
                       )) || <span className="text-[#475569] text-xs">Stack discovery active.</span>}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-3">Project Drift</h5>
                    <div className="flex items-center gap-4">
                       <div className="flex-1 h-1.5 bg-[#0A0A0B] rounded-full overflow-hidden">
                          <div className="h-full bg-[#3B82F6]" style={{ width: `${(brain.driftScore || 0) * 100}%` }} />
                       </div>
                       <span className="text-[10px] font-mono text-[#64748B]">{(brain.driftScore || 0).toFixed(2)}</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Layers size={14} className="text-[#3B82F6]" /> Active Cognitive Sessions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {project.sessions?.map((s: any) => (
                <div key={s.id} className="p-4 bg-[#151517] border border-[#26262A] hover:border-[#3B82F6]/50 rounded-2xl transition-all cursor-pointer flex items-center justify-between group">
                   <div className="flex items-center gap-5">
                      <div className="p-3 bg-[#0A0A0B] border border-[#26262A] rounded-xl text-[#3B82F6] group-hover:bg-[#3B82F6] group-hover:text-white transition-all">
                        <Terminal size={18} />
                      </div>
                      <div>
                        <h6 className="text-sm font-bold text-white mb-1 group-hover:text-[#3B82F6] transition-colors">{s.objective}</h6>
                        <div className="flex items-center gap-3 text-[10px] font-black text-[#475569] uppercase tracking-widest">
                           <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {s.status}</span>
                           <span>•</span>
                           <span>V1.{s.iteration || 0}</span>
                           <span>•</span>
                           <span>{s._count?.tasks || 0} Tasks</span>
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                         <div className="text-lg font-mono font-black text-white">{s.progress}%</div>
                         <div className="text-[9px] font-black text-[#475569] uppercase tracking-tighter">Completion</div>
                      </div>
                      <ArrowRight size={18} className="text-[#26262A] group-hover:text-white group-hover:translate-x-1 transition-all" />
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Space: Memory & History */}
        <div className="space-y-6">
           
           <div className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden">
             <div className="p-4 border-b border-[#26262A] bg-[#0F0F10] flex items-center gap-2">
               <History size={14} className="text-[#3B82F6]" />
               <span className="text-[10px] font-black text-white uppercase tracking-widest">Decision Memory</span>
             </div>
             <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                {project.brain?.decisions?.length > 0 ? (
                  project.brain.decisions.map((d: any, idx: number) => (
                    <div key={idx} className="relative pl-5 border-l border-[#26262A] space-y-1">
                       <div className="absolute top-1 -left-[5px] w-2 h-2 rounded-full bg-[#3B82F6]" />
                       <div className="text-[10px] font-black text-[#475569] tracking-tighter uppercase">{d.type}</div>
                       <p className="text-xs font-bold text-white leading-snug">{d.decision}</p>
                       <p className="text-[10px] text-[#64748B] italic leading-tight">{d.reasoning}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                     <Brain size={24} className="mx-auto text-[#26262A] mb-3" />
                     <p className="text-[10px] font-black text-[#475569] uppercase tracking-widest">No decisions recorded yet.</p>
                  </div>
                )}
             </div>
             <div className="p-4 bg-[#0A0A0B] border-t border-[#26262A] text-center">
                <button className="text-[10px] font-black text-[#64748B] hover:text-[#3B82F6] transition-colors uppercase tracking-widest">
                   Access Full Audit Log
                </button>
             </div>
           </div>

           <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 space-y-4">
              <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Operational Limits</h5>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#94A3B8]">Token Quota</span>
                  <span className="text-xs font-mono text-emerald-500">Normal</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#94A3B8]">Concurrency</span>
                  <span className="text-xs font-mono text-white">1/3 Sessions</span>
                </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
