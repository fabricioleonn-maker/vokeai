import React from 'react';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BudgetManager } from '@/lib/devos/v3/budget-manager';
import { CostForecastEngine } from '@/lib/devos/v3/cost-forecast-engine';
import { BudgetInsightsEngine } from '@/lib/devos/v3/budget-insights-engine';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  History, 
  PieChart, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle,
  Clock
} from 'lucide-react';

export const revalidate = 60; // Refresh every minute

export default async function FinancialControlCenter() {
  const tenantId = '00000000-0000-0000-0000-000000000000'; // Mocked root tenant for now
  
  // 1. Fetch Core Data
  const budget = await BudgetManager.getBudgetStatus(tenantId);
  const forecast = await CostForecastEngine.analyze(tenantId);
  const insights = await BudgetInsightsEngine.generate(tenantId);
  
  // 2. Fetch Recent Decision Logs (Phase 12)
  const budgetLogs = await (prisma as any).devOsBudgetLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Calculate some derived metrics
  const usagePercentage = (budget.spent / budget.total) * 100;
  const reservePercentage = (budget.reserved / budget.total) * 100;

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-in initial-slide-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-950 p-8 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
               <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Financial Control Center</h1>
          </div>
          <p className="text-zinc-500 text-lg">AI Execution Budgeting & Real-time Cost Governance</p>
        </div>

        <div className="flex items-center gap-4 relative z-10">
           <div className="text-right">
              <div className="text-xs font-bold text-zinc-500 uppercase">System Status</div>
              <div className="text-emerald-400 font-bold flex items-center gap-2 justify-end">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                 Active Guard
              </div>
           </div>
           <Badge className={`px-6 py-3 text-lg font-black border-2 shadow-lg ${
             budget.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
             budget.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
             'bg-red-500/10 text-red-400 border-red-500/20'
           }`}>
             {budget.status}
           </Badge>
        </div>
        
        {/* Background glow */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full" />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <BudgetStatCard 
          label="Current Spend" 
          value={`$${budget.spent.toFixed(2)}`} 
          percent={usagePercentage} 
          color="emerald"
          icon={TrendingUp}
        />
        <BudgetStatCard 
          label="Reserved" 
          value={`$${budget.reserved.toFixed(2)}`} 
          percent={reservePercentage} 
          color="blue"
          icon={Clock}
        />
        <BudgetStatCard 
          label="Projected End" 
          value={`$${forecast.predictedSpend.toFixed(2)}`} 
          subText={`Risk: ${forecast.riskLevel}`} 
          color={forecast.riskLevel === 'CRITICAL' ? 'red' : 'amber'}
          icon={PieChart}
        />
        <BudgetStatCard 
          label="Remaining" 
          value={`$${budget.remaining.toFixed(2)}`} 
          percent={100 - usagePercentage - reservePercentage} 
          color="zinc"
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BUDGET AUDIT LOG */}
        <Card className="lg:col-span-2 bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden border-t-4 border-t-emerald-500/50">
          <CardHeader className="p-6 border-b border-zinc-800 bg-zinc-900/40 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-emerald-400" />
              Budget Guard Decisions
            </CardTitle>
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">REAL-TIME</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Run ID</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {budgetLogs.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-zinc-600 italic">No budget transactions recovered yet.</td></tr>
                  ) : budgetLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="px-6 py-4 italic">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-white group-hover:text-emerald-400">{log.type}</span>
                           <span className="text-[10px] text-zinc-600 truncate max-w-[150px]">{log.reason}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-mono text-zinc-500">{log.runId?.substring(0, 8) || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-white">${log.amount.toFixed(4)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          className={log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}
                          variant="outline"
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 text-[10px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* INSIGHTS & POLICIES */}
        <div className="space-y-6">
           <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col gap-4">
              <h3 className="text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Budget Insights
              </h3>
              <div className="space-y-3">
                 {insights.map((insight, i) => (
                   <div key={i} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-start gap-3">
                         {insight.type === 'WARNING' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                         <div>
                            <div className="text-sm font-bold text-white mb-1">{insight.title}</div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">{insight.description}</p>
                            {insight.potentialSavings && (
                              <div className="mt-2 text-[10px] font-black text-emerald-400">Potential Savings: ${insight.potentialSavings.toFixed(2)}</div>
                            )}
                         </div>
                      </div>
                   </div>
                 ))}
                 {insights.length === 0 && <p className="text-zinc-600 text-xs italic">All systems performing within optimal financial parameters.</p>}
              </div>
           </Card>

           <Card className="bg-zinc-950 border-zinc-800 p-8 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden group">
              <div className="bg-emerald-500/10 p-4 rounded-full">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Cycle Progress</h3>
              <div className="text-4xl font-black text-emerald-400 tracking-tighter">{usagePercentage.toFixed(1)}%</div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${usagePercentage}%` }} />
              </div>
              <p className="text-zinc-500 text-[10px]">Refilling in {forecast.daysRemaining} days</p>
              
              {/* Animation decoration */}
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
           </Card>
        </div>

      </div>
    </div>
  );
}

function BudgetStatCard({ label, value, percent, subText, color, icon: Icon }: any) {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    zinc: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 relative overflow-hidden group hover:border-zinc-700 transition-all">
       <CardContent className="p-6">
          <div className={`p-2 w-fit rounded-lg mb-4 ${colors[color]}`}>
             <Icon className="w-5 h-5" />
          </div>
          <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{label}</div>
          <div className="text-2xl font-black text-white my-1 group-hover:translate-x-1 transition-transform">{value}</div>
          {percent !== undefined ? (
             <div className="text-[10px] font-mono text-zinc-600">{percent.toFixed(1)}% of total</div>
          ) : (
             <div className="text-[10px] font-bold text-amber-500 uppercase">{subText}</div>
          )}
          
          <div className={`absolute -right-4 -bottom-4 w-12 h-12 blur-2xl opacity-10 ${colors[color]}`} />
       </CardContent>
    </Card>
  );
}
