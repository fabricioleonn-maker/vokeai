'use client';

import Image from 'next/image';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  Users,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-100 font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-100/50 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 blur-[120px] rounded-full" />
      </div>

      <motion.header
        initial={{ y: 0 }}
        animate={{ y: showHeader ? 0 : -64 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100/80 shadow-sm shadow-slate-200/5"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="group transition-transform active:scale-95">
              <div className="relative h-[56px] w-[210px]">
                <Image
                  src="/logo_voke_ai_transparent.png"
                  alt="Voke AI"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            <nav className="flex items-center gap-8">
              <Link href="#features" className="text-sm font-bold text-slate-500 hover:text-cyan-600 transition-colors">Funcionalidades</Link>
              <Link href="/planos" className="text-sm font-bold text-slate-500 hover:text-cyan-600 transition-colors">Nossos Planos</Link>
            </nav>

            <div className="w-px h-6 bg-slate-200 mx-2" />

            <div className="flex items-center gap-6">
              <Link
                href="/admin"
                className="text-sm font-black text-slate-800 hover:text-cyan-600 transition-all uppercase"
              >
                Acessar Painel
              </Link>
              <Link
                href="/chat?test=true"
                className="px-6 py-2.5 bg-[#0f172a] hover:bg-cyan-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
              >
                Iniciar Conversa de Teste
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2 text-slate-600">
            <Bot className="w-6 h-6" />
          </button>
        </div>
      </motion.header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold tracking-wider uppercase mb-8 border border-cyan-100 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              A Evolução da Inteligência Artificial
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-[1.1]"
            >
              Dê uma <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">Personalidade Humana</span> aos seus Agentes de IA
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Vá além de respostas automáticas. Construa agentes que pensam, agem e se comunicam com a alma do seu negócio.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-5"
            >
              <Link
                href="/chat?test=true"
                className="w-full sm:w-auto px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-bold transition-all shadow-2xl shadow-cyan-500/25 flex items-center justify-center gap-2 group"
              >
                <MessageSquare className="w-5 h-5" />
                Iniciar Conversa de Teste
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/planos"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl font-bold transition-all border border-slate-200 shadow-sm flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                Conhecer nossos planos
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Personality Focus Section */}
        <section className="py-24 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                  Sua IA, Suas Regras,<br />
                  <span className="text-cyan-600">Personalidade Única.</span>
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  O grande diferencial do Sistema Matriz é o <strong>Treinamento de Personalidade</strong>.
                  Não entregamos apenas código, entregamos comportamento.
                </p>
                <ul className="space-y-4">
                  {[
                    'Defina o tom de voz (Amigável, Formal, Persuasivo)',
                    'Ensine como lidar com objeções difíceis',
                    'Crie regras de ouro para o seu atendimento',
                    'Ajuste o vocabulário para o seu nicho'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700 font-medium">
                      <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-cyan-600" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 rounded-3xl blur-2xl" />
                <div className="relative bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center">
                      <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Módulo de Personalidade</h4>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Configuração Ativa</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Instrução de Comportamento</p>
                      <p className="text-sm text-slate-700 italic">"Seja sempre consultivo, focando em entender o problema antes de oferecer a solução..."</p>
                    </div>
                    <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
                      <p className="text-xs font-bold text-cyan-600 mb-2 uppercase">Resultado no Chat</p>
                      <p className="text-sm text-slate-800 font-medium">"Entendo perfeitamente o seu desafio com a agenda. Antes de marcamos, como você faz esse controle hoje?"</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Orquestração Profissional</h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">Agentes especializados que trabalham juntos por uma única voz.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Cpu,
                  title: 'Multi-Agentes',
                  desc: 'Secretária, Financeiro, Vendas, Suporte e Produtividade integrados perfeitamente.',
                  color: 'text-cyan-600',
                  bg: 'bg-cyan-50'
                },
                {
                  icon: Users,
                  title: 'Gestão Multi-Empresa',
                  desc: 'Gerencie diferentes clientes, filiais ou departamentos em uma única plataforma centralizada e segura.',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50'
                },
                {
                  icon: Zap,
                  title: 'Ação Consultiva',
                  desc: 'IA que não apenas responde, mas guia o usuário até o resultado desejado de forma inteligente.',
                  color: 'text-amber-600',
                  bg: 'bg-amber-50'
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group text-center"
                >
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform mx-auto`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto p-12 md:p-20 rounded-[3rem] bg-slate-900 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 relative z-10">
              Pronto para evoluir sua<br />operação com IA?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
              <Link
                href="/chat?test=true"
                className="w-full sm:w-auto px-10 py-5 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors border border-slate-700 shadow-2xl shadow-cyan-500/10"
              >
                Iniciar Conversa de Teste
              </Link>
              <Link
                href="/planos"
                className="w-full sm:w-auto px-10 py-5 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Conheça nossos Planos
              </Link>
            </div>
            <p className="mt-10 text-slate-400 font-medium">
              Teste todas as funcionalidades agora, sem compromisso.
            </p>
          </motion.div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-500 text-sm font-medium">© 2026 Voke AI • Inteligência que Transforma</p>
          <div className="flex items-center gap-8 text-sm font-bold text-slate-600">
            <Link href="#" className="hover:text-cyan-600 transition-colors">Termos</Link>
            <Link href="#" className="hover:text-cyan-600 transition-colors">Privacidade</Link>
            <Link href="mailto:contato@sistemamatriz.com" className="hover:text-cyan-600 transition-colors">Suporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
