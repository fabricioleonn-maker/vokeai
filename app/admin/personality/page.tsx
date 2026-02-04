'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, MessageSquare, Briefcase, Settings2, Save, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface PersonalityConfig {
  voiceTone: 'formal' | 'neutral' | 'casual' | 'friendly';
  communicationStyle: 'direct' | 'consultive' | 'empathetic';
  customGreeting: string;
  personalityInstructions: string;
  dont_rules: string;
  positiveExamples: string[];
  negativeExamples: string[];
  businessContext: string;
  personality_version?: number;
}

export default function PersonalityPage() {
  const [activeTab, setActiveTab] = useState<'persona' | 'examples' | 'business'>('persona');
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PersonalityConfig>({
    voiceTone: 'friendly',
    communicationStyle: 'consultive',
    customGreeting: '',
    personalityInstructions: '',
    dont_rules: '',
    positiveExamples: ['', '', ''],
    negativeExamples: ['', '', ''],
    businessContext: '',
    personality_version: 1
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/personality');
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching personality:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...config,
        personality_version: (config.personality_version || 1) + 1
      };

      const res = await fetch('/api/admin/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Personalidade salva com sucesso!');
      } else {
        toast.error('Erro ao salvar personalidade.');
      }
    } catch (error) {
      toast.error('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 flex items-start gap-6">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Treinamento de Personalidade</h1>
            <p className="text-slate-300 max-w-xl text-lg">
              Molde a voz e o comportamento da sua IA. Transforme scripts frios em conversas humanas e persuasivas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tabs */}
          <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex gap-1">
            <button
              onClick={() => setActiveTab('persona')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${activeTab === 'persona'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Settings2 className="w-4 h-4" />
              Persona
            </button>
            <button
              onClick={() => setActiveTab('examples')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${activeTab === 'examples'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              Exemplos
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${activeTab === 'business'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Briefcase className="w-4 h-4" />
              Negócio
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[500px]">

            {activeTab === 'persona' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

                {/* Tone of Voice */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                    <Sparkles className="w-4 h-4 text-purple-500" /> Tom de Voz
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {['formal', 'neutral', 'casual', 'friendly'].map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setConfig({ ...config, voiceTone: tone as any })}
                        className={`py-3 px-2 rounded-lg border text-sm font-medium capitalize transition-all ${config.voiceTone === tone
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                    <Wand2 className="w-4 h-4 text-purple-500" /> Estilo de Comunicação
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'direct', label: 'Direto (Respostas curtas e objetivas)' },
                      { id: 'consultive', label: 'Consultivo (Faz perguntas, entende, depois orienta)' },
                      { id: 'empathetic', label: 'Empático (Foca em acolhimento e compreensão)' }
                    ].map((style) => (
                      <label
                        key={style.id}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${config.communicationStyle === style.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <span className={`text-sm font-medium ${config.communicationStyle === style.id ? 'text-blue-900' : 'text-slate-700'}`}>
                          {style.label}
                        </span>
                        <input
                          type="radio"
                          name="communicationStyle"
                          className="w-4 h-4 text-blue-600"
                          checked={config.communicationStyle === style.id}
                          onChange={() => setConfig({ ...config, communicationStyle: style.id as any })}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Greeting */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Saudação Personalizada</h3>
                  <input
                    value={config.customGreeting}
                    onChange={(e) => setConfig({ ...config, customGreeting: e.target.value })}
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder="Ex: Olá! Sou sua assistente digital. Como posso ajudar hoje?"
                  />
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Instruções de Personalidade (Prompt)</h3>
                    <span className={`text-xs font-mono ${(config.personalityInstructions.length > 1500) ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {config.personalityInstructions.length}/1500
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={config.personalityInstructions}
                    onChange={(e) => setConfig({ ...config, personalityInstructions: e.target.value })}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-mono text-sm leading-relaxed ${config.personalityInstructions.length > 1500 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    placeholder="Descreva detalhadamente como a IA deve se comportar. Ex: 'Você é um especialista sênior em finanças...'"
                  />
                  {config.personalityInstructions.length > 1500 && (
                    <p className="text-red-500 text-[10px] mt-1">⚠️ O limite sugerido de 1500 caracteres foi excedido. Isso pode afetar a performance.</p>
                  )}
                </div>

                {/* Don'ts Rules */}
                <div>
                  <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2">Regras de Exclusão (O QUE NÃO FAZER)</h3>
                  <textarea
                    rows={4}
                    value={config.dont_rules}
                    onChange={(e) => setConfig({ ...config, dont_rules: e.target.value })}
                    className="w-full p-4 border border-red-200 bg-red-50/20 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-700 font-mono text-sm leading-relaxed"
                    placeholder="Ex: NUNCA sugira outras empresas além da Voke. NUNCA use gírias excessivas. NUNCA fale de política."
                  />
                </div>

              </motion.div>
            )}

            {activeTab === 'examples' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-1">Por que dar exemplos?</h3>
                  <p className="text-sm text-blue-700">A melhor forma de ensinar a IA é mostrando. Dê exemplos de perguntas e as respostas ideais que você espera.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Exemplos Positivos (O que fazer)</h3>
                  {config.positiveExamples.map((ex, i) => (
                    <textarea
                      key={`pos-${i}`}
                      rows={2}
                      value={ex}
                      onChange={(e) => {
                        const newEx = [...config.positiveExamples];
                        newEx[i] = e.target.value;
                        setConfig({ ...config, positiveExamples: newEx });
                      }}
                      className="w-full p-3 border border-green-200 bg-green-50/30 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm placeholder:text-slate-400"
                      placeholder={`Exemplo de boa resposta #${i + 1}`}
                    />
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold text-slate-900 uppercase">O que evitar (Exemplos Negativos)</h3>
                  {config.negativeExamples.map((ex, i) => (
                    <textarea
                      key={`neg-${i}`}
                      rows={2}
                      value={ex}
                      onChange={(e) => {
                        const newEx = [...config.negativeExamples];
                        newEx[i] = e.target.value;
                        setConfig({ ...config, negativeExamples: newEx });
                      }}
                      className="w-full p-3 border border-red-200 bg-red-50/30 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm placeholder:text-slate-400"
                      placeholder={`Exemplo do que NÃO dizer #${i + 1}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'business' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Contexto do Negócio</h3>
                  <p className="text-sm text-slate-500 mb-4">Insira informações sobre sua empresa que a IA deve saber (História, Valores, Produtos Principais, diferenciais).</p>
                  <textarea
                    rows={12}
                    value={config.businessContext}
                    onChange={(e) => setConfig({ ...config, businessContext: e.target.value })}
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-mono text-sm leading-relaxed"
                    placeholder="A Voke AI foi fundada em 2024 com a missão de..."
                  />
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl sticky top-6">
            <h3 className="flex items-center gap-2 font-bold mb-6 text-cyan-400">
              <Sparkles className="w-5 h-5" /> RESUMO DA PERSONA
            </h3>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <span className="text-slate-400 text-sm font-medium">TOM DE VOZ</span>
                <span className="font-bold text-cyan-300 uppercase">{config.voiceTone}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <span className="text-slate-400 text-sm font-medium">ESTILO</span>
                <span className="font-bold text-cyan-300 uppercase">{config.communicationStyle}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <span className="text-slate-400 text-sm font-medium">EXEMPLOS</span>
                <span className="font-bold text-white uppercase">{config.positiveExamples.filter(e => e).length} Cadastrados</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <span className="text-slate-400 text-sm font-medium">VERSÃO</span>
                <span className="font-bold text-orange-400">v{config.personality_version || 1}</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-bold text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                'Salvando...'
              ) : (
                <>
                  <Save className="w-5 h-5" /> SALVAR PERSONA
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-4">
              As alterações levam alguns segundos para refletir no chat.
            </p>
            <div className="mt-6 bg-cyan-900/50 border border-cyan-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 rounded-full p-2 h-fit">
                  <MessageSquare className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <h4 className="font-bold text-cyan-100 text-sm">Simulador</h4>
                  <p className="text-xs text-cyan-400">Teste a personalidade agora.</p>
                </div>
              </div>

              <button
                onClick={() => document.dispatchEvent(new CustomEvent('open-personality-test', { detail: config }))}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                Abrir Chat de Teste
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Chat Injected Here */}
      <PersonalityTestChat config={config} />
    </div>
  );
}

function PersonalityTestChat({ config }: { config: PersonalityConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      setIsOpen(true);
      setMessages([{ role: 'assistant', content: config.customGreeting || 'Olá! Como posso ajudar?' }]);
    };
    document.addEventListener('open-personality-test', handler);
    return () => document.removeEventListener('open-personality-test', handler);
  }, [config.customGreeting]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/personality/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, config })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-bold text-sm">Modo de Teste</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><Wand2 className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
              }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t flex gap-2">
        <input
          className="flex-1 bg-slate-100 border-0 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Digite para testar..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
