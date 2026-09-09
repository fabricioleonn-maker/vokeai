'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Target, 
  Package, 
  Settings2, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Corporate Identity', icon: Building2 },
  { id: 2, title: 'Strategic Goals', icon: Target },
  { id: 3, title: 'Agent Packs', icon: Package },
  { id: 4, title: 'Operating Profile', icon: Settings2 },
  { id: 5, title: 'Provisioning', icon: Zap },
];

const AGENT_PACKS = [
  { id: 'sales', name: 'Smart Sales', icon: Briefcase, desc: 'Lead generation and sales funnel automation.' },
  { id: 'support', name: 'Tech Support', icon: ShieldCheck, desc: 'Automated troubleshooting and ticket routing.' },
  { id: 'finance', name: 'FinOps AI', icon: Zap, desc: 'Expense analysis and billing automation.' },
  { id: 'service', name: 'Customer Care', icon: Sparkles, desc: '24/7 intelligent response and engagement.' },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    segment: '',
    objectives: [] as string[],
    selectedPacks: [] as string[],
    operationalProfile: 'balanced' as 'conservative' | 'balanced' | 'aggressive',
  });

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(curr => curr + 1);
      // Auto-save logic would go here
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(curr => curr - 1);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30">
      {/* Premium Background FX */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
            <Sparkles size={16} />
            Operating IA Workspace Setup
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Synkra</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Let's configure your AI-driven operation in less than 5 minutes.
          </p>
        </header>

        {/* Progress Tracker */}
        <div className="mb-12">
          <div className="flex justify-between mb-4">
            {STEPS.map((step) => (
              <div 
                key={step.id} 
                className={cn(
                  "flex flex-col items-center gap-2 transition-all duration-300",
                  currentStep >= step.id ? "text-indigo-400" : "text-slate-600"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500",
                  currentStep === step.id ? "bg-indigo-500 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110" :
                  currentStep > step.id ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-slate-900 border-slate-800"
                )}>
                  {currentStep > step.id ? <CheckCircle2 size={20} /> : <step.icon size={20} />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1 bg-slate-900" />
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              <Card className="p-8 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Identify Your Mission Control</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Company Name</label>
                        <Input 
                          placeholder="Ex: Nexus Corp" 
                          className="bg-slate-950/50 border-slate-800 focus:border-indigo-500 h-12 transition-all"
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Industry Segment</label>
                        <Input 
                          placeholder="Ex: E-commerce, Buffets, SaaS" 
                          className="bg-slate-950/50 border-slate-800 focus:border-indigo-500 h-12 transition-all"
                          value={formData.segment}
                          onChange={(e) => setFormData({...formData, segment: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Select Your Agent Packs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {AGENT_PACKS.map(pack => (
                        <div 
                          key={pack.id}
                          onClick={() => {
                            const isSelected = formData.selectedPacks.includes(pack.id);
                            const nextPacks = isSelected 
                              ? formData.selectedPacks.filter(p => p !== pack.id)
                              : [...formData.selectedPacks, pack.id];
                            setFormData({...formData, selectedPacks: nextPacks});
                          }}
                          className={cn(
                            "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 group/pack",
                            formData.selectedPacks.includes(pack.id) 
                              ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                              : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                          )}
                        >
                          <div className="flex gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                              formData.selectedPacks.includes(pack.id) ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-500"
                            )}>
                              <pack.icon size={24} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-white group-hover/pack:text-indigo-400 transition-colors">{pack.name}</h3>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pack.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Choose Operational Profile</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'conservative', title: 'Conservative', desc: 'Prioritize human approval and zero-risk. Lowest cost.', icon: ShieldCheck },
                        { id: 'balanced', title: 'Balanced', desc: 'Equilibrium between speed and control. Smart approvals.', icon: Zap },
                        { id: 'aggressive', title: 'Aggressive', desc: 'Maximum AI autonomy. High speed, minimal human intervention.', icon: Sparkles },
                      ].map(p => (
                        <div 
                          key={p.id}
                          onClick={() => setFormData({...formData, operationalProfile: p.id as any})}
                          className={cn(
                            "p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-6",
                            formData.operationalProfile === p.id 
                              ? "bg-indigo-500/10 border-indigo-500" 
                              : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                          )}
                        >
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center",
                            formData.operationalProfile === p.id ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-500"
                          )}>
                            <p.icon size={28} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-white">{p.title}</h3>
                            <p className="text-sm text-slate-400">{p.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-8 py-12 text-center">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-indigo-500 blur-[40px] opacity-20 animate-pulse" />
                      <div className="w-24 h-24 rounded-3xl bg-indigo-500 text-white flex items-center justify-center relative z-10 mx-auto">
                        <Zap size={48} className="animate-bounce" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white mb-2">Ready to Launch?</h2>
                      <p className="text-slate-400 max-w-sm mx-auto">
                        We've prepared your agent pack and financial ledger. Confirm to initialize your workspace.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-12 flex justify-between items-center bg-slate-950/50 -mx-8 -mb-8 p-6 border-t border-slate-800">
                  <Button 
                    variant="ghost" 
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="mr-2" size={18} /> Back
                  </Button>
                  
                  {currentStep === STEPS.length ? (
                    <Button className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-10 h-12 rounded-xl font-bold shadow-[0_4px_20px_rgba(99,102,241,0.3)] transition-all transform hover:scale-105">
                      Launch Operation <ChevronRight className="ml-2" size={18} />
                    </Button>
                  ) : (
                    <Button 
                      onClick={nextStep}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 h-12 rounded-xl font-bold transition-all"
                    >
                      Continue <ChevronRight className="ml-2" size={18} />
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
