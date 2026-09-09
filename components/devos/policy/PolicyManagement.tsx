'use client';

import React, { useState } from 'react';
import { Shield, DollarSign, Activity, Lock, Globe, Terminal, Save, RotateCcw } from 'lucide-react';
import { PolicySection, PolicySlider, PolicyToggle } from './PolicyStudioComponents';
import PolicyImpactPanel from './PolicyImpactPanel';
import { DEFAULT_POLICY, DevOsPolicyConfig } from '@/lib/devos/policy/PolicyEngine';

export default function PolicyManagement() {
  const [config, setConfig] = useState<DevOsPolicyConfig>(DEFAULT_POLICY);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = (path: string, value: any) => {
    const newConfig = { ...config } as any;
    const parts = path.split('.');
    let current = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
       current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setConfig({ ...newConfig });
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement server action to save to Prisma
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Configuration Sections */}
      <div className="lg:col-span-8 flex flex-col gap-8">
        
        {/* Financial Governance */}
        <PolicySection 
          title="Financial Governance" 
          description="Define spending limits and auto-approval thresholds."
          icon={DollarSign}
        >
          <PolicySlider 
            label="Auto-Approve Cost Limit" 
            subLabel="Max cost for autonomous execution without human review"
            min={0} max={50} step={0.5} 
            value={config.maxAutoApproveCost} 
            unit="$"
            onChange={(v: number) => handleUpdate('maxAutoApproveCost', v)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <PolicyToggle 
               label="High Cost Review" 
               description="Always flag jobs exceeding the cap"
               checked={config.requireApproval.highCost}
               onChange={(v: boolean) => handleUpdate('requireApproval.highCost', v)}
             />
             <PolicyToggle 
               label="Low Confidence Review" 
               description="Flag jobs with low prediction scores"
               checked={config.requireApproval.lowConfidence}
               onChange={(v: boolean) => handleUpdate('requireApproval.lowConfidence', v)}
             />
          </div>
        </PolicySection>

        {/* Risk & Security */}
        <PolicySection 
          title="Risk & Security" 
          description="Control risk tolerance and model accessibility."
          icon={Shield}
        >
          <PolicySlider 
            label="Risk Tolerance Threshold" 
            subLabel="Flag executions with risk score above this value"
            min={0} max={100} step={5} 
            value={config.riskThreshold} 
            unit="" 
            onChange={(v: number) => handleUpdate('riskThreshold', v)}
          />
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase text-slate-500">
              <Terminal size={12} />
              Allowed Model Cluster
            </div>
            <div className="flex flex-wrap gap-2">
              {['gpt-4o', 'gpt-4o-mini', 'o1', 'claude-3-5-sonnet'].map(m => (
                <button 
                  key={m}
                  onClick={() => {
                    const models = config.allowedModels.includes(m)
                      ? config.allowedModels.filter(x => x !== m)
                      : [...config.allowedModels, m];
                    handleUpdate('allowedModels', models);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    config.allowedModels.includes(m)
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300' 
                      : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </PolicySection>

        {/* Production Guard */}
        <PolicySection 
          title="Production Guard" 
          description="Zero-trust rules for mission-critical environments."
          icon={Lock}
        >
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <PolicyToggle 
               label="Always Require Approval" 
               description="Production ignore autonomous mode"
               checked={config.environmentRules.production.requireApprovalAlways}
               onChange={(v: boolean) => handleUpdate('environmentRules.production.requireApprovalAlways', v)}
             />
             <PolicyToggle 
               label="Block Destructive Ops" 
               description="Prevents delete/overwrite in prod"
               checked={config.environmentRules.production.blockDestructive}
               onChange={(v: boolean) => handleUpdate('environmentRules.production.blockDestructive', v)}
             />
          </div>
        </PolicySection>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
           <button 
             onClick={() => setConfig(DEFAULT_POLICY)}
             className="px-6 py-2.5 rounded-xl border border-white/5 text-slate-500 hover:text-white transition-all flex items-center gap-2 text-sm font-bold"
           >
             <RotateCcw size={16} />
             Reset Defaults
           </button>
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="px-8 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50"
           >
             <Save size={16} />
             {isSaving ? 'Synchronizing...' : 'Save Strategy'}
           </button>
        </div>
      </div>

      {/* Right Column: Impact Display */}
      <div className="lg:col-span-4 h-full">
         <PolicyImpactPanel config={config} />
      </div>
    </div>
  );
}
