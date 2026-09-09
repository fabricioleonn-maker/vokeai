import React from 'react';
import { Target, Info } from 'lucide-react';
import PolicyManagement from '@/components/devos/policy/PolicyManagement';

export default function PolicyStudioPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-20">
      {/* Header Strategy Bar */}
      <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Target size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Policy Studio</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  DEVELOPMENT
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Tenant ID: devos-core-system</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Status</span>
               <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Active Enforcement
               </span>
             </div>
             <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all">
               <Info size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-8 mt-12">
        <div className="flex flex-col gap-2 mb-12 max-w-2xl">
           <h2 className="text-3xl font-bold text-white tracking-tight">Strategy Configuration</h2>
           <p className="text-slate-400 text-sm leading-relaxed">
             Configure the autonomous behavior of your AI fleet. Changes applied here affect scoring, budget reservation, and human approval gates across all modules in real-time.
           </p>
        </div>

        <PolicyManagement />
      </main>

      {/* Footer Meta */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-[1600px] mx-auto flex justify-end">
           <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full flex items-center gap-4 text-[10px] font-bold text-slate-500 pointer-events-auto shadow-2xl">
              <span>MODEL_DETERMINISM: BALANCED</span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span>GOVERNANCE_v16.1</span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-blue-400">SYNC_OK</span>
           </div>
        </div>
      </div>
    </div>
  );
}
