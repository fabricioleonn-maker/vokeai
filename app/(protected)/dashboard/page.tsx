'use client';

import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Target, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  BarChart3,
  Users
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ExecutiveDashboard() {
  const stats = [
    { label: 'AI Savings (Estimated)', value: '$12,450.00', change: '+12%', icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Operations Automated', value: '1,284', change: '+24%', icon: Zap, color: 'text-indigo-400' },
    { label: 'Human Time Saved', value: '420h', change: '+8%', icon: Clock, color: 'text-blue-400' },
    { label: 'Success Rate', value: '98.2%', change: '+0.4%', icon: Target, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Executive Control Center</h1>
            <p className="text-slate-400 mt-1">Operational ROI and IA Fleet optimization summary.</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-white">
              Export Report
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Scale Operation
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="p-6 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon size={64} className={stat.color} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                <span className="text-3xl font-black text-white">{stat.value}</span>
                <span className={cn("text-xs font-medium", stat.color)}>
                  {stat.change} vs last month
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Mid Section: Charts & Efficiency */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visual: Optimization Graph Placeholder */}
          <Card className="lg:col-span-2 p-8 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold text-white">Efficiency Growth</h3>
                <p className="text-sm text-slate-500">Autonomous vs Human-Assisted tasks over time.</p>
              </div>
              <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Autonomous</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700" /> Human</div>
              </div>
            </div>
            
            {/* Chart Placeholder (Simulated with CSS) */}
            <div className="h-[300px] w-full flex items-end gap-3 mt-4">
              {[60, 45, 75, 55, 90, 85, 95, 80, 100, 92, 98, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group/bar cursor-pointer">
                  <div 
                    className="w-full bg-indigo-500/20 group-hover/bar:bg-indigo-500/40 transition-all rounded-t-sm" 
                    style={{ height: `${h}%` }}
                  >
                    <div 
                      className="w-full bg-indigo-500 rounded-t-sm" 
                      style={{ height: `${h * 0.7}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 text-center opacity-0 group-hover/bar:opacity-100 transition-opacity">M{i+1}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Side: Alerts & Insights */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white px-2">Operational Alerts</h3>
            <div className="space-y-4">
              {[
                { title: 'Credit Threshold Reach', desc: 'Finance operation will hit soft limit in 4 days.', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
                { title: 'Policy Optimization', desc: 'Aggressive mode could save +$450/mo in Sales.', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                { title: 'High Approval Volume', desc: 'Customer Care requires 42 manual approvals today.', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' },
              ].map((alert, i) => (
                <div key={i} className={cn("p-4 rounded-2xl border transition-all hover:translate-x-1 cursor-pointer", alert.bg)}>
                  <div className="flex gap-4">
                    <alert.icon size={20} className={alert.color} />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{alert.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Card className="p-6 bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.3)] border-none text-white relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform">
                <BarChart3 size={120} />
              </div>
              <h4 className="font-black text-xl mb-1">Upgrade to Enterprise</h4>
              <p className="text-indigo-100 text-xs mb-4">Unlock advanced simulation and cross-tenant agents.</p>
              <Button size="sm" className="bg-white text-indigo-600 hover:bg-slate-100 font-bold">Explore Plans</Button>
            </Card>
          </div>
        </div>

        {/* Bottom Section: Active Agent Pack Utilization */}
        <Card className="p-8 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl">
          <h3 className="text-xl font-bold text-white mb-6">Active Agent Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { pack: 'Smart Sales', usage: 85, success: 94, economy: '$4.2k' },
              { pack: 'Tech Support', usage: 60, success: 99, economy: '$2.1k' },
              { pack: 'Finance AI', usage: 30, success: 100, economy: '$6.1k' },
            ].map((p, i) => (
              <div key={i} className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-white">{p.pack}</span>
                  <span className="text-xs font-mono text-emerald-400">{p.economy} saved</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <span>Capacity Usage</span>
                    <span>{p.usage}%</span>
                  </div>
                  <Progress value={p.usage} className="h-1 bg-slate-800" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  {p.success}% Precision Score
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
