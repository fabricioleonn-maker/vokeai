'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Activity, 
  BrainCircuit, 
  Settings, 
  ChevronRight,
  MoreVertical,
  Terminal,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function AgentRegistryPage() {
  const [agents, setAgents] = useState([
    {
      id: '1',
      name: 'DevOps Architect',
      key: 'devops-architect',
      role: 'architect',
      specialization: 'Infra & CI/CD',
      status: 'active',
      successRate: 98,
      avgCost: 0.12,
      executions: 1250,
      mode: 'auto'
    },
    {
      id: '2',
      name: 'Security Expert',
      key: 'security-specialist',
      role: 'security',
      specialization: 'Hardening & Audit',
      status: 'active',
      successRate: 99.5,
      avgCost: 0.25,
      executions: 450,
      mode: 'supervised'
    },
    {
      id: '3',
      name: 'Refactor Specialist',
      key: 'refactor-bot',
      role: 'developer',
      specialization: 'Legacy Code Analysis',
      status: 'idle',
      successRate: 85,
      avgCost: 0.08,
      executions: 2800,
      mode: 'auto'
    }
  ]);

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-200">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            Agent Registry
          </h1>
          <p className="text-slate-400 mt-2">Manage your specialized workforce and orchestration rules.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-800 bg-slate-900">
            <Filter size={18} className="mr-2" /> Filter
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus size={18} className="mr-2" /> Register Agent
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: '12', icon: Users, color: 'text-indigo-400' },
          { label: 'Total Executions (24h)', value: '14.2k', icon: Activity, color: 'text-emerald-400' },
          { label: 'Fleet Efficiency', value: '94.2%', icon: BrainCircuit, color: 'text-blue-400' },
          { label: 'Avg Handoff Success', value: '91%', icon: ShieldAlert, color: 'text-amber-400' },
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-800 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-slate-800", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="bg-slate-900 border-slate-800 overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
                    <Terminal size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">KEY: {agent.key}</p>
                  </div>
                </div>
                <Badge className={cn(
                  "uppercase text-[10px] font-bold",
                  agent.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-800 text-slate-500"
                )}>
                  {agent.status}
                </Badge>
              </div>

              <p className="text-sm text-slate-400 mb-6 line-clamp-2">
                Specialized in {agent.specialization}. Optimized for {agent.role} operations with {agent.mode} execution mode.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 uppercase tracking-widest font-bold">Success Rate</span>
                    <span className="text-white font-mono">{agent.successRate}%</span>
                  </div>
                  <Progress value={agent.successRate} className="h-1 bg-slate-800" />
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-800/50">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Avg Cost/Run</p>
                    <p className="text-lg font-mono text-emerald-400">${agent.avgCost.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Executions</p>
                    <p className="text-lg font-mono text-white">{agent.executions.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-950/50 flex justify-between items-center border-t border-slate-800">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-white">
                  <Settings size={16} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-white">
                  <Activity size={16} />
                </Button>
              </div>
              <Button size="sm" className="h-8 bg-slate-800 hover:bg-slate-700 text-white gap-2">
                Configure <ChevronRight size={14} />
              </Button>
            </div>
          </Card>
        ))}

        {/* Add New Card */}
        <Card className="bg-slate-900/30 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-12 group hover:border-indigo-500/50 transition-all cursor-pointer">
          <div className="p-4 rounded-full bg-slate-800 group-hover:bg-indigo-500/20 transition-all">
            <Plus size={32} className="text-slate-500 group-hover:text-indigo-400" />
          </div>
          <p className="text-slate-500 group-hover:text-indigo-400 font-bold uppercase tracking-widest mt-4">Add Agent</p>
        </Card>
      </div>
    </div>
  );
}
