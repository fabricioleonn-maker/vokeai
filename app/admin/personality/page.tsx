'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Save,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Palette,
  Loader2,
  Plus,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import type { AIPersonality } from '@/lib/types';

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

const defaultPersonality: AIPersonality = {
  voiceTone: 'friendly',
  communicationStyle: 'consultive',
  personalityInstructions: '',
  positiveExamples: [],
  negativeExamples: [],
  businessContext: '',
  customGreeting: '',
  situationHandlers: {}
};

export default function PersonalityPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [personality, setPersonality] = useState<AIPersonality>(defaultPersonality);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [newPositiveExample, setNewPositiveExample] = useState('');
  const [newNegativeExample, setNewNegativeExample] = useState('');
  const [activeTab, setActiveTab] = useState('personality');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchPersonality(selectedTenant);
    }
  }, [selectedTenant]);

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      const tenantList = Array.isArray(data) ? data : (data?.tenants || []);
      setTenants(tenantList);
      if (tenantList.length > 0) {
        setSelectedTenant(tenantList[0].id);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPersonality(tenantId: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/personality?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.personality) {
        setPersonality({ ...defaultPersonality, ...data.personality });
      }
    } catch (err) {
      console.error('Error fetching personality:', err);
    } finally {
      setLoading(false);
    }
  }

  async function savePersonality() {
    try {
      setSaving(true);
      setError('');
      setSaved(false);

      const res = await fetch('/api/admin/personality', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenant,
          personality
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Erro ao salvar personalidade. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function addPositiveExample() {
    if (newPositiveExample.trim()) {
      setPersonality((prev: AIPersonality) => ({
        ...prev,
        positiveExamples: [...prev.positiveExamples, newPositiveExample.trim()]
      }));
      setNewPositiveExample('');
    }
  }

  function addNegativeExample() {
    if (newNegativeExample.trim()) {
      setPersonality((prev: AIPersonality) => ({
        ...prev,
        negativeExamples: [...prev.negativeExamples, newNegativeExample.trim()]
      }));
      setNewNegativeExample('');
    }
  }

  function removeExample(type: 'positive' | 'negative', index: number) {
    if (type === 'positive') {
      setPersonality((prev: AIPersonality) => ({
        ...prev,
        positiveExamples: prev.positiveExamples.filter((_: string, i: number) => i !== index)
      }));
    } else {
      setPersonality((prev: AIPersonality) => ({
        ...prev,
        negativeExamples: prev.negativeExamples.filter((_: string, i: number) => i !== index)
      }));
    }
  }

  const tabs = [
    { id: 'personality', label: 'Persona', icon: Brain },
    { id: 'examples', label: 'Exemplos', icon: MessageSquare },
    { id: 'context', label: 'Negócio', icon: Building2 },
    { id: 'situations', label: 'Cenários', icon: Palette }
  ];

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl border border-white/10"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -ml-32 -mb-32" />

        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg border border-white/20">
            <Brain className="w-10 h-10" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black tracking-tight">Treinamento de Personalidade</h1>
            <p className="text-slate-400 mt-2 max-w-xl text-lg leading-relaxed">
              Molde a voz e o comportamento da sua IA. Transforme scripts frios em conversas humanas e persuasivas.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Settings */}
        <div className="lg:col-span-8 space-y-6">

          {/* Tenant & Navigation */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Selecione o Cliente</label>
              <select
                value={selectedTenant}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenant(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white font-bold text-slate-700 transition-all cursor-pointer"
              >
                {(tenants ?? []).map((tenant: Tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex p-2 gap-1 bg-slate-50/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all ${activeTab === tab.id
                    ? 'bg-white text-cyan-600 shadow-md border border-slate-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                    }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-cyan-500' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl p-8 min-h-[500px]">
            {activeTab === 'personality' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-500" /> Tom de Voz
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['formal', 'neutral', 'casual', 'friendly'] as const).map((tone) => (
                        <button
                          key={tone}
                          onClick={() => setPersonality((p: AIPersonality) => ({ ...p, voiceTone: tone }))}
                          className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${personality.voiceTone === tone
                            ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" /> Estilo
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {(['direct', 'consultive', 'empathetic'] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => setPersonality((p: AIPersonality) => ({ ...p, communicationStyle: style }))}
                          className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${personality.communicationStyle === style
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                          {personality.communicationStyle === style && <CheckCircle className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Saudação Personalizada</label>
                  <input
                    type="text"
                    value={personality.customGreeting || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPersonality((p: AIPersonality) => ({ ...p, customGreeting: e.target.value }))}
                    placeholder="Ex: Olá! Sou sua assistente digital. Como posso ajudar hoje?"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-500/10 font-medium text-slate-700 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Instruções de Personalidade</label>
                  <textarea
                    value={personality.personalityInstructions}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality((p: AIPersonality) => ({ ...p, personalityInstructions: e.target.value }))}
                    rows={8}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-cyan-500/10 font-medium text-slate-700 transition-all resize-none leading-relaxed"
                    placeholder="Descreva traits específicos... Ex: Seja empático, nunca use termos técnicos, etc."
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'examples' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-emerald-700 uppercase tracking-widest">Respostas Ideais (Do's)</label>
                    <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-100 rounded-full">{personality.positiveExamples.length} EXEMPLOS</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPositiveExample}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPositiveExample(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addPositiveExample()}
                      className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                      placeholder="Adicione um exemplo positivo..."
                    />
                    <button onClick={addPositiveExample} className="px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-lg shadow-emerald-500/20">
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {(personality?.positiveExamples ?? []).map((ex: string, i: number) => (
                      <div key={i} className="group flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium text-emerald-900">{ex}</span>
                        <button onClick={() => removeExample('positive', i)} className="text-emerald-200 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-red-700 uppercase tracking-widest">Evitar (Don'ts)</label>
                    <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-100 rounded-full">{personality.negativeExamples.length} EXEMPLOS</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNegativeExample}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewNegativeExample(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addNegativeExample()}
                      className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                      placeholder="Adicione um exemplo negativo..."
                    />
                    <button onClick={addNegativeExample} className="px-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all shadow-lg shadow-red-500/20">
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {(personality?.negativeExamples ?? []).map((ex: string, i: number) => (
                      <div key={i} className="group flex items-center gap-3 p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium text-red-900">{ex}</span>
                        <button onClick={() => removeExample('negative', i)} className="text-red-200 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'context' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full">
                <div className="flex flex-col h-full space-y-4">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-500" /> Contexto do Negócio
                  </label>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Descreva o DNA da empresa, produtos e como ela quer ser percebida.
                  </p>
                  <textarea
                    value={personality.businessContext}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality((p: AIPersonality) => ({ ...p, businessContext: e.target.value }))}
                    className="flex-1 w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-slate-700 transition-all resize-none leading-relaxed"
                    placeholder="Ex: Somos uma consultoria focada em alta performance..."
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'situations' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Palette className="w-5 h-5 text-purple-500" /> Manipuladores de Situação
                </label>

                {([
                  { key: 'planQuestion', label: 'Perguntas Sobre Planos' },
                  { key: 'technicalIssue', label: 'Problemas Técnicos' },
                  { key: 'complaint', label: 'Reclamações de Clientes' },
                  { key: 'priceObjection', label: 'Objeção de Preço' }
                ] as const).map((sit) => (
                  <div key={sit.key} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{sit.label}</label>
                    <textarea
                      value={(personality.situationHandlers as any)?.[sit.key] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality((p: AIPersonality) => ({
                        ...p,
                        situationHandlers: { ...p.situationHandlers, [sit.key]: e.target.value }
                      }))}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/5 font-medium text-slate-700 transition-all resize-none h-24"
                      placeholder={`Como reagir em ${sit.label.toLowerCase()}...`}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column: Preview & Save */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 border border-white/10 shadow-2xl sticky top-8">
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Resumo da Persona
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tom de Voz</span>
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{personality.voiceTone}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estilo</span>
                  <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{personality.communicationStyle}</span>
                </div>
              </div>

            </div>

            {/* Situational Handlers display */}
            {personality?.situationHandlers && Object.keys(personality.situationHandlers).length > 0 && (
              <div className="pt-4 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Respostas para Situações</h4>
                {personality.situationHandlers.planQuestion && (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[10px] text-white/70">
                    <strong>Plano:</strong> {personality.situationHandlers.planQuestion.substring(0, 50)}...
                  </div>
                )}
                {personality.situationHandlers.priceObjection && (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[10px] text-white/70">
                    <strong>Preço:</strong> {personality.situationHandlers.priceObjection.substring(0, 50)}...
                  </div>
                )}
              </div>
            )}

            <div className="pt-6">
              <button
                onClick={savePersonality}
                disabled={saving}
                className="w-full relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'PROCESSANDO...' : 'SALVAR PERSONA'}
                </div>
              </button>

              {saved && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-4 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  ✨ Salvo com sucesso!
                </motion.p>
              )}

              {error && (
                <p className="text-center mt-4 text-red-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  ❌ {error}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5">
            <div className="flex items-start gap-3 p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-cyan-200 font-medium leading-relaxed">
                DICA: Use o Modo de Teste na Landing Page para validar como estas configurações afetam a conversa em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
