'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Users, Activity, MessageSquare, Smartphone, Monitor, Check, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  channelsSupported: string[];
  intentsSupported: string[];
  planConstraints: Record<string, unknown>;
  behavior: Record<string, unknown>;
  activeTenantsCount: number;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAgents(data);
      } else {
        console.error('Invalid agents data:', data);
        setAgents([]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors: Record<string, string> = {
    productivity: 'bg-blue-100 text-blue-700',
    finance: 'bg-green-100 text-green-700',
    support: 'bg-orange-100 text-orange-700',
    sales: 'bg-purple-100 text-purple-700',
    operations: 'bg-slate-100 text-slate-700'
  };

  const channelIcons: Record<string, React.ReactNode> = {
    web: <Monitor className="w-4 h-4" />,
    whatsapp: <Smartphone className="w-4 h-4" />,
    instagram: <MessageSquare className="w-4 h-4" />,
    facebook: <MessageSquare className="w-4 h-4" />,
    tiktok: <Activity className="w-4 h-4" />
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Agentes</h1>
        <p className="text-slate-600 mt-1">Gerencie os agentes de IA da plataforma</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <div className="lg:col-span-2 space-y-4">
          {agents?.map((agent, i) => (
            <motion.div
              key={agent?.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedAgent(agent)}
              className={`bg-white rounded-xl p-6 shadow-sm border cursor-pointer transition-all ${selectedAgent?.id === agent?.id
                ? 'border-purple-500 ring-2 ring-purple-500/20'
                : 'border-slate-200 hover:border-purple-300'
                }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-900">{agent?.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[agent?.category ?? 'operations'] ?? categoryColors.operations}`}>
                      {agent?.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${agent?.status === 'active' ? 'bg-green-100 text-green-700' :
                      agent?.status === 'beta' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                      {agent?.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{agent?.slug}</p>
                  {agent?.description && (
                    <p className="text-sm text-slate-600 mt-2">{agent.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Users className="w-4 h-4" />
                      <span>{agent?.activeTenantsCount ?? 0} tenants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(agent?.channelsSupported ?? [])?.map(channel => (
                        <span key={channel} className="text-slate-400" title={channel}>
                          {channelIcons[channel] ?? <MessageSquare className="w-4 h-4" />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Agent Detail */}
        <div className="lg:col-span-1">
          {selectedAgent ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{selectedAgent?.name}</h3>

              {/* Intents */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Intenções Suportadas</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedAgent?.intentsSupported ?? [])?.map(intent => (
                    <span key={intent} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {intent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Channels */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Canais</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedAgent?.channelsSupported ?? [])?.map(channel => (
                    <span key={channel} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                      {channelIcons[channel]}
                      {channel}
                    </span>
                  ))}
                </div>
              </div>

              {/* Behavior */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Comportamento</h4>
                <ul className="space-y-2 text-sm">
                  {Object.entries((selectedAgent?.behavior as Record<string, unknown>) ?? {})?.map(([key, value]) => (
                    <li key={key} className="flex items-center justify-between">
                      <span className="text-slate-600">{key?.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-slate-900">
                        {typeof value === 'boolean' ? (value ? <Check className="w-4 h-4 text-green-500" /> : '-') : String(value ?? '-')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan Constraints */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Restrições de Plano</h4>
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p className="text-slate-600">
                    Plano mínimo: <span className="font-medium text-slate-900">
                      {(selectedAgent?.planConstraints as Record<string, unknown>)?.min_plan_tier as string ?? 'free'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Configure Button */}
              <button
                onClick={() => router.push(`/admin/agents/${selectedAgent.slug}/config`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                Configurar Agente
              </button>
            </motion.div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center text-slate-500">
              Selecione um agente para ver detalhes
            </div>
          )}
        </div>
      </div>

      {(agents?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          Nenhum agente cadastrado
        </div>
      )}
    </div>
  );
}
