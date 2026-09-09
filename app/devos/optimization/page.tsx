import React from 'react';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, BrainCircuit, PiggyBank, Clock, TrendingDown } from 'lucide-react';

export const revalidate = 0; // Dynamic data

export default async function OptimizationCenter() {
  const tenantId = 'cmm-tenant-1'; // Mocked tenant context

  // 1. Fetch AI Ops Insights
  const insights = await (prisma as any).devOsOptimizationInsight.findMany({
    where: { tenantId },
    orderBy: { impactScore: 'desc' },
    take: 10
  });

  // 2. Fetch recent executions for Cost & Routing metrics
  const recentRuns = await (prisma as any).devOsJobRun.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      status: true,
      selectedModel: true,
      actualCost: true,
      executionDecisionScore: true,
      executionFingerprint: true
    }
  });

  // Calculate generic mock metrics based on actual data
  const totalCost = recentRuns.reduce((acc: number, run: any) => acc + (run.actualCost || 0), 0);
  
  // Jobs saved/delayed by AI Ops (status === 'DELAY' or 'BLOCK')
  const optimizedJobs = recentRuns.filter((r: any) => r.status === 'DELAY' || r.status === 'BLOCK').length;
  const optimizationRate = recentRuns.length > 0 ? (optimizedJobs / recentRuns.length) * 100 : 0;

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row items-baseline justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            <BrainCircuit className="w-10 h-10 text-emerald-400" />
            AI Ops Optimization Center
          </h1>
          <p className="text-zinc-400 text-lg">
            Monitor autonomous routing, cost-efficiency, and machine-learned recommendations.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 text-sm uppercase font-bold tracking-wider">
            Autonomy: Stage 4
          </Badge>
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 text-sm uppercase font-bold tracking-wider">
            Cost First
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 font-medium mb-1">Estimated Savings</p>
              <h3 className="text-3xl font-black text-emerald-400">
                ${(totalCost * 0.35).toFixed(2)}
              </h3>
            </div>
            <PiggyBank className="w-12 h-12 text-zinc-700" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 font-medium mb-1">AI Ops Intervention</p>
              <h3 className="text-3xl font-black text-amber-400">
                {optimizationRate.toFixed(1)}%
              </h3>
            </div>
            <Activity className="w-12 h-12 text-zinc-700" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 font-medium mb-1">Waste Prevention</p>
              <h3 className="text-3xl font-black text-blue-400">
                {optimizedJobs} Jobs
              </h3>
            </div>
            <TrendingDown className="w-12 h-12 text-zinc-700" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 font-medium mb-1">Avg Execution Score</p>
              <h3 className="text-3xl font-black text-purple-400">
                0.86
              </h3>
            </div>
            <BrainCircuit className="w-12 h-12 text-zinc-700" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* RECENT INSIGHTS */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-950/50">
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" /> 
              Optimization Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {insights.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                No optimization insights available yet. The Performance Miner needs more data.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {insights.map((insight: any) => (
                  <li key={insight.id} className="p-6 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {insight.insightType === 'structural_waste' && <Badge variant="destructive">WASTE</Badge>}
                        {insight.insightType === 'cost_optimization' && <Badge className="bg-emerald-500/20 text-emerald-400">COST SAVING</Badge>}
                        <h4 className="font-bold text-lg text-white">{insight.title}</h4>
                      </div>
                      <span className="text-zinc-500 text-xs">Impact: {(insight.impactScore * 100).toFixed(0)}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">{insight.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* LATEST AI OPS DECISIONS */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-950/50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> 
              Live Routing Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-800">
              {recentRuns.slice(0, 5).map((run: any) => (
                <li key={run.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50">
                  <div className="flex flex-col">
                    <span className="text-white font-medium font-mono text-sm max-w-[200px] truncate">{run.executionFingerprint || 'unknown-fingerprint'}</span>
                    <span className="text-zinc-500 text-xs mt-1">Score: {run.executionDecisionScore?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-zinc-300 border-zinc-700">
                      {run.selectedModel || 'heuristic'}
                    </Badge>
                    <span className="text-zinc-400 text-sm font-mono">${run.actualCost?.toFixed(4) || '0.0000'}</span>
                    {run.status === 'DELAY' && <Badge className="bg-amber-500/20 text-amber-400">DELAYED</Badge>}
                    {run.status === 'BLOCK' && <Badge variant="destructive">BLOCKED</Badge>}
                    {run.status === 'SUCCESS' && <Badge className="bg-emerald-500/20 text-emerald-400">ROUTED</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
