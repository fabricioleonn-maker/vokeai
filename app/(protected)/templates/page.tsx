'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Rocket, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  BarChart3, 
  Zap, 
  Search,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const TEMPLATES = [
  {
    id: 'sales-funnel',
    title: 'Precision Sales Funnel',
    desc: 'End-to-end lead qualification, follow-up automation, and CRM synchronization.',
    category: 'Sales',
    agents: 3,
    roi: '4.2x',
    difficulty: 'Easy',
    icon: Rocket,
    color: 'from-orange-500 to-rose-500'
  },
  {
    id: 'support-sync',
    title: 'Customer Support Sync',
    desc: '24/7 ticket resolution engine with automatic escalation to human specialists.',
    category: 'Service',
    agents: 2,
    roi: '3.1x',
    difficulty: 'Easy',
    icon: Users,
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'finance-audit',
    title: 'Autonomous Finance Audit',
    desc: 'Real-time expense tracking, anomaly detection, and automated reporting.',
    category: 'Finance',
    agents: 4,
    roi: '6.8x',
    difficulty: 'Advanced',
    icon: DollarSign,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'content-engine',
    title: 'Operational Content Engine',
    desc: 'Multi-agent creative workflow for marketing, documentation, and social media.',
    category: 'Marketing',
    agents: 3,
    roi: '2.5x',
    difficulty: 'Medium',
    icon: Sparkles,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'security-watch',
    title: 'SaaS Risk Guardian',
    desc: 'Continuous monitoring of operational flows with automatic fraud detection.',
    category: 'Security',
    agents: 2,
    roi: 'High',
    difficulty: 'Medium',
    icon: ShieldCheck,
    color: 'from-rose-500 to-red-500'
  },
  {
    id: 'data-analyzer',
    title: 'Strategic Insights Bot',
    desc: 'Large-scale data processing and executive summary generation.',
    category: 'Analytics',
    agents: 2,
    roi: '5.0x',
    difficulty: 'Advanced',
    icon: BarChart3,
    color: 'from-indigo-500 to-blue-500'
  }
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
              <Zap size={14} className="animate-pulse" /> Ready to Deploy
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Mission Templates</h1>
            <p className="text-slate-400 mt-2 text-lg">Activate pre-configured AI workflows in one click.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input 
                placeholder="Search templates..." 
                className="pl-10 bg-slate-900/50 border-slate-800 focus:border-indigo-500 h-11"
              />
            </div>
            <Button variant="outline" className="border-slate-800 h-11 px-4">
              <Filter size={18} />
            </Button>
          </div>
        </header>

        {/* Categories Bar */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-none">
          {['All Templates', 'Sales', 'Service', 'Finance', 'Marketing', 'Security', 'Analytics'].map((cat, i) => (
            <Button 
              key={cat} 
              variant={i === 0 ? 'default' : 'ghost'} 
              className={cn(
                "rounded-full px-6 h-9 transition-all text-sm font-medium",
                i === 0 ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TEMPLATES.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group h-full bg-slate-900/40 border-slate-800/50 backdrop-blur-xl hover:border-indigo-500/30 transition-all duration-500 overflow-hidden flex flex-col">
                {/* Visual Header */}
                <div className={cn(
                  "h-2 w-full bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity",
                  template.color
                )} />
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-950/50 border border-slate-800 group-hover:scale-110 transition-all duration-500",
                      "text-transparent bg-clip-text bg-gradient-to-br",
                      template.color
                    )}>
                      <template.icon size={32} className="text-white" />
                    </div>
                    <Badge variant="outline" className="bg-slate-950/50 border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-tighter">
                      {template.difficulty}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {template.desc}
                  </p>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-indigo-400" />
                        {template.agents} Specialist Agents
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 size={14} className="text-emerald-400" />
                        {template.roi} ROI
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50 flex gap-4">
                      <Button className="flex-1 bg-white text-slate-950 hover:bg-slate-100 font-bold rounded-xl h-11 text-sm">
                        Activate Template
                      </Button>
                      <Button variant="outline" className="w-11 h-11 p-0 rounded-xl border-slate-800 hover:border-slate-700">
                        <ArrowRight size={20} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CheckCircle2 size={16} className="text-indigo-500" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom Banner */}
        <Card className="mt-12 p-8 bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border-indigo-500/20 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative group">
          <div className="absolute right-[-5%] top-[-20%] opacity-10 group-hover:scale-110 transition-transform duration-1000">
             <Rocket size={240} className="text-indigo-500" />
          </div>
          <div className="relative z-10 text-center md:text-left">
            <h3 className="text-2xl font-black text-white leading-tight">Need a custom AI workflow?</h3>
            <p className="text-indigo-200 mt-2 max-w-lg">Our consulting team can build bespoke specialist agents tailored to your specific enterprise architecture.</p>
          </div>
          <Button className="relative z-10 bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-12 px-8 rounded-xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">
            Request Custom Build
          </Button>
        </Card>
      </div>
    </div>
  );
}
