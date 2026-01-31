'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Filter, Calendar, User, Cpu, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string | null;
  userName: string | null;
  agentSlug: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    agentSlug: '',
    action: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters?.agentSlug) params.append('agentSlug', filters.agentSlug);
      if (filters?.action) params.append('action', filters.action);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await res.json();
      setLogs(data ?? []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const actionLabels: Record<string, string> = {
    create_event: 'Criar Evento',
    update_event: 'Atualizar Evento',
    delete_event: 'Excluir Evento',
    create_transaction: 'Criar Transação',
    update_transaction: 'Atualizar Transação',
    update_tenant: 'Atualizar Tenant'
  };

  const agentLabels: Record<string, string> = {
    'agent.secretary': 'Secretária',
    'agent.finance': 'Financeiro'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditoria</h1>
          <p className="text-slate-600 mt-1">Histórico de ações críticas na plataforma</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={filters?.agentSlug}
            onChange={(e) => setFilters(prev => ({ ...prev, agentSlug: e?.target?.value ?? '' }))}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos os agentes</option>
            <option value="agent.secretary">Secretária</option>
            <option value="agent.finance">Financeiro</option>
          </select>
          <select
            value={filters?.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e?.target?.value ?? '' }))}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todas as ações</option>
            <option value="create_event">Criar Evento</option>
            <option value="create_transaction">Criar Transação</option>
            <option value="update_tenant">Atualizar Tenant</option>
          </select>
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
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Data/Hora</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Tenant</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Usuário</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Agente</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Ação</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Entidade</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs ?? [])?.map((log) => (
                <tr key={log?.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900">
                        {format(new Date(log?.createdAt ?? Date.now()), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-900">{log?.tenantName ?? '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-600">{log?.userName ?? 'Sistema'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {log?.agentSlug ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {agentLabels[log.agentSlug] ?? log.agentSlug}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">
                      {actionLabels[log?.action ?? ''] ?? log?.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600">{log?.entityType}</span>
                    {log?.entityId && (
                      <span className="text-slate-400 text-xs ml-1">({log.entityId?.slice(0, 8)}...)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(logs?.length ?? 0) === 0 && (
            <div className="text-center py-12 text-slate-500">
              Nenhum log de auditoria encontrado
            </div>
          )}
        </motion.div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Detalhes do Log</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-slate-500">Ação</label>
                  <p className="font-medium text-slate-900">{actionLabels[selectedLog?.action ?? ''] ?? selectedLog?.action}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Agente</label>
                  <p className="font-medium text-slate-900">{agentLabels[selectedLog?.agentSlug ?? ''] ?? selectedLog?.agentSlug ?? '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Entidade</label>
                  <p className="font-medium text-slate-900">{selectedLog?.entityType}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">ID da Entidade</label>
                  <p className="font-medium text-slate-900 text-sm">{selectedLog?.entityId ?? '-'}</p>
                </div>
              </div>

              {selectedLog?.before && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2">Antes</h4>
                  <pre className="p-4 bg-red-50 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog?.after && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-2">Depois</h4>
                  <pre className="p-4 bg-green-50 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
