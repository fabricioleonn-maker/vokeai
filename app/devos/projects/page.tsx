'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FolderKanban, Plus, Search, Filter, 
  MoreVertical, ArrowUpRight, Clock,
  CheckCircle2, Activity, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', objective: '' });
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = () => {
    setLoading(true);
    fetch('/api/devos/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.objective) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/devos/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (res.ok) {
        setNewProject({ name: '', objective: '' });
        setIsModalOpen(false);
        fetchProjects();
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="text-emerald-500" size={14} />;
      case 'EXECUTING': return <Activity className="text-blue-500 animate-pulse" size={14} />;
      case 'BLOCKED': return <AlertCircle className="text-amber-500" size={14} />;
      default: return <Clock className="text-slate-500" size={14} />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="text-[#3B82F6]" size={24} />
            Projetos Estratégicos
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1 font-medium">Gerencie objetivos de alto nível e orquestração cognitiva.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/10 active:scale-95"
        >
          <Plus size={18} />
          Novo Projeto
        </button>
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F0F10] border border-[#26262A] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-[#26262A] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">Inicializar Novo Objetivo</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#64748B] hover:text-white transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Nome do Projeto</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder="Ex: Migração de Kernel V3"
                  className="w-full bg-[#0A0A0B] border border-[#26262A] rounded-xl px-4 py-3 text-white outline-none focus:border-[#3B82F6] transition-all"
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Objetivo Estratégico</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Descreva o que este projeto deve alcançar..."
                  className="w-full bg-[#0A0A0B] border border-[#26262A] rounded-xl px-4 py-3 text-white outline-none focus:border-[#3B82F6] transition-all resize-none"
                  value={newProject.objective}
                  onChange={e => setNewProject({ ...newProject, objective: e.target.value })}
                />
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#26262A] text-[#94A3B8] font-bold text-sm hover:bg-[#151517] transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  disabled={isCreating}
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#3B82F6] text-white font-bold text-sm hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Activity size={16} className="animate-spin" />
                      INICIALIZANDO...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      CRIAR PROJETO
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-1 bg-[#151517] border border-[#26262A] rounded-xl w-full max-w-md">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search size={16} className="text-[#64748B]" />
          <input 
            type="text" 
            placeholder="Filtrar objetivos..." 
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-[#475569]"
          />
        </div>
        <button className="p-2 hover:bg-[#26262A] rounded-lg text-[#94A3B8] transition-colors">
          <Filter size={16} />
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-[#151517] border border-[#26262A] animate-pulse" />
          ))
        ) : projects.length === 0 ? (
          <div className="col-span-full py-20 text-center rounded-2xl border-2 border-dashed border-[#26262A]">
            <FolderKanban className="mx-auto text-[#26262A] mb-4" size={48} />
            <p className="text-[#64748B] font-medium">Nenhum projeto estratégico encontrado.</p>
          </div>
        ) : (
          projects.map((project, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={project.id}
              className="group bg-[#151517] border border-[#26262A] rounded-2xl p-5 hover:border-[#3B82F6]/30 transition-all cursor-pointer relative overflow-hidden"
            >
              {/* Progress Line at top */}
              <div className="absolute top-0 left-0 h-1 bg-[#3B82F6]/20 w-full">
                <div 
                  className="h-full bg-[#3B82F6] transition-all duration-1000" 
                  style={{ width: `${project.progress}%` }} 
                />
              </div>

              <div className="flex items-start justify-between mb-4 mt-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-[#0A0A0B] border border-[#26262A] text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  {getStatusIcon(project.status)}
                  {project.status}
                </div>
                <button className="text-[#475569] hover:text-[#94A3B8] transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              <Link href={`/devos/projects/${project.id}`}>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#3B82F6] transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-[#64748B] text-sm line-clamp-2 mb-6 font-medium leading-relaxed">
                  {project.objective}
                </p>
              </Link>

              <div className="flex items-center justify-between pt-4 border-t border-[#26262A]">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Sessões</span>
                    <span className="text-sm font-mono font-bold text-white">{project._count?.sessions || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Progresso</span>
                    <span className="text-sm font-mono font-bold text-[#3B82F6]">{project.progress}%</span>
                  </div>
                </div>
                <Link 
                  href={`/devos/projects/${project.id}`}
                  className="p-2 rounded-lg bg-[#0A0A0B] border border-[#26262A] text-[#94A3B8] hover:text-white hover:bg-[#3B82F6] transition-all hover:border-[#3B82F6] shadow-sm"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
