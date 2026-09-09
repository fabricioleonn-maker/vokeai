'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Wallet, 
  Shield, 
  Cpu, 
  CreditCard, 
  Lock, 
  Bell, 
  HelpCircle,
  Plus,
  ChevronRight,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('billing');

  const nav = [
    { id: 'general', label: 'Company Profile', icon: Building2 },
    { id: 'billing', label: 'Wallet & Billing', icon: Wallet },
    { id: 'fleet', label: 'AI Fleet', icon: Cpu },
    { id: 'policy', label: 'Safety & Policy', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-3xl font-black text-white tracking-tight">Command Center Settings</h1>
          <p className="text-slate-500 mt-1">Manage your enterprise AI ecosystem and financial controls.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Nav */}
          <div className="lg:col-span-1 space-y-2">
            {nav.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                    : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <AnimateContent keyId={activeTab}>
              {activeTab === 'billing' && (
                <div className="space-y-8">
                  {/* Wallet Card */}
                  <Card className="p-8 bg-gradient-to-br from-slate-900 to-indigo-950/30 border-slate-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                      <Wallet size={160} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[3px] text-indigo-400">Available Credits</span>
                        <div className="text-5xl font-black text-white leading-none">$1,245.80</div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          Ledger verified and secure
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button className="bg-white text-slate-950 hover:bg-slate-100 font-bold h-12 px-8 rounded-xl">
                          Add Credits <Plus size={18} className="ml-2" />
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Plan Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-slate-900/40 border-slate-800 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-white">Current Plan</h3>
                          <Badge className="bg-emerald-500 text-white border-none font-bold">PRO PLAN</Badge>
                        </div>
                        <Button variant="ghost" className="text-indigo-400 text-xs font-bold h-auto p-0 hover:bg-transparent">
                          Edit Subscription <ExternalLink size={12} className="ml-1" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Monthly Executions</span>
                            <span>8,421 / 10,000</span>
                          </div>
                          <Progress value={84} className="h-1 bg-slate-800" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Agent Capacity</span>
                            <span>12 / 20 Active</span>
                          </div>
                          <Progress value={60} className="h-1 bg-slate-800" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 bg-indigo-600/10 border-indigo-500/20 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                        <Zap size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-white">Unlock Enterprise</h3>
                        <p className="text-xs text-slate-500 max-w-[200px]">Access custom agents, unlimited scale, and dedicated GPU nodes.</p>
                      </div>
                      <Button size="sm" className="bg-indigo-600 text-white font-bold px-6">Explore Enterprise</Button>
                    </Card>
                  </div>

                  {/* Transaction List Placeholder */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                       <CreditCard size={20} className="text-indigo-400" /> Recent Activity
                    </h3>
                    {[
                      { type: 'DEBIT', ref: 'Job #4281', amount: '-$0.124', date: '2 min ago' },
                      { type: 'DEBIT', ref: 'Job #4280', amount: '-$0.042', date: '15 min ago' },
                      { type: 'CREDIT', ref: 'Stripe Refill', amount: '+$500.00', date: '2 hours ago' },
                      { type: 'RESERVE', ref: 'Job #4282', amount: '$0.500', date: 'Pending' },
                    ].map((tx, i) => (
                      <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-slate-800/50 bg-slate-900/20 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            tx.type === 'CREDIT' ? "bg-emerald-500" : tx.type === 'RESERVE' ? "bg-amber-500" : "bg-indigo-500"
                          )} />
                          <div>
                            <div className="text-sm font-bold text-white">{tx.ref}</div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{tx.type} • {tx.date}</div>
                          </div>
                        </div>
                        <div className={cn(
                          "font-mono font-bold",
                          tx.type === 'CREDIT' ? "text-emerald-400" : "text-white"
                        )}>{tx.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'fleet' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Active AI Specialist Fleet</h3>
                    <Button size="sm" className="bg-indigo-600 text-white font-bold"><Plus size={16} className="mr-1" /> Add Agent</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                       { name: 'Lead Qualifier', role: 'Sales Specialist', cost: '$0.12/run', health: 99 },
                       { name: 'Financial Auditor', role: 'Risk Analyst', cost: '$0.45/run', health: 100 },
                       { name: 'Ticket Dispatcher', role: 'Service Router', cost: '$0.05/run', health: 98 },
                       { name: 'Policy Guardian', role: 'Compliance', cost: '$0.20/run', health: 100 },
                     ].map((agent, i) => (
                       <Card key={i} className="p-4 bg-slate-900/40 border-slate-800 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-400 border border-slate-800">
                             <Cpu size={24} />
                           </div>
                           <div>
                             <h4 className="font-bold text-white">{agent.name}</h4>
                             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{agent.role}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="text-xs font-mono text-emerald-400">{agent.health}% Health</div>
                           <Switch defaultChecked className="mt-2 scale-75 data-[state=checked]:bg-indigo-500" />
                         </div>
                       </Card>
                     ))}
                  </div>
                </div>
              )}

              {activeTab === 'policy' && (
                <div className="space-y-8">
                   <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Autonomous Governance Strategy</h3>
                    <p className="text-sm text-slate-500">Defina como a inteligência do Synkra deve se comportar em relação ao risco e custo.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'c', title: 'Maximum Safety', desc: 'Enforce human approval for ANY action with cost > $1.00 or high variance.', icon: Shield },
                      { id: 'b', title: 'Balanced Efficiency', desc: 'Auto-approve routine actions. Only alert on anomaly/high-risk flows.', icon: Zap },
                      { id: 'a', title: 'Full Autonomy', desc: 'Trust AI for all operations. Only stop for catastrophic failure patterns.', icon: Sparkles },
                    ].map((p, i) => (
                      <div key={i} className={cn(
                        "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-6",
                        i === 1 ? "bg-indigo-600/10 border-indigo-500" : "bg-slate-900/20 border-slate-800 hover:border-slate-700"
                      )}>
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center",
                          i === 1 ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-600"
                        )}>
                          <p.icon size={28} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-lg">{p.title}</h4>
                          <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
                        </div>
                        {i === 1 && <CheckCircle2 className="text-indigo-500" />}
                      </div>
                    ))}
                  </div>

                  <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex gap-4">
                     <AlertCircle className="text-amber-500 shrink-0" size={24} />
                     <div className="space-y-1">
                        <h4 className="font-bold text-amber-500">Policy Alert</h4>
                        <p className="text-xs text-amber-500/80 leading-relaxed">Current "Balanced" strategy is saving 40% more than the Conservative model tested last week. Switching back may increase human overhead by 12h/week.</p>
                     </div>
                  </div>
                </div>
              )}
            </AnimateContent>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimateContent({ children, keyId }: { children: React.ReactNode, keyId: string }) {
  return (
    <motion.div
      key={keyId}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
