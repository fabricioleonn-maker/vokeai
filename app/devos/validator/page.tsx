'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, ShieldAlert, Cpu, 
  CheckCircle2, XCircle, AlertTriangle, 
  ChevronDown, ChevronUp, Clock, Lock,
  Loader, ArrowRight, Terminal
} from 'lucide-react';
import type { ValidatorOutput, ValidationCheck } from '@/lib/devos/agents/validator-agent.types';
import type { PromptAgentOutput } from '@/lib/devos/agents/prompt-agent.types';

const DECISION_CONFIG = {
  APPROVED: {
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/25',
    label: 'APROVADO PARA EXECUÇÃO',
    pulse: 'bg-emerald-500',
  },
  NEEDS_REVIEW: {
    icon: ShieldAlert,
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/25',
    label: 'REQUER REVISÃO HUMANA',
    pulse: 'bg-amber-500',
  },
  BLOCKED: {
    icon: ShieldX,
    color: 'text-rose-400',
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/25',
    label: 'EXECUÇÃO BLOQUEADA',
    pulse: 'bg-rose-500',
  },
};

function CheckRow({ check }: { check: ValidationCheck }) {
  const sevColor = check.severity === 'critical' ? 'text-rose-400' 
    : check.severity === 'warning' ? 'text-amber-400' 
    : 'text-[#64748B]';

  return (
    <div className={`flex items-start gap-4 py-3 border-b border-[#26262A] last:border-0`}>
      <div className="flex-shrink-0 mt-0.5">
        {check.passed
          ? <CheckCircle2 size={14} className="text-emerald-400" />
          : <XCircle size={14} className="text-rose-400" />
        }
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white">{check.rule}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${sevColor}`}>{check.severity}</span>
        </div>
        {check.detail && <p className="text-[11px] text-[#64748B] mt-0.5 leading-tight">{check.detail}</p>}
      </div>
    </div>
  );
}

