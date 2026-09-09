'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  ShieldCheck, 
  DollarSign, 
  BarChart3, 
  UserCheck, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  LayoutGrid,
  Zap,
  Cpu,
  Network,
  ArrowRightLeft,
  Shuffle,
  Frown,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DevOsNodeType, DevOsNodeStatus } from '@/lib/devos/types';

const ICON_MAP: Record<DevOsNodeType, any> = {
  INPUT: LayoutGrid,
  GOVERNANCE: ShieldCheck,
  BUDGET: DollarSign,
  SCORING: BarChart3,
  APPROVAL: UserCheck,
  ORCHESTRATOR: Cpu,
  AGENT: Network,
  AGENT_DECISION: Shuffle,
  AGENT_HANDOFF: ArrowRightLeft,
  AGENT_MERGE: LayoutGrid,
  AGENT_FALLBACK: Shuffle,
  AGENT_TIMEOUT: Frown,
  EXECUTION: Zap,
  RETRY: Clock,
  REPLAN: Play,
  COMMIT: CheckCircle2,
  FAILURE: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-800/50 border-slate-700 text-slate-400',
  RUNNING: 'bg-blue-900/30 border-blue-500 text-blue-400 animate-pulse',
  DONE: 'bg-emerald-900/30 border-emerald-500 text-emerald-400',
  FAILED: 'bg-rose-900/30 border-rose-500 text-rose-400',
  PREDICTED: 'bg-slate-800/20 border-slate-600 border-dashed text-slate-500 opacity-60',
};

const DevOsNode = ({ data }: NodeProps) => {
  const Icon = ICON_MAP[data.type as DevOsNodeType] || LayoutGrid;
  const statusColor = STATUS_COLORS[data.status as DevOsNodeStatus] || STATUS_COLORS.PENDING;

  return (
    <div className={cn(
      "px-4 py-3 rounded-xl border-2 shadow-2xl min-w-[180px] backdrop-blur-md transition-all duration-500",
      statusColor
    )}>
      <Handle type="target" position={Position.Left} className="!bg-slate-600 !w-2 !h-2 border-none" />
      
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg bg-white/5",
          data.status === 'RUNNING' && "animate-spin-slow"
        )}>
          <Icon size={20} />
        </div>
        
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            {data.type}
          </span>
          <span className="text-sm font-semibold truncate max-w-[120px]">
            {data.label || data.type}
          </span>
        </div>
      </div>

      {(data.duration || data.cost) && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-medium opacity-80">
          {data.duration && <span>{data.duration}ms</span>}
          {data.cost && <span className="text-emerald-400">${data.cost.toFixed(4)}</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-slate-600 !w-2 !h-2 border-none" />
    </div>
  );
};

export default memo(DevOsNode);
