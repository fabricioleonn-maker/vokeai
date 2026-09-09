'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, RefreshCcw, Gauge,
  Shield, Zap, Terminal, AlertTriangle, RotateCcw,
  ArrowRight, ArrowUpRight, ExternalLink
} from 'lucide-react';

type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR' | 'SKIPPED';
type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'ROLLED_BACK' | 'NEEDS_REVIEW' | 'BLOCKED' | 'DRY_RUN_COMPLETE';

interface Step {
  id: string;
  index: number;
  step: string;
  status: StepStatus;
  duration_ms?: number;
  error?: string;
  expected_output?: string;
  actual_output?: string;
  validation_status?: 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED' | 'NOT_APPLICABLE';
}

interface Run {
  id: string; objective: string; scope: string; status: string;
  execution_mode: string;
  environment: string;
  risk_score: number;
  result_summary?: string;
  total_duration_ms?: number;
  steps_completed: number;
  steps_failed: number;
  total_steps: number;
  steps: Step[]; createdAt: string; finishedAt?: string;
  // v1.1 fields
  coherence_score?: number;
  verdict_reason?: string;
  undo_feasibility: { 
    disclaimer: string;
    likely_reversible: string[]; 
    likely_irreversible: string[]; 
    compensation_plan: string[];
  };
}

const STATUS_STYLE: Record<RunStatus, { color: string; bg: string; icon: any; label: string }> = {
  PENDING:            { color: 'text-[#64748B]',  bg: 'bg-[#1A1A1C]',        icon: Clock,        label: 'Pendente'       },
  RUNNING:            { color: 'text-[#3B82F6]',  bg: 'bg-[#3B82F6]/10',     icon: Activity,     label: 'Executando'     },
  SUCCESS:            { color: 'text-emerald-400', bg: 'bg-emerald-500/10',   icon: CheckCircle2, label: 'Sucesso'        },
  PARTIAL_SUCCESS:    { color: 'text-sky-400',     bg: 'bg-sky-500/10',       icon: CheckCircle2, label: 'Sucesso Parcial' },
  FAILED:             { color: 'text-rose-400',    bg: 'bg-rose-500/10',      icon: XCircle,      label: 'Falhou'         },
  ROLLED_BACK:        { color: 'text-amber-400',   bg: 'bg-amber-500/10',     icon: RotateCcw,    label: 'Revertido'      },
  NEEDS_REVIEW:       { color: 'text-orange-400',  bg: 'bg-orange-500/10',    icon: AlertTriangle,label: 'Revisar'        },
  BLOCKED:            { color: 'text-[#64748B]',  bg: 'bg-zinc-900',         icon: Shield,       label: 'Bloqueado'      },
  DRY_RUN_COMPLETE:   { color: 'text-[#94A3B8]',  bg: 'bg-white/5',          icon: Shield,       label: 'Dry-Run OK'     },
};

const STEP_ICON: Record<StepStatus, { icon: any; color: string }> = {
  PENDING: { icon: Clock,        color: 'text-[#475569]' },
  RUNNING: { icon: Activity,     color: 'text-[#3B82F6]' },
  DONE:    { icon: CheckCircle2, color: 'text-emerald-400' },
  ERROR:   { icon: XCircle,      color: 'text-rose-400' },
  SKIPPED: { icon: ArrowRight,   color: 'text-[#64748B]' },
};

const VALIDATION_STYLE: Record<string, { label: string; color: string }> = {
  VERIFIED:   { label: 'VERIFIED',   color: 'text-emerald-400' },
  MISMATCH:   { label: 'MISMATCH',   color: 'text-rose-400' },
  UNVERIFIED: { label: 'UNVERIFIED', color: 'text-[#475569]' },
  NOT_APPLICABLE: { label: 'N/A',    color: 'text-[#475569]' },
};

function riskColor(score: number) {
  if (score === 0) return 'text-emerald-400';
  if (score < 30) return 'text-emerald-400';
  if (score < 60) return 'text-amber-400';
  return 'text-rose-400';
}

