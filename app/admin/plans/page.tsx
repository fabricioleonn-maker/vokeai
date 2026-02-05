'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Users, Cpu, Check, X } from 'lucide-react';

interface PlanLimits {
  messages_per_month?: number | null;
  agent_actions_per_month?: number | null;
}

interface PlanFeatures {
  auto_execution?: boolean;
  multi_agent_flows?: boolean;
  advanced_financial_processing?: boolean;
  file_generation?: boolean;
  white_label?: boolean;
  enabled_agents?: string[];
}

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier?: string;
  limits: PlanLimits;
  features?: PlanFeatures;
  billing?: { price_monthly?: number; price_yearly?: number; currency?: string };
  status?: string;
  tenantsCount: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data);
      } else {
        console.error('Invalid plans data:', data);
        setPlans([]);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const tierColors: Record<string, string> = {
    free: 'from-gray-400 to-gray-500',
    basic: 'from-blue-400 to-blue-600',
    pro: 'from-purple-400 to-purple-600',
    enterprise: 'from-amber-400 to-amber-600'
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
        <h1 className="text-3xl font-bold text-slate-900">Planos</h1>
        <p className="text-slate-600 mt-1">Gerencie os planos comerciais da plataforma</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.map((plan, i) => (
          <motion.div
            key={plan?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${tierColors[plan?.tier ?? 'free'] ?? tierColors.free} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <CreditCard className="w-8 h-8" />
                <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {plan?.tier}
                </span>
              </div>
              <h3 className="text-2xl font-bold mt-4">{plan?.name}</h3>
              {plan?.description && (
                <p className="text-white/80 text-sm mt-1">{plan.description}</p>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Stats */}
              <div className="flex items-center gap-2 mb-4 text-slate-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{plan?.tenantsCount ?? 0} tenant(s) usando</span>
              </div>

              {/* Limits */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Limites</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between text-slate-600">
                    <span>Mensagens/mês</span>
                    <span className="font-medium">
                      {plan?.limits?.messages_per_month === null ? 'Ilimitado' : String(plan?.limits?.messages_per_month ?? '-')}
                    </span>
                  </li>
                  <li className="flex items-center justify-between text-slate-600">
                    <span>Ações de agente/mês</span>
                    <span className="font-medium">
                      {plan?.limits?.agent_actions_per_month === null ? 'Ilimitado' : String(plan?.limits?.agent_actions_per_month ?? '-')}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Recursos</h4>
                <ul className="space-y-2 text-sm">
                  {[
                    { key: 'auto_execution', value: plan?.features?.auto_execution },
                    { key: 'multi_agent_flows', value: plan?.features?.multi_agent_flows },
                    { key: 'advanced_financial_processing', value: plan?.features?.advanced_financial_processing },
                    { key: 'file_generation', value: plan?.features?.file_generation },
                    { key: 'white_label', value: plan?.features?.white_label }
                  ].map((item) => (
                    <li key={item.key} className="flex items-center gap-2">
                      {item.value ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={item.value ? 'text-slate-700' : 'text-slate-400'}>
                        {item.key?.replace(/_/g, ' ')?.replace(/^\w/, c => c?.toUpperCase())}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enabled Agents */}
              {(plan?.features?.enabled_agents?.length ?? 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Agentes Habilitados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(plan?.features?.enabled_agents ?? [])?.map((agent) => (
                      <span key={agent} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {agent?.replace('agent.', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {(plans?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          Nenhum plano cadastrado
        </div>
      )}
    </div>
  );
}
