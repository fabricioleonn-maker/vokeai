'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Plus, Trash2, MessageSquare, Zap,
  Hash, Settings, Eye, Sparkles, GripVertical
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
}

interface FlowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  name: string;
  config: Record<string, unknown>;
}

interface Keyword {
  id: string;
  words: string[];
  action: string;
  response?: string;
}

interface AgentConfig {
  id: string;
  slug: string;
  name: string;
  customPrompt: string;
  tone: 'formal' | 'neutral' | 'casual';
  templates: Template[];
  flowSteps: FlowStep[];
  keywords: Keyword[];
  isActive: boolean;
}

export default function AgentConfigPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'templates' | 'flow' | 'keywords'>('prompt');
  const [previewMessage, setPreviewMessage] = useState('');

  // New template form
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', category: 'geral' });
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  // New keyword form
  const [newKeyword, setNewKeyword] = useState({ words: '', action: 'responder', response: '' });
  const [showKeywordForm, setShowKeywordForm] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [slug]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/admin/agents/${slug}/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        // Initialize with defaults
        setConfig({
          id: '',
          slug,
          name: getAgentName(slug),
          customPrompt: '',
          tone: 'neutral',
          templates: [],
          flowSteps: [],
          keywords: [],
          isActive: true
        });
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (slug: string) => {
    const names: Record<string, string> = {
      'agent.secretary': 'Secretária Virtual',
      'agent.finance': 'Agente Financeiro',
      'agent.support.n1': 'Atendimento N1',
      'agent.sales': 'Vendas',
      'agent.productivity': 'Produtividade'
    };
    return names[slug] || slug;
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/agents/${slug}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = () => {
    if (!config || !newTemplate.name || !newTemplate.content) return;

    // Extract variables from content (e.g., {nome_cliente})
    const variables = (newTemplate.content.match(/\{([^}]+)\}/g) || []).map(v => v.slice(1, -1));

    const template: Template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      content: newTemplate.content,
      variables,
      category: newTemplate.category
    };

    setConfig({ ...config, templates: [...config.templates, template] });
    setNewTemplate({ name: '', content: '', category: 'geral' });
    setShowTemplateForm(false);
  };

  const removeTemplate = (id: string) => {
    if (!config) return;
    setConfig({ ...config, templates: config.templates.filter(t => t.id !== id) });
  };

  const addKeyword = () => {
    if (!config || !newKeyword.words) return;

    const keyword: Keyword = {
      id: Date.now().toString(),
      words: newKeyword.words.split(',').map(w => w.trim().toLowerCase()),
      action: newKeyword.action,
      response: newKeyword.response
    };

    setConfig({ ...config, keywords: [...config.keywords, keyword] });
    setNewKeyword({ words: '', action: 'responder', response: '' });
    setShowKeywordForm(false);
  };

  const removeKeyword = (id: string) => {
    if (!config) return;
    setConfig({ ...config, keywords: config.keywords.filter(k => k.id !== id) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configurar {config.name}
            </h1>
            <p className="text-gray-500">Personalize templates, fluxos e comportamento</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'prompt', label: 'Prompt & Tom', icon: Sparkles },
          { id: 'templates', label: 'Templates', icon: MessageSquare },
          { id: 'flow', label: 'Fluxo Automatizado', icon: Zap },
          { id: 'keywords', label: 'Palavras-Chave', icon: Hash }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        {/* Prompt & Tone Tab */}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tom de Voz
              </label>
              <div className="flex gap-3">
                {[
                  { id: 'formal', label: 'Formal', desc: 'Linguagem profissional' },
                  { id: 'neutral', label: 'Neutro', desc: 'Equilibrado e acessível' },
                  { id: 'casual', label: 'Casual', desc: 'Amigável com emojis' }
                ].map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => setConfig({ ...config, tone: tone.id as typeof config.tone })}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${config.tone === tone.id
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="font-medium">{tone.label}</div>
                    <div className="text-sm text-gray-500">{tone.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instruções Personalizadas
              </label>
              <textarea
                value={config.customPrompt}
                onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
                rows={8}
                placeholder="Adicione instruções específicas para este agente...\n\nExemplos:\n- Sempre mencionar o nome da empresa\n- Oferecer desconto de 10% para novos clientes\n- Não falar sobre concorrentes"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Estas instruções serão adicionadas ao prompt base do agente.
              </p>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Templates de Mensagem</h3>
              <button
                onClick={() => setShowTemplateForm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
              >
                <Plus className="w-4 h-4" /> Novo Template
              </button>
            </div>

            {showTemplateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <input
                  type="text"
                  placeholder="Nome do template"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="geral">Geral</option>
                  <option value="saudacao">Saudação</option>
                  <option value="cobranca">Cobrança</option>
                  <option value="confirmacao">Confirmação</option>
                  <option value="followup">Follow-up</option>
                </select>
                <textarea
                  placeholder="Conteúdo do template...\nUse {variavel} para campos dinâmicos"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTemplate}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowTemplateForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(config?.templates ?? []).map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-cyan-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {template.category}
                      </span>
                    </div>
                    <button
                      onClick={() => removeTemplate(template.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {template.content.length > 150
                      ? template.content.slice(0, 150) + '...'
                      : template.content}
                  </p>
                  {(template?.variables ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span key={v} className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded">
                          {'{' + v + '}'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(config?.templates ?? []).length === 0 && !showTemplateForm && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum template configurado</p>
                <p className="text-sm">Crie templates para respostas rápidas e padronizadas</p>
              </div>
            )}
          </div>
        )}

        {/* Flow Tab */}
        {activeTab === 'flow' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Fluxo Automatizado</h3>
              <button className="flex items-center gap-2 px-3 py-2 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
                <Plus className="w-4 h-4" /> Adicionar Passo
              </button>
            </div>

            <div className="space-y-3">
              {/* Default flow steps */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div className="flex-1">
                  <div className="text-xs text-blue-600 font-medium">TRIGGER</div>
                  <div className="font-medium">Usuário envia mensagem</div>
                </div>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div className="flex-1">
                  <div className="text-xs text-green-600 font-medium">AÇÃO</div>
                  <div className="font-medium">Detectar Intenção com IA</div>
                </div>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div className="flex-1">
                  <div className="text-xs text-purple-600 font-medium">AÇÃO</div>
                  <div className="font-medium">Gerar Resposta Inteligente</div>
                </div>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div className="flex-1">
                  <div className="text-xs text-orange-600 font-medium">CONDIÇÃO</div>
                  <div className="font-medium">Se ação crítica → Pedir confirmação</div>
                </div>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              O fluxo automático já está configurado com IA. Personalize usando Prompts e Palavras-Chave.
            </p>
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Palavras-Chave Rápidas</h3>
              <button
                onClick={() => setShowKeywordForm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
              >
                <Plus className="w-4 h-4" /> Nova Regra
              </button>
            </div>

            {showKeywordForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <input
                  type="text"
                  placeholder="Palavras-chave (separadas por vírgula)"
                  value={newKeyword.words}
                  onChange={(e) => setNewKeyword({ ...newKeyword, words: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={newKeyword.action}
                  onChange={(e) => setNewKeyword({ ...newKeyword, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="responder">Responder automaticamente</option>
                  <option value="transferir">Transferir para humano</option>
                  <option value="template">Enviar template</option>
                  <option value="ignorar">Ignorar</option>
                </select>
                {newKeyword.action === 'responder' && (
                  <textarea
                    placeholder="Resposta automática..."
                    value={newKeyword.response}
                    onChange={(e) => setNewKeyword({ ...newKeyword, response: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowKeywordForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {(config?.keywords ?? []).map((keyword) => (
                <div
                  key={keyword.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-1">
                      {(keyword?.words ?? []).map((word) => (
                        <span key={word} className="px-2 py-1 bg-cyan-100 text-cyan-700 text-sm rounded">
                          {word}
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm text-gray-600 capitalize">{keyword.action}</span>
                  </div>
                  <button
                    onClick={() => removeKeyword(keyword.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {(config?.keywords ?? []).length === 0 && !showKeywordForm && (
              <div className="text-center py-8 text-gray-500">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma palavra-chave configurada</p>
                <p className="text-sm">Crie regras para ações automáticas baseadas em palavras</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
