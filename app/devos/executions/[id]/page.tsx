import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ArrowLeft, Clock, DollarSign, Fingerprint, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { ReactFlowAdapter } from '@/lib/devos/graph/adapters/reactflow-adapter';
import ExecutionCanvas from '@/components/devos/graph/ExecutionCanvas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getExecution(id: string) {
  const run = await (prisma as any).devOsJobRun.findUnique({
    where: { id },
    include: {
      graph: true,
      job: true
    }
  });
  return run;
}

export default async function ExecutionDetailPage({ params }: { params: { id: string } }) {
  const run = await getExecution(params.id);

  if (!run) notFound();

  const graphData = run.graph ? ReactFlowAdapter.transform(run.graph) : { nodes: [], edges: [] };

  return (
    <div className="flex flex-col gap-6 p-8 bg-slate-950 min-h-screen text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <Link 
            href="/devos/executions" 
            className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Execution <span className="text-slate-500 font-mono text-lg">#{run.id.slice(0, 8)}</span>
              {run.status === 'RUNNING' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase animate-pulse">
                  Live
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {run.job.name} • Started {run.startedAt.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Status</div>
            <div className={`text-sm font-bold ${run.status === 'SUCCESS' ? 'text-emerald-500' : 'text-blue-500'}`}>
              {run.status}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Clock size={16} />} 
          label="Duration" 
          value={`${run.durationMs || '-'} ms`} 
          subValue={run.actualDurationMs ? `Internal: ${run.actualDurationMs}ms` : undefined}
        />
        <StatCard 
          icon={<DollarSign size={16} />} 
          label="Estimated Cost" 
          value={`$${run.estimatedCost?.toFixed(4) || '0.0000'}`} 
          color="text-emerald-400"
        />
        <StatCard 
          icon={<Activity size={16} />} 
          label="AIOps Score" 
          value={run.executionDecisionScore?.toFixed(2) || '0.00'} 
          subValue={run.optimizationSource}
        />
        <StatCard 
          icon={<Fingerprint size={16} />} 
          label="Model" 
          value={run.selectedModel || 'gpt-4o-mini'} 
          subValue={run.executionFingerprint?.slice(0, 12)}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Execution Flow <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-[10px] text-slate-400 font-mono">v3.0-graph</span>
          </h2>
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            Canvas Interactive
          </div>
        </div>

        <Suspense fallback={<div className="w-full h-[600px] bg-slate-900 rounded-2xl animate-pulse" />}>
          <ExecutionCanvas 
            initialNodes={graphData.nodes} 
            initialEdges={graphData.edges} 
            status={run.status}
          />
        </Suspense>
      </div>

      {/* Logs & Payload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Payload Snapshot</h3>
          <pre className="text-xs font-mono p-4 bg-slate-950 rounded-xl overflow-x-auto text-blue-300">
            {JSON.stringify(run.job.payload, null, 2)}
          </pre>
        </div>
        
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Execution Logic</h3>
          <div className="prose prose-invert prose-sm">
            <p className="text-slate-400 leading-relaxed italic">
              {(run.job as any).logic || 'Apply deep strategy optimization and multi-model routing for this specific intent.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color = 'text-white' }: any) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className={cn("text-xl font-bold tracking-tight", color)}>
        {value}
      </div>
      {subValue && (
        <div className="text-[10px] font-medium text-slate-600 truncate">
          {subValue}
        </div>
      )}
    </div>
  );
}
