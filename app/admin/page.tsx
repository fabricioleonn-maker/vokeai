'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Cpu, FileText, Activity, TrendingUp, CheckCircle } from 'lucide-react';

interface Stats {
  overview: {
    totalTenants: number;
    activeTenants: number;
    activeConversations: number;
    activeAgents: number;
    totalAuditLogs: number;
  };
  recentActivity: { id: string; tenantName: string; channel: string; updatedAt: string }[];
  agentUsage: { agent: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const agentLabels: Record<string, { name: string; emoji: string; color: string }> = {
    'agent.secretary': { name: 'Secretária Virtual', emoji: '📅', color: 'bg-blue-500' },
    'agent.finance': { name: 'Financeiro', emoji: '💰', color: 'bg-emerald-500' },
    'agent.support.n1': { name: 'Atendimento', emoji: '💬', color: 'bg-orange-500' },
    'agent.sales': { name: 'Vendas', emoji: '🎯', color: 'bg-purple-500' },
    'agent.productivity': { name: 'Produtividade', emoji: '📝', color: 'bg-cyan-500' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do Voke AI</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Tenants', value: stats?.overview?.totalTenants ?? 0, bg: 'bg-blue-50', iconBg: 'bg-blue-500', iconColor: 'text-white' },
          { icon: CheckCircle, label: 'Tenants Ativos', value: stats?.overview?.activeTenants ?? 0, bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', iconColor: 'text-white' },
          { icon: MessageSquare, label: 'Conversas', value: stats?.overview?.activeConversations ?? 0, bg: 'bg-cyan-50', iconBg: 'bg-cyan-500', iconColor: 'text-white' },
          { icon: Cpu, label: 'Agentes Ativos', value: stats?.overview?.activeAgents ?? 0, bg: 'bg-orange-50', iconBg: 'bg-orange-500', iconColor: 'text-white' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${stat.bg} rounded-2xl p-5 border border-gray-100`}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3 shadow-lg`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-gray-600 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Agent Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Uso de Agentes</h2>
          </div>
          {(stats?.agentUsage?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              {stats?.agentUsage?.map((agent) => {
                const info = agentLabels[agent?.agent ?? ''] || { name: agent?.agent, emoji: '🤖', color: 'bg-gray-500' };
                return (
                  <div key={agent?.agent} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${info.color} flex items-center justify-center shadow-lg`}>
                      <span className="text-lg">{info.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{info.name}</p>
                      <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (agent?.count ?? 0) * 10)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{agent?.count ?? 0}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Nenhum uso registrado ainda</p>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Atividade Recente</h2>
          </div>
          {(stats?.recentActivity?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {stats?.recentActivity?.map((activity) => (
                <div key={activity?.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {(activity?.tenantName ?? 'T').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{activity?.tenantName ?? 'Tenant'}</p>
                    <p className="text-xs text-gray-500">Canal: {activity?.channel ?? 'web'}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-lg">
                    {new Date(activity?.updatedAt ?? Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Nenhuma atividade recente</p>
          )}
        </motion.div>
      </div>

      {/* Audit Logs Count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-cyan-500/25"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Logs de Auditoria</h2>
            </div>
            <p className="text-cyan-100 mt-2 text-sm">Todas as ações críticas são registradas automaticamente</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{stats?.overview?.totalAuditLogs ?? 0}</p>
            <p className="text-cyan-100 text-sm">registros totais</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
