'use client';

import React from 'react';
import { Shield, Zap, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DevOsPolicyConfig } from '@/lib/devos/policy/PolicyEngine';

interface PolicyImpactPanelProps {
  config: DevOsPolicyConfig;
}

export default function PolicyImpactPanel({ config }: PolicyImpactPanelProps) {
  // Logic to simulate impact based on current config
  const isRestrictive = config.riskThreshold < 50 || config.maxAutoApproveCost < 2;
  const isSafe = config.environmentRules.production.blockDestructive && config.requireApproval.highCost;

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-white/5 shadow-2xl sticky top-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2">
        <Zap size={14} className="text-blue-500" />
        Live Impact Analysis
      </h3>

      <div className="space-y-6">
        {/* Execution Mode */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Predicted Mode</div>
          <div className={cn(
            "px-4 py-3 rounded-xl border flex items-center justify-between transition-all",
            isRestrictive ? "bg-amber-900/20 border-amber-500/50" : "bg-emerald-900/20 border-emerald-500/50"
          )}>
            <div className="flex flex-col">
              <span className={cn("font-bold", isRestrictive ? "text-amber-400" : "text-emerald-400")}>
                {isRestrictive ? 'HYBRID_APPROVAL' : 'AUTO_STREAK'}
              </span>
              <span className="text-[10px] opacity-60">Based on cost & risk triggers</span>
            </div>
            {isRestrictive ? <AlertTriangle size={20} className="text-amber-500" /> : <Shield size={20} className="text-emerald-500" />}
          </div>
        </div>

        {/* Financial Gate */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3">
            <DollarSign size={16} className="text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase">Auto-Approve Cap</span>
              <span className="text-[10px] opacity-60">Max untethered spend</span>
            </div>
          </div>
          <span className="text-lg font-mono font-bold text-white">${config.maxAutoApproveCost}</span>
        </div>

        {/* Risk Profile */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
            <span>Risk Tolerance</span>
            <span className={config.riskThreshold > 80 ? 'text-rose-400' : 'text-emerald-400'}>
              {config.riskThreshold}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                config.riskThreshold > 80 ? "bg-rose-500" : 
                config.riskThreshold > 50 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${config.riskThreshold}%` }}
            />
          </div>
        </div>

        {/* Safety Tags */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex flex-wrap gap-2">
            <SafetyTag active={isSafe} label="Safe Production" />
            <SafetyTag active={config.requireApproval.lowConfidence} label="Confidence Gate" />
            <SafetyTag active={config.allowedModels.length > 0} label="Model Whitelist" />
          </div>
        </div>

        <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 mt-4">
          <Activity size={16} />
          Simulation Mode
        </button>
      </div>
    </div>
  );
}

function SafetyTag({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={cn(
      "px-2 py-1 rounded-md text-[9px] font-bold uppercase flex items-center gap-1 border transition-all",
      active ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-slate-800 border-white/5 text-slate-500"
    )}>
      <CheckCircle2 size={10} />
      {label}
    </div>
  );
}
