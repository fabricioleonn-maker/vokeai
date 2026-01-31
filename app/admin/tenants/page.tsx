'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Eye, ToggleLeft, ToggleRight, Plus, X, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: { id: string; name: string; tier: string } | null;
  usersCount: number;
  conversationsCount: number;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', planId: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTenants(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.tenants)) {
        setTenants(data.tenants);
      } else {
        console.error('Invalid tenants data:', data);
        setTenants([]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    const newStatus = tenant?.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/api/admin/tenants/${tenant?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setTenants(prev => prev?.map(t =>
        t?.id === tenant?.id ? { ...t, status: newStatus } : t
      ) ?? []);
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const createTenant = async () => {
    if (!formData.name || !formData.slug) {
      setFormError('Nome e slug são obrigatórios');
      return;
    }
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', slug: '', planId: '' });
        setFormError('');
        fetchTenants();
      } else {
        const data = await res.json();
        setFormError(data?.error ?? 'Erro ao criar tenant');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      setFormError('Erro ao criar tenant');
    }
  };

  const updateTenant = async () => {
    if (!editingTenant || !formData.name) {
      setFormError('Nome é obrigatório');
      return;
    }
    try {
      const res = await fetch(`/api/admin/tenants/${editingTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, planId: formData.planId || null })
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingTenant(null);
        setFormData({ name: '', slug: '', planId: '' });
        setFormError('');
        fetchTenants();
      } else {
        const data = await res.json();
        setFormError(data?.error ?? 'Erro ao atualizar tenant');
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
      setFormError('Erro ao atualizar tenant');
    }
  };

  const deleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Tem certeza que deseja excluir o tenant "${tenant.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTenants();
      } else {
        alert('Erro ao excluir tenant');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Erro ao excluir tenant');
    }
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({ name: tenant.name, slug: tenant.slug, planId: tenant.plan?.id ?? '' });
    setFormError('');
    setShowEditModal(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const filteredTenants = tenants?.filter(t =>
    t?.name?.toLowerCase()?.includes?.(search?.toLowerCase()) ||
    t?.slug?.toLowerCase()?.includes?.(search?.toLowerCase())
  ) ?? [];

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700'
  };

  const TenantModal = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Editar Tenant' : 'Novo Tenant'}
          </h2>
          <button
            onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  name,
                  slug: isEdit ? prev.slug : generateSlug(name)
                }));
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Nome do cliente"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="slug-do-cliente"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plano</label>
            <select
              value={formData.planId}
              onChange={(e) => setFormData(prev => ({ ...prev, planId: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecione um plano</option>
              {(plans ?? []).map(plan => (
                <option key={plan.id} value={plan.id}>{plan.name} ({plan.tier})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={isEdit ? updateTenant : createTenant}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {isEdit ? 'Salvar' : 'Criar Tenant'}
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div>
      {showCreateModal && <TenantModal />}
      {showEditModal && <TenantModal isEdit />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-600 mt-1">Gerencie os clientes da plataforma</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tenant..."
              value={search}
              onChange={(e) => setSearch(e?.target?.value ?? '')}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', slug: '', planId: '' });
              setFormError('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Tenant
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Tenant</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Plano</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Usuários</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Conversas</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filteredTenants ?? []).map((tenant) => (
                <tr key={tenant?.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{tenant?.name}</p>
                        <p className="text-sm text-slate-500">{tenant?.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tenant?.plan ? (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierColors[tenant.plan?.tier ?? 'free'] ?? tierColors.free}`}>
                        {tenant.plan?.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${tenant?.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : tenant?.status === 'blocked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                      {tenant?.status === 'active' ? 'Ativo' : tenant?.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{tenant?.usersCount ?? 0}</td>
                  <td className="px-6 py-4 text-slate-600">{tenant?.conversationsCount ?? 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/tenants/${tenant?.id}`}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => openEditModal(tenant)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(tenant)}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={tenant?.status === 'active' ? 'Desativar' : 'Ativar'}
                      >
                        {tenant?.status === 'active' ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteTenant(tenant)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(filteredTenants?.length ?? 0) === 0 && (
            <div className="text-center py-12 text-slate-500">
              Nenhum tenant encontrado
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
