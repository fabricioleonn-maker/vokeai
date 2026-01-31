'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plug, Users, Calendar, DollarSign, Database, Cloud, Check, X } from 'lucide-react';

interface Integration {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  capabilities: Record<string, unknown>;
  supportedAgents: string[];
  planConstraints: Record<string, unknown>;
  syncStrategy: Record<string, unknown>;
  activeTenantsCount: number;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/admin/integrations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setIntegrations(data);
      } else {
        console.error('Invalid integrations data:', data);
        setIntegrations([]);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    calendar: <Calendar className="w-6 h-6" />,
    finance: <DollarSign className="w-6 h-6" />,
    crm: <Users className="w-6 h-6" />,
    erp: <Database className="w-6 h-6" />,
    storage: <Cloud className="w-6 h-6" />,
    custom: <Plug className="w-6 h-6" />
  };

  const typeColors: Record<string, string> = {
    calendar: 'from-blue-500 to-blue-600',
    finance: 'from-green-500 to-green-600',
    crm: 'from-purple-500 to-purple-600',
    erp: 'from-orange-500 to-orange-600',
    storage: 'from-cyan-500 to-cyan-600',
    custom: 'from-slate-500 to-slate-600'
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
        <h1 className="text-3xl font-bold text-slate-900">Integrações</h1>
        <p className="text-slate-600 mt-1">Gerencie as integrações com sistemas externos</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations?.map((integration, i) => (
          <motion.div
            key={integration?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${typeColors[integration?.type ?? 'custom'] ?? typeColors.custom} p-6 text-white`}>
              <div className="flex items-center justify-between">
                {typeIcons[integration?.type ?? 'custom'] ?? typeIcons.custom}
                <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {integration?.type}
                </span>
              </div>
              <h3 className="text-xl font-bold mt-4">{integration?.name}</h3>
              <p className="text-white/80 text-sm">{integration?.slug}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {integration?.description && (
                <p className="text-slate-600 text-sm mb-4">{integration.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-2 mb-4 text-slate-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{integration?.activeTenantsCount ?? 0} tenant(s) usando</span>
              </div>

              {/* Capabilities */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Capacidades</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries((integration?.capabilities as Record<string, unknown>) ?? {})?.map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      {value ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={value ? 'text-slate-700' : 'text-slate-400'}>
                        {key?.charAt(0)?.toUpperCase() + key?.slice(1)}
                      </span>
                    </div>
                  ))}
                  {Object.keys((integration?.capabilities as Record<string, unknown>) ?? {}).length === 0 && (
                    <span className="text-slate-400 italic">Nenhuma definida</span>
                  )}
                </div>
              </div>

              {/* Supported Agents */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Agentes Suportados</h4>
                <div className="flex flex-wrap gap-2">
                  {(integration?.supportedAgents ?? [])?.map(agent => (
                    <span key={agent} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      {agent?.replace('agent.', '')}
                    </span>
                  ))}
                  {(integration?.supportedAgents ?? []).length === 0 && (
                    <span className="text-slate-400 text-xs italic">Nenhum</span>
                  )}
                </div>
              </div>

              {/* Sync Strategy */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Estratégia de Sync</h4>
                <div className="text-sm text-slate-600">
                  <p>Polling: {String((integration?.syncStrategy as Record<string, unknown>)?.polling_interval_minutes ?? '-')}</p>
                  <p>Sync manual: {(integration?.syncStrategy as Record<string, unknown>)?.manual_sync_supported ? 'Sim' : 'Não'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {(integrations?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          Nenhuma integração cadastrada
        </div>
      )}
    </div>
  );
}
