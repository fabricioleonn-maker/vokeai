'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal, 
  Activity, 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Plus,
  BrainCircuit
} from 'lucide-react';
import Link from 'next/link';

interface ScheduledJob {
  id: string;
  name: string;
  intent: string;
  cronExpression: string;
  enabled: boolean;
  environment: string;
  executionMode: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  queueEntries: any[];
}

export default function SchedulerDashboard() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId] = useState('voke-tenant-id'); // Mock or fetch from session
  const [tickLoading, setTickLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      const resp = await fetch(`/api/devos/scheduler?tenantId=${tenantId}`);
      const data = await resp.json();
      setJobs(data);
    } catch (e) {
      console.error('Failed to fetch jobs', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunManual = async (jobId: string) => {
    await fetch('/api/devos/scheduler', {
      method: 'POST',
      body: JSON.stringify({ action: 'run', jobId, tenantId })
    });
    fetchJobs();
  };

  const handleTick = async () => {
    setTickLoading(true);
    await fetch('/api/devos/scheduler?action=tick');
    setTickLoading(false);
    fetchJobs();
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            DevOS Global Scheduler
          </h1>
          <p className="text-zinc-500 mt-1">Orchestrating automated engineering operations</p>
        </div>
        
        <div className="flex gap-4">
          <Link href="/devos/optimization" className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all shadow-lg font-medium">
            <BrainCircuit className="w-4 h-4" />
            Optimization Center
          </Link>

          <button 
            onClick={handleTick}
            disabled={tickLoading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${tickLoading ? 'animate-spin' : ''}`} />
            Force Global Tick
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            New Scheduled Job
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <MetricCard icon={Activity} label="Active Jobs" value={jobs.filter(j => j.enabled).length.toString()} color="blue" />
        <MetricCard icon={Clock} label="Queue Depth" value={jobs.reduce((acc, j) => acc + (j.queueEntries?.filter(q => q.status === 'PENDING').length || 0), 0).toString()} color="amber" />
        <MetricCard icon={CheckCircle2} label="Daily Success" value="98.2%" color="emerald" />
        <MetricCard icon={Shield} label="Risk Shield" value="Strict" color="indigo" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Jobs List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-blue-400" />
            Scheduled Jobs
          </h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-900/50 rounded-xl" />)}
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700/50 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-zinc-200">{job.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        job.environment === 'prod' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {job.environment}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">{job.cronExpression}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-1 italic">"{job.intent}"</p>
                    
                    <div className="flex gap-6 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Last Run: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Next Run: {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'Idle'}
                      </div>
                      {job.queueEntries.some(q => (q.replanCount || 0) > 0) && (
                        <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Replanned: {Math.max(...job.queueEntries.map(q => q.replanCount || 0))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleRunManual(job.id)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-all" title="Run Now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-all" title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* mini queue */}
                {job.queueEntries.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-zinc-800/50">
                    <div className="flex gap-2">
                       {job.queueEntries.map((q: any) => (
                         <div key={q.id} className={`w-2.5 h-2.5 rounded-full ${getStatusColor(q.status)}`} title={`${q.status} @ ${new Date(q.scheduledAt).toLocaleTimeString()}`} />
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Live Queue Panel */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 h-fit sticky top-8">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Live Queue Monitor
          </h2>
          
          <div className="space-y-4">
            {jobs.flatMap(j => (j.queueEntries || []).map((q: any) => ({ ...q, jobName: j.name }))).sort((a,b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()).slice(0, 10).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/30">
                <div className="flex items-center gap-3">
                  <StatusIcon status={item.status} />
                  <div>
                    <div className="text-sm font-medium text-zinc-300">{item.jobName}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {item.status} • {item.environment}
                      {(item.replanCount || 0) > 0 && (
                        <span className="ml-2 text-blue-400 font-bold">REPLAN: {item.replanCount}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                  {new Date(item.scheduledAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {jobs.length === 0 && (
              <div className="text-center py-10 text-zinc-600 italic">No activity detected</div>
            )}
          </div>

          <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl italic">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase mb-1">
              <Shield className="w-3 h-3" />
              Governed Isolation
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Every job is subject to scoped locking (tenant+module+env) and full ValidatorAgent clearance before dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    indigo: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  };

  return (
    <div className={`p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 flex flex-col gap-4 relative overflow-hidden group`}>
      <div className={`p-2 rounded-lg w-fit ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold mt-1 text-zinc-100">{value}</div>
      </div>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity ${colors[color].split(' ')[1]}`} />
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'SUCCEEDED': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'RUNNING': return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
    case 'RETRY_WAIT': return <RotateCcw className="w-4 h-4 text-amber-500" />;
    case 'BLOCKED': return <Shield className="w-4 h-4 text-indigo-400" />;
    default: return <Clock className="w-4 h-4 text-zinc-600" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'SUCCEEDED': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    case 'FAILED': return 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.3)]';
    case 'RUNNING': return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.3)] animate-pulse';
    case 'RETRY_WAIT': return 'bg-amber-500';
    case 'BLOCKED': return 'bg-indigo-600';
    default: return 'bg-zinc-700';
  }
}
