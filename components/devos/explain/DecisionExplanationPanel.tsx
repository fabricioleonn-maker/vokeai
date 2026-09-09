'use client';

import React, { useState } from 'react';
import { 
  Info, 
  Terminal, 
  Lightbulb, 
  ArrowRightLeft, 
  ShieldCheck, 
  Zap,
  HelpCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ExplanationProps {
  node: {
    type: string;
    label?: string;
    status: string;
    cost?: number;
    duration?: number;
    metadata?: any;
  };
}

const BUSINESS_TRANSLATIONS: Record<string, { title: string, desc: string, icon: any }> = {
  ORCHESTRATOR: { 
    title: 'Flow Strategy', 
    desc: 'The internal intelligence mapped the best specialists to handle this request based on your operational policy.',
    icon: Lightbulb 
  },
  AGENT: { 
    title: 'Specialist Performance', 
    desc: 'An AI Expert was assigned to execute the specific task with high precision.',
    icon: Zap 
  },
  AGENT_HANDOFF: { 
    title: 'Expert Collaboration', 
    desc: 'Context was shared between specialists to ensure continuity and solve complex dependencies.',
    icon: ArrowRightLeft 
  },
  GOVERNANCE: { 
    title: 'Strategy Audit', 
    desc: 'Checking if the action aligns with company safety and compliance rules.',
    icon: ShieldCheck 
  },
  BUDGET: { 
    title: 'Efficiency Control', 
    desc: 'Credit usage is being managed to maintain your operational ROI.',
    icon: Info 
  },
};

export default function DecisionExplanationPanel({ node }: ExplanationProps) {
  const [isTechnical, setIsTechnical] = useState(false);
  
  const translation = BUSINESS_TRANSLATIONS[node.type] || {
    title: 'Operational Step',
    desc: 'Standard AI processing step for the current workflow.',
    icon: HelpCircle
  };

  const Icon = translation.icon;

  return (
    <Card className="p-4 bg-slate-950/80 border-slate-800 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header with Toggle */}
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-indigo-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Explainability Layer</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technical Mode</span>
          <Switch 
            checked={isTechnical}
            onCheckedChange={setIsTechnical}
            className="data-[state=checked]:bg-indigo-500"
          />
        </div>
      </div>

      {/* Main Narrative */}
      {!isTechnical ? (
        <div className="space-y-3">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">{translation.title}</span>
            <p className="text-sm text-slate-400 leading-relaxed mt-1">
              {translation.desc}
            </p>
          </div>
          
          {node.cost && (
            <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-300">
              <span className="font-bold">Business Impact:</span> This step utilized ${node.cost.toFixed(4)} of your AI budget to achieve {node.status.toLowerCase()} status.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 font-mono">
          <div className="flex items-center gap-2 text-rose-400 text-[11px] mb-2">
            <Terminal size={12} />
            <span>RAW DEVOS PAYLOAD</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px]">
            <div className="space-y-1">
              <span className="text-slate-500 uppercase">Engine Node</span>
              <div className="text-slate-300">{node.type}</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 uppercase">Status Code</span>
              <div className={cn(
                "font-bold",
                node.status === 'DONE' ? "text-emerald-500" : "text-amber-500"
              )}>{node.status}</div>
            </div>
            <div className="space-y-1 col-span-2 mt-2">
              <span className="text-slate-500 uppercase">Internal Metadata</span>
              <pre className="bg-slate-900 p-2 rounded border border-slate-800 text-indigo-300 overflow-x-auto">
                {JSON.stringify(node.metadata || { "trace_id": "8x-77", "strategy": "greedy" }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
