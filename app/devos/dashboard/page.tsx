'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  sessions: { total: number; active: number; completed: number; blocked: number; failed: number; successRate: number };
  tasks: { total: number; completed: number; blocked: number; failed: number };
  quality: { avgScore: number | null };
  cost: { totalTokens: number; estimatedUsd: number };
  performance: { avgDurationMs: number | null };
  recentSessions: any[];
}

export default function DevOsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/devos/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Falha na autenticação ou erro no servidor');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[Dashboard] Fetch error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={styles.loader}>Carregando Dashboard DevOS...</div>;
  if (!stats) return <div>Erro ao carregar estatísticas.</div>;

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>DevOS <span style={{ color: '#38bdf8' }}>Intelligence</span></h1>
          <p style={styles.subtitle}>Visão global de execução e saúde dos agentes de desenvolvimento</p>
        </div>
        <Link href="/devos/new" style={styles.newBtn}>+ Nova Sessão</Link>
      </div>

      {/* TOP STATS */}
      <div style={styles.grid4}>
        <StatCard label="Sessões Totais" value={stats?.sessions?.total ?? 0} sub={`${stats?.sessions?.active ?? 0} ativas / ${stats?.sessions?.successRate ?? 0}% sucesso`} />
        <StatCard label="Token Usage" value={((stats?.cost?.totalTokens ?? 0) / 1000).toFixed(1) + 'k'} sub={`~$${(stats?.cost?.estimatedUsd ?? 0).toFixed(2)} USD`} />
        <StatCard label="Quality Score" value={stats?.quality?.avgScore ? `${stats.quality.avgScore}/100` : '—'} sub="Média global de entrega" />
        <StatCard label="Performance" value={stats?.performance?.avgDurationMs ? `${(stats.performance.avgDurationMs / 1000).toFixed(1)}s` : '—'} sub="Média por ciclo" />
      </div>

      <div style={styles.mainGrid}>
        {/* RECENT SESSIONS */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Sessões Recentes</h2>
            <Link href="/devos/sessions" style={styles.link}>Ver todas →</Link>
          </div>
          <div style={styles.sessionList}>
            {stats.recentSessions.map(s => (
              <Link key={s.id} href={`/devos/sessions/${s.id}`} style={styles.sessionItem}>
                <div style={styles.sessionInfo}>
                  <p style={styles.sessionObj}>{s.objective}</p>
                  <p style={styles.sessionMeta}>{s.taskCount} tasks • {s.logCount} logs • {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={styles.sessionStatus}>
                  <div style={styles.progressLabel}>{s.progress}%</div>
                  <div style={{ ...styles.statusDot, background: getStatusColor(s.status) }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* TASK HEALTH */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Saúde das Tarefas</h2>
          <div style={styles.healthGrid}>
            <HealthItem label="Completas" value={stats?.tasks?.completed ?? 0} color="#22c55e" total={stats?.tasks?.total ?? 0} />
            <HealthItem label="Bloqueadas" value={stats?.tasks?.blocked ?? 0} color="#fb923c" total={stats?.tasks?.total ?? 0} />
            <HealthItem label="Falhas" value={stats?.tasks?.failed ?? 0} color="#ef4444" total={stats?.tasks?.total ?? 0} />
            <HealthItem label="Pendentes" value={(stats?.tasks?.total ?? 0) - (stats?.tasks?.completed ?? 0) - (stats?.tasks?.blocked ?? 0) - (stats?.tasks?.failed ?? 0)} color="#64748b" total={stats?.tasks?.total ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: any) {
  return (
    <div style={styles.card}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={styles.cardValue}>{value}</p>
      <p style={styles.cardSub}>{sub}</p>
    </div>
  );
}

function HealthItem({ label, value, color, total }: any) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={styles.healthItem}>
      <div style={styles.healthHeader}>
        <span style={styles.healthLabel}>{label}</span>
        <span style={{ ...styles.healthValue, color }}>{value}</span>
      </div>
      <div style={styles.progressBg}>
        <div style={{ ...styles.progressFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return '#38bdf8';
    case 'COMPLETED': return '#22c55e';
    case 'FAILED': return '#ef4444';
    case 'BLOCKED': return '#fb923c';
    default: return '#64748b';
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '40px', background: '#0a0e1a', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800 },
  subtitle: { margin: '8px 0 0', color: '#64748b', fontSize: '15px' },
  newBtn: { background: '#38bdf8', color: '#0a0e1a', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px' },
  cardLabel: { color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' },
  cardValue: { fontSize: '32px', fontWeight: 800, marginBottom: '4px' },
  cardSub: { color: '#475569', fontSize: '13px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '30px' },
  section: { background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: 700 },
  link: { color: '#38bdf8', fontSize: '14px', textDecoration: 'none' },
  sessionList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sessionItem: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' },
  sessionObj: { color: '#e2e8f0', fontWeight: 600, fontSize: '15px', marginBottom: '4px' },
  sessionMeta: { color: '#64748b', fontSize: '12px' },
  sessionStatus: { display: 'flex', alignItems: 'center', gap: '12px' },
  progressLabel: { fontSize: '13px', fontWeight: 700, color: '#94a3b8' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  healthGrid: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' },
  healthItem: { width: '100%' },
  healthHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  healthLabel: { fontSize: '14px', color: '#94a3b8' },
  healthValue: { fontSize: '16px', fontWeight: 700 },
  progressBg: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' },
  progressFill: { height: '100%', borderRadius: '3px' },
  loader: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#64748b' }
};
