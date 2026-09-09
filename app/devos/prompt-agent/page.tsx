'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Wand2, AlertTriangle, CheckCircle2, 
  Shield, CornerRightDown, Loader, 
  ChevronDown, ChevronUp, Copy, Check,
  MessageSquare, Users, Activity, Play, Pause, XCircle, Send
} from 'lucide-react';
import type { PromptAgentOutput } from '@/lib/devos/agents/prompt-agent.types';

const RISK_STYLES = {
  low:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
  medium: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: AlertTriangle },
  high:   { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     icon: AlertTriangle },
};

type ViewState = 'DISCOVERY' | 'PLANNING' | 'ORCHESTRATING' | 'EXECUTING';

export default function PromptAgentPage() {
  const [view, setView] = useState<ViewState>('DISCOVERY');
  const [intent, setIntent] = useState('');
  const [project, setProject] = useState('Synkra');
  const [module, setModule] = useState('DevOS');
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>('dev');
  
  const [messages, setMessages] = useState<{role: 'user' | 'agent', content: string, questions?: string[]}[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromptAgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('execution_rules');

  const [session, setSession] = useState<{ id: string, status: string, progress: number } | null>(null);
  const [logs, setLogs] = useState<{ actor: string, output: any, createdAt: string }[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, logs]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleProcessIntent = async (overrideIntent?: string) => {
    const finalIntent = overrideIntent || intent;
    if (!finalIntent.trim()) return;

    setLoading(true);
    setError(null);

    if (!overrideIntent) {
       setMessages(prev => [...prev, { role: 'user', content: finalIntent }]);
    }

    try {
      const res = await fetch('/api/devos/prompt-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: finalIntent.trim(),
          context: { project: project.trim(), module: module.trim(), environment }
        })
      });

      if (!res.ok) throw new Error(`Erro no servidor (${res.status}).`);
      const data: PromptAgentOutput = await res.json();

      if (data.status === 'clarification_needed') {
        setMessages(prev => [...prev, { 
          role: 'agent', 
          content: 'Entendi o seu pedido, mas para orquestrar os melhores agentes, preciso de mais detalhes:',
          questions: data.clarification_questions 
        }]);
      } else if (data.status === 'success') {
        setResult(data);
        setView('PLANNING');
      } else {
        setError(data.error || 'Erro inesperado.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIntent('');
    }
  };

  const startPolling = (sessionId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    
    pollTimerRef.current = setInterval(async () => {
      try {
        // Fetch session status
        const resStats = await fetch(`/api/devos/executions`); // This lists executions, we might need a specific ID fetch if it exists
        const stats = await resStats.json();
        const current = stats.find((s: any) => s.id === sessionId);
        if (current) setSession(current);

        // Fetch logs
        const resLogs = await fetch(`/api/devos/audit?sessionId=${sessionId}`);
        const logData = await resLogs.json();
        setLogs(logData);

        if (current?.status === 'COMPLETED' || current?.status === 'FAILED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  const handleStartOrchestration = async () => {
    if (!result) return;
    setLoading(true);
    setView('ORCHESTRATING');

    try {
      const res = await fetch('/api/devos/executions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptPayload: result.prompt, // Pass the prompt inside the payload
          risk_level: result.risk_level,
          execution_mode: 'safe', // Correct field name
          environment
        })
      });

      if (!res.ok) throw new Error('Falha ao iniciar execução no Kernel.');
      const execution = await res.json();
      
      setSession(execution.session);
      startPolling(execution.session.id);
      
      // Start the run loop (background fire and forget)
      fetch('/api/devos/engine/run-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: execution.session.id })
      });

      setView('EXECUTING');
    } catch (err: any) {
      setError(err.message);
      setView('PLANNING');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#3B82F6]">
            <Cpu size={20} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Console de Orquestração Autônoma · v7</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PromptAgent</h1>
        </div>
        
        <div className="flex items-center gap-2">
            {['DISCOVERY', 'PLANNING', 'ORCHESTRATING', 'EXECUTING'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all ${view === s ? 'bg-[#3B82F6] scale-125 shadow-[0_0_10px_#3B82F6]' : 'bg-[#26262A]'}`} />
                    {i < 3 && <div className="w-4 h-[1px] bg-[#26262A]" />}
                </div>
            ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* VIEW 1: DISCOVERY (Chat) */}
        {view === 'DISCOVERY' && (
          <motion.div 
            key="discovery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="md:col-span-3 space-y-4">
              <div className="bg-[#151517] border border-[#26262A] rounded-2xl h-[500px] flex flex-col shadow-2xl relative overflow-hidden">
                {/* Chat Top bar */}
                <div className="p-4 border-b border-[#26262A] bg-[#0F0F10] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-[#3B82F6]" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">Canal de Descoberta</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                            <Wand2 size={40} className="text-[#3B82F6]" />
                            <p className="text-sm font-medium text-[#94A3B8] max-w-xs">
                                Descreva sua tarefa abaixo. Eu orquestrarei os agentes e mostrarei o progresso em tempo real.
                            </p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm font-medium leading-relaxed ${
                                m.role === 'user' 
                                ? 'bg-[#3B82F6] text-white rounded-tr-none' 
                                : 'bg-[#26262A] text-[#E2E8F0] border border-[#37373C] rounded-tl-none'
                            }`}>
                                {m.content}
                                {m.questions && (
                                    <div className="mt-4 space-y-2">
                                        {m.questions.map((q, qi) => (
                                            <button 
                                                key={qi}
                                                onClick={() => setIntent(q)}
                                                className="block w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-[#94A3B8]"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-[#26262A] rounded-2xl rounded-tl-none px-5 py-4 text-sm flex items-center gap-3">
                                <Loader size={16} className="animate-spin text-[#3B82F6]" />
                                <span className="text-[#94A3B8] font-bold uppercase tracking-widest text-[10px]">Analisando Intenção...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0F0F10] border-t border-[#26262A]">
                    <div className="relative">
                        <textarea
                            value={intent}
                            onChange={e => setIntent(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleProcessIntent();
                                }
                            }}
                            placeholder="Descreva o que você precisa..."
                            className="w-full bg-[#0A0A0B] border border-[#26262A] rounded-xl px-4 py-4 pr-14 text-white text-sm outline-none focus:border-[#3B82F6] transition-all resize-none placeholder:text-[#475569]"
                            rows={1}
                        />
                        <button 
                            disabled={loading || !intent.trim()}
                            onClick={() => handleProcessIntent()}
                            className="absolute right-2 top-2 p-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition-all disabled:opacity-50"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
              </div>
            </div>

            {/* Sidebar Context */}
            <div className="space-y-4">
                <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-5 space-y-4 shadow-xl">
                    <h3 className="text-[10px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} /> Contexto de Execução
                    </h3>
                    <div className="space-y-3">
                        {['Projeto', 'Módulo', 'Ambiente'].map((label, i) => (
                            <div key={label} className="space-y-1.5">
                                <span className="text-[9px] font-bold text-[#475569] uppercase">{label}</span>
                                <div className="p-2 bg-[#0A0A0B] border border-[#26262A] rounded-lg text-xs text-white font-mono">
                                    {label === 'Projeto' ? project : label === 'Módulo' ? module : environment.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                    <h4 className="text-[10px] font-black text-[#3B82F6] uppercase tracking-widest">Estado Cognitivo</h4>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                        Aguardando intenção para designar agentes especializados.
                    </p>
                </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: PLANNING (Confirmation) */}
        {view === 'PLANNING' && result && (
            <motion.div 
                key="planning"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -100 }}
                className="space-y-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Proposal */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-8 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-white tracking-tight">Proposta de Execução</h2>
                                    <p className="text-xs text-[#64748B] font-mono leading-relaxed">session_id: <span className="text-[#3B82F6]">{result.metadata.timestamp.replace(/[:.-]/g, '')}</span></p>
                                </div>
                                {(() => {
                                    const riskKey = result.risk_level || 'medium';
                                    const s = RISK_STYLES[riskKey as keyof typeof RISK_STYLES] || RISK_STYLES.medium;
                                    const riskLabel = riskKey === 'low' ? 'Baixo' : riskKey === 'medium' ? 'Médio' : 'Alto';
                                    return <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${s.bg} ${s.border} ${s.color}`}>Risco: {riskLabel}</div>
                                })()}
                            </div>

                            <div className="space-y-4">
                                <div className="p-5 bg-[#0A0A0B] border border-[#26262A] rounded-2xl space-y-2">
                                    <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Objetivo Técnico</h4>
                                    <p className="text-sm text-white font-medium">{result.prompt.objective}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 border border-[#26262A] rounded-2xl space-y-3">
                                        <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Plano Sugerido</h4>
                                        <div className="space-y-2">
                                            {result.prompt.execution_plan.map((step, i) => (
                                                <div key={i} className="flex gap-2 text-xs text-[#94A3B8]">
                                                    <span className="text-[#3B82F6] font-mono font-bold">{i+1}.</span>
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 border border-[#26262A] rounded-2xl space-y-3">
                                        <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Restrições Criadas</h4>
                                        <div className="space-y-2">
                                            {result.prompt.constraints.slice(0, 5).map((c, i) => (
                                                <div key={i} className="flex gap-2 text-xs text-[#94A3B8]">
                                                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                    <span>{c}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <button 
                                    onClick={() => setView('DISCOVERY')}
                                    className="flex-1 px-8 py-4 bg-[#26262A] hover:bg-[#37373C] text-[#94A3B8] rounded-xl text-xs font-black transition-all uppercase tracking-widest"
                                >
                                    Reajustar Ordem
                                </button>
                                <button 
                                    onClick={handleStartOrchestration}
                                    className="flex-1 px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest flex items-center justify-center gap-3"
                                >
                                    <Activity size={16} /> Aprovar e Orquestrar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Agents Board */}
                    <div className="space-y-6">
                        <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 shadow-xl space-y-6">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Users size={14} className="text-[#3B82F6]" /> Agentes Sugeridos
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { id: 'devos-coder', name: 'Engenheiro de Software', desc: 'Implementação de lógica e arquivos' },
                                    { id: 'devos-security-audit', name: 'Auditor de Segurança', desc: 'Validação de vulnerabilidades e políticas' },
                                    { id: 'devos-db-admin', name: 'Administrador de BD', desc: 'Ajustes de esquema e queries' }
                                ].map((agent, i) => (
                                    <div key={i} className="p-4 bg-[#0A0A0B] border border-[#26262A] rounded-xl flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/5 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                                            <Cpu size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-white">{agent.name}</h4>
                                            <p className="text-[10px] text-[#64748B]">{agent.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

        {/* VIEW 3: ORCHESTRATING (Visual Transition) */}
        {view === 'ORCHESTRATING' && (
            <motion.div 
                key="orchestrating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[400px] flex flex-col items-center justify-center text-center space-y-6"
            >
                <div className="relative">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="w-32 h-32 rounded-full border-t-2 border-r-2 border-[#3B82F6] opacity-30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity size={40} className="text-[#3B82F6] animate-pulse" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase tracking-[0.2em]">Contratando Agentes Especializados</h2>
                    <p className="text-xs text-[#64748B] font-medium max-w-sm">
                        Conectando ao Kernel para alocar recursos e isolar o ambiente de execução...
                    </p>
                </div>
            </motion.div>
        )}

        {/* VIEW 4: EXECUTING (Live Monitor) */}
        {view === 'EXECUTING' && (
            <motion.div 
                key="executing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
            >
                {/* Status Bar */}
                <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 shadow-2xl flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-[#475569] uppercase tracking-widest">Progresso Global</span>
                            <div className="flex items-center gap-3">
                                <div className="w-48 h-2 bg-[#0A0A0B] rounded-full overflow-hidden border border-[#26262A]">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${session?.progress || 5}%` }}
                                        className="h-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]"
                                    />
                                </div>
                                <span className="text-xs font-black text-white">{session?.progress || 0}%</span>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-[#26262A]" />
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-[#475569] uppercase tracking-widest">Agente Ativo</span>
                            <p className="text-xs font-bold text-[#3B82F6] flex items-center gap-2 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-ping" />
                                {logs[logs.length - 1]?.actor || 'INICIALIZANDO'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0B] border border-[#26262A] rounded-xl">
                            <div className={`w-2 h-2 rounded-full ${session?.status === 'EXECUTING' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{session?.status === 'EXECUTING' ? 'EXECUTANDO' : 'PREPARANDO'}</span>
                        </div>
                        <button className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            <XCircle size={12} /> Abortar
                        </button>
                    </div>
                </div>

                {/* Execution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Live Logs */}
                    <div className="md:col-span-2 bg-[#0A0A0B] border border-[#26262A] rounded-2xl h-[500px] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-[#26262A] bg-[#0F0F10] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#3B82F6]">
                                <Activity size={14} className="animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Fluxo de Execução</span>
                            </div>
                            <div className="text-[10px] font-mono text-[#475569]">SID: {session?.id.substring(0, 8) || '---'}</div>
                        </div>
                        <div className="flex-1 p-6 font-mono text-[11px] space-y-4 overflow-y-auto scrollbar-hide">
                            {logs.length === 0 && (
                                <div className="text-[#475569] italic animate-pulse">Estabelecendo conexão segura com o stream de auditoria...</div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="space-y-1 group">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#475569]">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                            log.actor === 'orchestrator' ? 'bg-blue-500/10 text-blue-400' : 
                                            log.actor === 'guard' ? 'bg-amber-500/10 text-amber-400' :
                                            'bg-emerald-500/10 text-emerald-400'
                                        }`}>{log.actor}</span>
                                    </div>
                                    <div className="pl-4 border-l border-[#26262A] group-hover:border-[#3B82F6] transition-colors py-1">
                                        <p className="text-[#94A3B8] leading-relaxed break-words">
                                            {typeof log.output === 'string' ? log.output : JSON.stringify(log.output)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={scrollRef} />
                        </div>
                        <div className="p-3 bg-[#0F0F10] border-t border-[#26262A] flex items-center gap-3">
                             <div className="flex-1 text-[10px] font-mono text-[#475569] italic">
                                {session?.status === 'EXECUTING' ? 'Kernel em processamento ativo...' : 'Aguardando próximo ciclo...'}
                             </div>
                             <button className="px-3 py-1.5 bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-[10px] font-black rounded-lg hover:bg-[#3B82F6]/20 transition-all">INJETAR FEEDBACK</button>
                        </div>
                    </div>

                    {/* Agent Telemetry */}
                    <div className="space-y-6">
                        <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 space-y-4 shadow-xl">
                            <h3 className="text-[10px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                <Cpu size={14} /> Estatísticas de Inteligência
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { label: 'Camada', value: 'OpenAI GPT-4o', status: 'Ideal' },
                                    { label: 'Latência', value: '1.2s méd', status: 'Normal' },
                                    { label: 'Taxa de Sucesso', value: '98.4%', status: 'Estável' },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] text-[#475569] uppercase font-bold">{item.label}</span>
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 uppercase font-bold">{item.status}</span>
                                        </div>
                                        <div className="text-xs text-white font-mono">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 space-y-3">
                            <h4 className="text-[10px] font-black text-[#3B82F6] uppercase tracking-widest">Consciência de Contexto</h4>
                            <p className="text-[11px] text-[#94A3B8] leading-relaxed italic">
                                O sistema está operando em modo autônomo. Você pode interferir a qualquer momento usando o botão de feedback.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
