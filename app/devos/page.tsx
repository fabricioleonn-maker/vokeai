'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Brain,
  Cpu,
  Zap,
  Shield,
  Database,
  Search,
  Terminal,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DevOsDashboard() {
  const [stats, setStats] = useState({
    activeSessions: 0,
    successRate: 0,
    blockedTasks: 0,
    totalSessions: 0,
    totalTasks: 0,
  });

  useEffect(() => {
    // Fetch real metrics from the dashboard API
    fetch('/api/devos/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized or Server Error');
        return res.json();
      })
      .then(data => {
        if (!data || !data.counts) return;
        setStats({
          activeSessions: data.counts.active || 0,
          successRate: Math.round((data.quality?.avgScore || 0) * 10),
          blockedTasks: data.counts.blocked || 0,
          totalSessions: data.counts.sessions || 0,
          totalTasks: data.counts.tasks || 0,
        });
      })
      .catch(err => {
        console.error("Error fetching dashboard stats:", err);
      });
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest">
          DevOS Dashboard
        </h1>
        <div className="flex items-center gap-2 text-[#94A3B8] text-[11px] font-medium uppercase tracking-wider">
          <Terminal size={12} className="text-[#3B82F6]" />
          <span>Kernel v1.1.0-stable</span>
          <span className="text-[#26262A]">|</span>
          <span>Sincronizado com Synkra Core</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: stats.activeSessions, icon: Brain, trend: '+2 this week' },
          { label: 'Total Tasks', value: stats.totalTasks || stats.totalSessions * 4, icon: Activity, trend: `${stats.successRate}% success` },
          { label: 'Resource Load', value: '38.4%', icon: Cpu, trend: 'Stable' },
          { label: 'System Health', value: 'Secure', icon: Shield, trend: 'Protected' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#151517] border border-[#26262A] p-5 rounded-xl hover:border-[#3B82F6]/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{stat.label}</p>
              <stat.icon size={16} className="text-[#64748B] group-hover:text-[#3B82F6] transition-colors" />
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
              <span className="text-[9px] font-bold text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-[#151517] border border-[#26262A] p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-[#3B82F6]" />
              Cognitive History
            </h3>
            <div className="flex items-center gap-4 text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                Cycles
              </span>
              <span className="flex items-center gap-1.5 opacity-50">
                <span className="w-2 h-2 rounded-full bg-[#26262A]" />
                Latency
              </span>
            </div>
          </div>
          
          <div className="h-48 flex items-end gap-1.5 pb-2">
            {[40, 65, 45, 90, 85, 60, 75, 55, 95, 80, 70, 85, 60, 50, 70, 90, 80, 45, 60, 75].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/80 rounded-t-sm transition-all relative group" 
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0A0A0B] border border-[#26262A] text-[9px] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {h} cycles
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[9px] font-bold text-[#64748B] uppercase tracking-tighter">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>Agora</span>
          </div>
        </div>

        {/* DevOS Kernel Status Section */}
        <div className="bg-[#151517] border border-[#26262A] p-6 rounded-xl space-y-6">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Shield size={14} className="text-[#3B82F6]" />
            Kernel Status
          </h3>
          
          <div className="space-y-3">
            {[
              { name: 'Orchestrator', status: 'ONLINE', color: '#22C55E' },
              { name: 'Memory Layer', status: 'ACTIVE', color: '#22C55E' },
              { name: 'Runtime Guard', status: 'PROTECTED', color: '#3B82F6' },
              { name: 'Explainability', status: 'READY', color: '#3B82F6' },
              { name: 'MCP Bridge', status: 'STANDBY', color: '#94A3B8' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F0F10] border border-[#26262A]/50">
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'ONLINE' || s.status === 'ACTIVE' ? 'animate-pulse' : ''}`} style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] font-semibold text-slate-200">{s.name}</span>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-80" style={{ color: s.color }}>{s.status}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="p-3.5 rounded-lg bg-[#0A0A0B] border border-[#26262A] font-mono text-[10px] leading-relaxed">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#26262A]/50">
                <span className="text-[#3B82F6] font-bold flex items-center gap-1.5">
                  <Terminal size={10} />
                  BOOT.LOG
                </span>
                <span className="text-[#64748B] opacity-50">v1.1.0</span>
              </div>
              <div className="space-y-1">
                <div className="text-[#94A3B8]"><span className="text-[#3B82F6] opacity-50">17:04:12</span> [SYS] Kernel init...</div>
                <div className="text-[#94A3B8]"><span className="text-[#3B82F6] opacity-50">17:04:13</span> [MEM] Memory sync OK</div>
                <div className="text-[#94A3B8]"><span className="text-[#3B82F6] opacity-50">17:04:15</span> [SEC] Guard active</div>
                <div className="text-emerald-500/70 animate-pulse"><span className="text-[#3B82F6] opacity-50">17:04:47</span> [OK] Listening...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
