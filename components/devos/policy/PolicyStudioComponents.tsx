'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function PolicySection({ title, description, children, icon: Icon }: any) {
  return (
    <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-white/5 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-slate-800 border border-white/5 text-blue-400">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-white leading-none">{title}</h3>
          <p className="text-xs text-slate-500 mt-1.5">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

export function PolicySlider({ label, min, max, step, value, onChange, unit = '', subLabel }: any) {
  return (
    <div className="flex flex-col gap-3 group">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-blue-400 transition-colors">
            {label}
          </span>
          {subLabel && <span className="text-[10px] text-slate-600 mt-0.5">{subLabel}</span>}
        </div>
        <span className="text-lg font-mono font-bold text-white px-3 py-0.5 rounded-lg bg-white/5 border border-white/5">
          {unit}{value}
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all border border-white/5 shadow-inner"
      />
    </div>
  );
}

export function PolicyToggle({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-200">{label}</span>
        <span className="text-[10px] text-slate-500 mt-0.5">{description}</span>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
          checked ? "bg-blue-600" : "bg-slate-700"
        )}
      >
        <span className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300",
          checked ? "translate-x-6" : "translate-x-1"
        )} />
      </button>
    </div>
  );
}