export default function ValidatorPage() {
  const [rawPayload, setRawPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidatorOutput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showChecks, setShowChecks] = useState(true);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    setResult(null);

    let parsed: PromptAgentOutput;
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      setParseError('JSON inválido. Cole o output completo do PromptAgent.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/devos/validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptPayload: parsed })
      });
      const data: ValidatorOutput = await res.json();
      setResult(data);
    } catch {
      setParseError('Falha na conexão com o Kernel.');
    } finally {
      setLoading(false);
    }
  };

  const config = result ? DECISION_CONFIG[result.decision] : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-[#3B82F6] mb-2">
          <ShieldCheck size={20} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Security Gate · v1</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">ValidatorAgent</h1>
        <p className="text-[#94A3B8] text-sm mt-1 font-medium">
          Cole o output do PromptAgent. O Validator decide se a execução é segura.
        </p>
      </header>

      {/* Pipeline visual */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
        {['PromptAgent', 'ValidatorAgent', 'Execução'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-lg border ${i === 1 ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#3B82F6]' : 'border-[#26262A] text-[#475569]'}`}>
              {step}
            </span>
            {i < 2 && <ArrowRight size={12} className="text-[#26262A]" />}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleValidate} className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#26262A] bg-[#0F0F10] flex items-center gap-2">
          <Terminal size={16} className="text-[#3B82F6]" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Input — PromptAgent Payload</span>
        </div>
        <div className="p-6 space-y-4">
          <textarea
            required
            rows={10}
            value={rawPayload}
            onChange={e => setRawPayload(e.target.value)}
            placeholder={'Paste PromptAgent output JSON here...\n{\n  "agent": "PromptAgent",\n  "version": "v1.1",\n  ...'}
            className="w-full bg-[#0A0A0B] border border-[#26262A] rounded-xl px-4 py-3 text-[#94A3B8] text-xs font-mono outline-none focus:border-[#3B82F6] transition-all resize-none"
          />
          {parseError && (
            <p className="text-rose-400 text-xs font-medium flex items-center gap-2">
              <XCircle size={14} /> {parseError}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-sm font-black transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {loading ? 'ANALISANDO...' : 'VALIDAR PAYLOAD'}
            </button>
          </div>
        </div>
      </form>

      {/* Result */}
      <AnimatePresence>
        {result && config && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Decision Card */}
            <div className={`p-6 rounded-2xl border ${config.bg} ${config.border} flex items-center gap-5`}>
              <div className="relative flex-shrink-0">
                <div className={`absolute inset-0 rounded-full ${config.pulse} animate-ping opacity-20`} />
                <config.icon size={28} className={config.color} />
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.2em] mb-1 ${config.color}`}>{config.label}</p>
                <p className="text-white text-sm font-medium leading-relaxed">{result.decision_reason}</p>
              </div>
            </div>

            {/* Execution Clearance (APPROVED only) */}
            {result.execution_clearance && (
              <div className="bg-[#151517] border border-emerald-500/20 rounded-2xl p-6 space-y-4">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} /> Execution Clearance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Dry Run', value: result.execution_clearance.dry_run_required ? 'Required' : 'Optional', color: result.execution_clearance.dry_run_required ? 'text-amber-400' : 'text-emerald-400' },
                    { label: 'Env Lock', value: result.execution_clearance.environment_lock.toUpperCase(), color: 'text-[#3B82F6]' },
                    { label: 'Expires', value: new Date(result.execution_clearance.expires_at).toLocaleTimeString(), color: 'text-white' },
                    { label: 'Scope', value: 'Bounded', color: 'text-emerald-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#0A0A0B] rounded-xl p-3 border border-[#26262A]">
                      <p className={`text-sm font-mono font-black ${color}`}>{value}</p>
                      <p className="text-[9px] font-bold text-[#475569] uppercase tracking-widest mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Actions (BLOCKED / NEEDS_REVIEW) */}
            {result.required_actions && result.required_actions.length > 0 && (
              <div className="bg-[#151517] border border-[#26262A] rounded-2xl p-6 space-y-3">
                <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={12} /> Ações Necessárias
                </h3>
                <div className="space-y-2">
                  {result.required_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-[#26262A] last:border-0">
                      <span className="text-[10px] font-black text-[#475569] font-mono mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-sm text-[#94A3B8] font-medium">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Checks Accordion */}
            <div className="bg-[#151517] border border-[#26262A] rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowChecks(!showChecks)}
                className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[10px] font-black text-[#3B82F6]">{result.checks.length}</span>
                  <span className="text-xs font-black text-white uppercase tracking-widest">Verificações de Segurança</span>
                  <span className="text-[10px] font-bold text-emerald-400">{result.checks.filter(c => c.passed).length}/{result.checks.length} aprovadas</span>
                </div>
                {showChecks ? <ChevronUp size={14} className="text-[#475569]" /> : <ChevronDown size={14} className="text-[#475569]" />}
              </button>
              <AnimatePresence>
                {showChecks && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-6 pb-4 border-t border-[#26262A]">
                      {result.checks.map((check, i) => <CheckRow key={i} check={check} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Metadata */}
            <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#26262A] flex flex-wrap gap-6 text-[10px] font-mono text-[#475569]">
              <span>agent: <span className="text-[#94A3B8]">ValidatorAgent</span></span>
              <span>version: <span className="text-[#94A3B8]">{result.version}</span></span>
              <span>env: <span className="text-[#94A3B8]">{result.metadata.environment}</span></span>
              <span>processed_in: <span className="text-[#94A3B8]">{result.metadata.processingMs}ms</span></span>
              <span>decision: <span className={`font-black ${result.decision === 'APPROVED' ? 'text-emerald-400' : result.decision === 'BLOCKED' ? 'text-rose-400' : 'text-amber-400'}`}>{result.decision}</span></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