function RunCard({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLE[run.status] || STATUS_STYLE.PENDING;
  const Icon = s.icon;

  return (
    <div className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden group transition-all hover:border-[#3B82F6]/30">
      <div
        className="p-5 flex items-center gap-5 cursor-pointer hover:bg-white/[0.015]"
        onClick={() => setOpen(!open)}
      >
        {/* Status Icon */}
        <div className={`p-2.5 rounded-xl border border-[#26262A] flex-shrink-0 ${s.bg}`}>
          <Icon size={16} className={`${s.color} ${run.status === 'RUNNING' ? 'animate-pulse' : ''}`} />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-sm font-bold text-white truncate">{run.objective}</span>
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded border border-current/20 ${s.color} ${s.bg}`}>{s.label}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#26262A] text-[#64748B]`}>{run.execution_mode}</span>
          </div>
          <p className="text-[11px] text-[#64748B] truncate">{run.scope}</p>
        </div>

        {/* Metrics */}
        <div className="hidden md:flex items-center gap-6 text-right flex-shrink-0">
          <div>
            <div className={`text-lg font-mono font-black ${riskColor(run.risk_score)}`}>{run.risk_score}</div>
            <div className="text-[9px] font-bold text-[#475569] uppercase tracking-wider">Risk Score</div>
          </div>
          <div>
            <div className="text-lg font-mono font-black text-white">{run.steps_completed}/{(run.steps_completed + run.steps_failed)}</div>
            <div className="text-[9px] font-bold text-[#475569] uppercase tracking-wider">Steps</div>
          </div>
          {run.total_duration_ms && (
            <div>
              <div className="text-lg font-mono font-black text-white">{run.total_duration_ms}ms</div>
              <div className="text-[9px] font-bold text-[#475569] uppercase tracking-wider">Duration</div>
            </div>
          )}
        </div>

        <ChevronDown size={14} className={`text-[#475569] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-[#26262A]"
          >
            <div className="p-6 space-y-6">
              {run.result_summary && (
                <p className="text-sm text-[#94A3B8] font-medium leading-relaxed bg-[#0A0A0B] rounded-xl border border-[#26262A] p-4">
                  {run.result_summary}
                </p>
              )}

              {/* Verdict & Coherence */}
              {run.verdict_reason && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0A0A0B] rounded-xl border border-[#26262A] p-4">
                    <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-1">Post-Execution Judgment</h5>
                    <p className="text-sm text-white font-medium">{run.verdict_reason}</p>
                  </div>
                  <div className="bg-[#0A0A0B] rounded-xl border border-[#26262A] p-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-1">Coherence Score</h5>
                      <p className="text-sm text-white font-mono font-bold">{(run.coherence_score || 0) * 100}%</p>
                    </div>
                    <div className="h-1 flex-1 bg-[#1A1A1C] rounded-full mx-6 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${(run.coherence_score || 0) * 100}%` }}
                        className={`h-full ${riskColor(100 - (run.coherence_score || 0) * 100)}`} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step Ledger */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={10} /> Execution Steps
                </h4>
                {run.steps.map((step) => {
                  const si = STEP_ICON[step.status] || STEP_ICON.PENDING;
                  const vs = step.validation_status ? VALIDATION_STYLE[step.validation_status] : null;
                  return (
                    <div key={step.id} className="flex items-center gap-4 py-2 border-b border-[#26262A]/50 last:border-0 group/step">
                      <span className="text-[10px] font-mono text-[#475569] w-6 text-right flex-shrink-0">{String(step.index + 1).padStart(2, '0')}</span>
                      <si.icon size={12} className={`flex-shrink-0 ${si.color}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-[#94A3B8] font-medium block truncate">{step.step}</span>
                        {step.expected_output && (
                          <span className="text-[9px] text-[#475569] font-medium block italic truncate">Expected: {step.expected_output}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {vs && (
                          <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-black/40 border border-[#26262A] ${vs.color}`}>
                            {vs.label}
                          </span>
                        )}
                        {step.duration_ms !== undefined && (
                          <span className="text-[10px] font-mono text-[#475569]">{step.duration_ms}ms</span>
                        )}
                      </div>
                      {step.error && (
                        <span className="text-[10px] text-rose-400 font-medium truncate max-w-[200px]">{step.error}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Undo Feasibility Analysis */}
              {run.undo_feasibility && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {run.environment === 'staging' && run.status === 'SUCCESS' && (
                      <button 
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                        onClick={() => alert(`Iniciando fluxo de promoção para ${run.id}...`)}
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        Promover para Produção
                      </button>
                    )}
                    <button className="p-1 hover:bg-white/10 rounded transition-colors">
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="bg-[#0A0A0B] border border-[#26262A] rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield size={14} className="text-[#3B82F6] mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          Undo Feasibility Analysis
                        </h4>
                        <p className="text-[10px] text-[#475569] font-medium leading-relaxed mt-1 italic">
                          ⚠️ {run.undo_feasibility.disclaimer}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <h5 className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider">Likely Reversible</h5>
                        {run.undo_feasibility.likely_reversible.length > 0 ? (
                          run.undo_feasibility.likely_reversible.map((a, i) => (
                            <p key={i} className="text-[11px] text-[#94A3B8] border-l border-emerald-500/20 pl-2">{a}</p>
                          ))
                        ) : (
                          <p className="text-[11px] text-[#475569]">None detected.</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <h5 className="text-[9px] font-bold text-rose-400/80 uppercase tracking-wider">Likely Irreversible</h5>
                        {run.undo_feasibility.likely_irreversible.length > 0 ? (
                          run.undo_feasibility.likely_irreversible.map((a, i) => (
                            <p key={i} className="text-[11px] text-[#94A3B8] border-l border-rose-500/20 pl-2">{a}</p>
                          ))
                        ) : (
                          <p className="text-[11px] text-[#475569]">None detected.</p>
                        )}
                      </div>
                    </div>

                    {run.undo_feasibility.compensation_plan?.length > 0 && (
                      <div className="pt-2 border-t border-[#26262A]">
                        <h5 className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider mb-1.5">Compensation Guidance</h5>
                        <div className="grid grid-cols-1 gap-1">
                          {run.undo_feasibility.compensation_plan.map((p, i) => (
                            <p key={i} className="text-[11px] text-[#94A3B8] flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-amber-400/40" /> {p}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExecutionsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/devos/executions/run');
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch { setRuns([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Metrics aggregates
  const total = runs.length;
  const success = runs.filter(r => r.status === 'SUCCESS' || r.status === 'DRY_RUN_COMPLETE').length;
  const failed = runs.filter(r => r.status === 'FAILED').length;
  const avgRisk = total ? Math.round(runs.reduce((a, r) => a + r.risk_score, 0) / total) : 0;
  const avgDuration = runs.filter(r => r.total_duration_ms).length
    ? Math.round(runs.filter(r => r.total_duration_ms).reduce((a, r) => a + (r.total_duration_ms || 0), 0) / runs.filter(r => r.total_duration_ms).length)
    : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#3B82F6] mb-2">
            <Activity size={20} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Execution Tracker · v1</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Execuções</h1>
          <p className="text-[#94A3B8] text-sm mt-1 font-medium">Rastreamento em tempo real de todas as execuções do pipeline de agentes.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-[#26262A] text-[#94A3B8] hover:text-white hover:border-[#3B82F6]/50 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCcw size={14} /> Atualizar
        </button>
      </header>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',      value: total,        color: 'text-white',        icon: Gauge },
          { label: 'Sucesso',    value: success,      color: 'text-emerald-400',  icon: CheckCircle2 },
          { label: 'Falhas',     value: failed,       color: 'text-rose-400',     icon: XCircle },
          { label: 'Risk Médio', value: `${avgRisk}`, color: riskColor(avgRisk),   icon: Shield },
          { label: 'Tempo Médio',value: `${avgDuration}ms`, color: 'text-[#3B82F6]', icon: Zap },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[#151517] border border-[#26262A] rounded-2xl p-5 hover:border-[#3B82F6]/30 transition-all">
            <Icon size={16} className={`${color} mb-3`} />
            <div className={`text-2xl font-mono font-black ${color}`}>{value}</div>
            <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Execution List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Histórico de Execuções</h2>
          <span className="text-[10px] text-[#475569] font-mono">{total} registros</span>
        </div>

        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-[#151517] border border-[#26262A] animate-pulse" />
          ))
        ) : runs.length === 0 ? (
          <div className="py-24 text-center">
            <Activity className="mx-auto text-[#26262A] mb-4" size={48} />
            <p className="text-[#64748B] text-xs font-bold uppercase tracking-[0.1em]">Nenhuma execução registrada.</p>
            <p className="text-[#475569] text-xs mt-2">Use o PromptAgent → ValidatorAgent → Execute para iniciar o pipeline.</p>
          </div>
        ) : (
          runs.map(run => <RunCard key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
