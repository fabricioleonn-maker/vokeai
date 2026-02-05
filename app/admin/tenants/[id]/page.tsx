'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, MessageSquare, Calendar, DollarSign, Cpu, Plug, Save } from 'lucide-react';
import Link from 'next/link';

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: { id: string; name: string; tier?: string; limits: Record<string, unknown>; features?: Record<string, unknown> } | null;
  agentConfigs: { agentSlug: string; enabled: boolean; agent: { name: string } }[];
  integrationConfigs: { integrationSlug: string; enabled: boolean; integration: { name: string } }[];
  stats: { users: number; conversations: number; calendarEvents: number; financialTxns: number };
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedStatus, setEditedStatus] = useState('');

  useEffect(() => {
    if (params?.id) {
      fetchTenant();
    }
  }, [params?.id]);

  const fetchTenant = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${params?.id}`);
      if (!res.ok) throw new Error('Tenant not found');
      const data = await res.json();
      setTenant(data);
      setEditedName(data?.name ?? '');
      setEditedStatus(data?.status ?? 'active');
    } catch (error) {
      console.error('Error fetching tenant:', error);
      router.push('/admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/tenants/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName, status: editedStatus })
      });
      setTenant(prev => prev ? { ...prev, name: editedName, status: editedStatus } : null);
    } catch (error) {
      console.error('Error saving tenant:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div>
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Voltar para Tenants
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{tenant?.name}</h1>
          <p className="text-slate-600 mt-1">Slug: {tenant?.slug}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: 'Usuários', value: tenant?.stats?.users ?? 0 },
          { icon: MessageSquare, label: 'Conversas', value: tenant?.stats?.conversations ?? 0 },
          { icon: Calendar, label: 'Eventos', value: tenant?.stats?.calendarEvents ?? 0 },
          { icon: DollarSign, label: 'Transações', value: tenant?.stats?.financialTxns ?? 0 },
        ].map((stat) => (
          <motion.div
            key={stat?.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3">
              <stat.icon className="w-5 h-5 text-purple-500" />
              <span className="text-slate-600">{stat?.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stat?.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Informações Básicas</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nome</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e?.target?.value ?? '')}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
              <select
                value={editedStatus}
                onChange={(e) => setEditedStatus(e?.target?.value ?? 'active')}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Plano</label>
              <div className="px-4 py-2 bg-slate-50 rounded-lg">
                {tenant?.plan?.name ?? 'Sem plano'}
                {tenant?.plan?.tier && <span className="text-slate-500 ml-2">({tenant.plan.tier})</span>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Agent Configs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900">Agentes Configurados</h2>
          </div>
          {(tenant?.agentConfigs?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {tenant?.agentConfigs?.map((config) => (
                <div key={config?.agentSlug} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{config?.agent?.name}</p>
                    <p className="text-sm text-slate-500">{config?.agentSlug}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${config?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {config?.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">Nenhum agente configurado</p>
          )}
        </motion.div>

        {/* Integration Configs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <Plug className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900">Integrações Configuradas</h2>
          </div>
          {(tenant?.integrationConfigs?.length ?? 0) > 0 ? (
            <div className="grid md:grid-cols-2 gap-3">
              {tenant?.integrationConfigs?.map((config) => (
                <div key={config?.integrationSlug} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{config?.integration?.name}</p>
                    <p className="text-sm text-slate-500">{config?.integrationSlug}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${config?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {config?.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">Nenhuma integração configurada</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
