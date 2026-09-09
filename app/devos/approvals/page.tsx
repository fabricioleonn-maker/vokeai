'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  ShieldAlert,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// Mocking the data for preview - in real use, this will fetch from an API route
const MOCK_APPROVALS = [
  {
    id: "app_123",
    tenantId: "tenant_alpha",
    jobId: "infra_provisioning",
    status: "PENDING",
    approvalLevel: "HIGH",
    reasons: ["DESTRUCTIVE_OPERATION_IN_PRODUCTION", "HIGH_RISK_SCORE: 85"],
    estimatedCost: 1.45,
    estimatedRisk: 85,
    createdAt: new Date().toISOString(),
    contextSnapshot: {
      strategy: "GPT-4o (Max Reliability)",
      model: "gpt-4o",
      confidence: 0.92
    }
  },
  {
    id: "app_124",
    tenantId: "voke_internal",
    jobId: "security_audit",
    status: "PENDING",
    approvalLevel: "MEDIUM",
    reasons: ["COST_EXCEEDS_AUTO_APPROVE_LIMIT: $6.50 > $5.00"],
    estimatedCost: 6.50,
    estimatedRisk: 40,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    contextSnapshot: {
      strategy: "Audit Engine v2",
      model: "gpt-4o-mini",
      confidence: 0.88
    }
  }
];

export default function DevOsApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/devos/approvals');
      const data = await res.json();
      setApprovals(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000); // Live sync
    return () => clearInterval(interval);
  }, []);

  const selected = approvals.find(a => a.id === selectedId);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const reason = action === 'REJECT' ? window.prompt('Motivo da rejeição:') : 'Aprovado via dashboard';
    if (action === 'REJECT' && !reason) return;

    toast.promise(
      fetch(`/api/devos/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, actor: 'admin_dashboard' })
      }),
      {
        loading: `${action === 'APPROVE' ? 'Aprovando' : 'Rejeitando'} execução...`,
        success: () => {
          fetchApprovals();
          return `Execução ${action === 'APPROVE' ? 'liberada' : 'cancelada'} com sucesso!`;
        },
        error: 'Erro ao processar decisão.',
      }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white p-6 gap-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DevOS <span className="text-yellow-500">Command Center</span></h1>
          <p className="text-zinc-500 mt-1">Gestão de Governança Humana e Aprovações de Execução.</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="border-zinc-800 text-zinc-400 p-2">
            <Clock className="w-4 h-4 mr-2" />
            Auto-Sync: Ativo
          </Badge>
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 p-2">
            {approvals.length} Pendentes
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Sidebar: List */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Fila de Aprovação</h2>
          <ScrollArea className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="p-4 flex flex-col gap-3">
              {approvals.map((app) => (
                <div 
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedId === app.id 
                    ? 'bg-zinc-800 border-yellow-500/50 shadow-lg shadow-yellow-500/5' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={app.approvalLevel === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {app.approvalLevel} RISK
                    </Badge>
                    <span className="text-[10px] text-zinc-500">{new Date(app.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="font-medium text-sm truncate">{app.jobId}</h3>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                    <ShieldAlert className="w-3 h-3" />
                    <span className="truncate">{app.tenantId}</span>
                  </div>
                </div>
              ))}
              {approvals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                  <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                  <p>Tudo limpo! Nenhuma aprovação pendente.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel: Detail */}
        <div className="col-span-8 overflow-hidden flex flex-col">
          {selected ? (
            <Card className="flex-1 border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col rounded-xl">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900/80 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{selected.jobId}</CardTitle>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 uppercase text-[10px]">
                        ID: {selected.id}
                      </Badge>
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">Solicitação de execução crítica via {selected.tenantId}</p>
                  </div>
                  <div className="flex gap-2 text-right">
                    <div className="px-3 py-1 bg-zinc-800 rounded-lg border border-zinc-700">
                      <div className="text-[10px] text-zinc-500 uppercase">Custo Est.</div>
                      <div className="text-yellow-500 font-mono font-bold">${selected.estimatedCost.toFixed(2)}</div>
                    </div>
                    <div className="px-3 py-1 bg-zinc-800 rounded-lg border border-zinc-700">
                      <div className="text-[10px] text-zinc-500 uppercase">Risco</div>
                      <div className={`font-bold ${selected.estimatedRisk > 70 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {selected.estimatedRisk}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto p-0">
                <div className="grid grid-cols-2 h-full">
                  <div className="p-6 border-r border-zinc-800 flex flex-col gap-6">
                    {/* Reason Section */}
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        Gatilhos de Aprovação
                      </h4>
                      <div className="flex flex-col gap-2">
                        {selected.reasons.map((r: string, i: number) => (
                          <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-xs text-red-200">
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Snapshot */}
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-blue-500" />
                        Estratégia Proposta
                      </h4>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">Modelo</span>
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">{selected.contextSnapshot.model}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">Confiança</span>
                          <span className="font-mono text-zinc-300">{(selected.contextSnapshot.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-zinc-800 text-[11px] text-zinc-500 italic">
                          "O sistema optou por este modelo para garantir estabilidade em ambiente PROD."
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-black/20">
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Info className="w-3 h-3 text-zinc-400" />
                      Payload Preview
                    </h4>
                    <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-auto max-h-[300px]">
                      {JSON.stringify({
                        objective: "Atualizar infraestrutura de rede v4",
                        scope: ["aws:security_group:update", "aws:route_table:propagate"],
                        parameters: { force: true, region: "us-east-1" },
                        safety_check: "passed_local"
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/80 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  className="bg-transparent border-zinc-700 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 px-8 py-6 rounded-xl transition-all"
                  onClick={() => handleAction(selected.id, 'REJECT')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar Execução
                </Button>
                <Button 
                  className="bg-yellow-500 text-black hover:bg-yellow-400 px-12 py-6 rounded-xl font-bold shadow-lg shadow-yellow-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => handleAction(selected.id, 'APPROVE')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprovar Agora
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/20 rounded-xl border-2 border-dashed border-zinc-800">
               <Info className="w-12 h-12 mb-4 opacity-10" />
               <p className="text-sm">Selecione uma solicitação para revisar os detalhes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
