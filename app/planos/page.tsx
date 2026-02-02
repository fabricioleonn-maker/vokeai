'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Check, MessageSquare, ArrowRight, Zap, Target, Users, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PlanosPage() {
    const [showHeader, setShowHeader] = useState(true);

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setShowHeader(false);
            } else {
                setShowHeader(true);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const plans = [
        {
            name: 'Essencial',
            badge: 'Para quem está começando',
            price: 'Sob Consulta',
            desc: 'Foco na organização básica e primeiros passos com IA.',
            useCase: 'Ideal para profissionais liberais que precisam de uma secretária virtual para organizar a agenda.',
            features: [
                'Secretária Virtual 24/7',
                'Atendimento de Nível 1',
                'Personalidade customizável base',
                'Até 1.000 mensagens/mês'
            ],
            color: 'bg-slate-50',
            button: 'Falar com Consultor'
        },
        {
            name: 'Business',
            badge: 'O queridinho das empresas',
            price: 'Sob Consulta',
            desc: 'Aceleração de vendas e controle financeiro inteligente.',
            useCase: 'Perfeito para empresas que recebem muitos leads e precisam de qualificação automática e vendas.',
            features: [
                'Tudo do Essencial',
                'Agente de Vendas Consultivo',
                'Agente Financeiro Integrado',
                'Personalidade Avançada (Escopo de Voz)',
                'Até 10.000 mensagens/mês'
            ],
            color: 'bg-cyan-50 border-cyan-100',
            featured: true,
            button: 'Iniciar Teste Grátis'
        },
        {
            name: 'Enterprise',
            badge: 'Escala e Performance',
            price: 'Sob Consulta',
            desc: 'Orquestração total para grandes volumes e operações complexas.',
            useCase: 'Desenvolvido para operações multi-tenant que precisam de governança total e integração via API.',
            features: [
                'Tudo do Business',
                'Agente de Produtividade customizado',
                'Suporte dedicado humanizado',
                'Treinamento de Personalidade Contínuo',
                'Volume de mensagens ilimitado*'
            ],
            color: 'bg-slate-900 text-white',
            button: 'Falar com Especialista'
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
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
                                />
                            </div>
                        </Link>
                    </div>

                    <div className="hidden lg:flex items-center gap-10">
                        <nav className="flex items-center gap-8">
                            <Link href="/#features" className="text-sm font-bold text-slate-500 hover:text-cyan-600 transition-colors">Funcionalidades</Link>
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

                    <button className="lg:hidden p-2 text-slate-600">
                        <Bot className="w-6 h-6" />
                    </button>
                </div>
            </motion.header>

            <main className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
                            Investimento por <span className="text-cyan-600">Valor Entregue</span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Na <strong>Voke AI</strong>, não cobramos por "features". Cobramos pela transformação do seu negócio
                            através de IA com personalidade real.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-20">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`p-10 rounded-[2.5rem] border ${plan.color} relative overflow-hidden h-full flex flex-col`}
                            >
                                {plan.featured && (
                                    <div className="absolute top-6 right-6 px-3 py-1 bg-cyan-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                                        Mais Popular
                                    </div>
                                )}

                                <div className="mb-8">
                                    <span className={`text-xs font-bold uppercase tracking-widest ${plan.color.includes('slate-900') ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        {plan.name}
                                    </span>
                                    <h3 className="text-2xl font-bold mt-2">{plan.badge}</h3>
                                    <div className="text-3xl font-black mt-4">{plan.price}</div>
                                </div>

                                <div className="mb-8 flex-grow">
                                    <p className={`text-sm mb-6 ${plan.color.includes('slate-900') ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {plan.desc}
                                    </p>

                                    <div className={`p-4 rounded-2xl mb-8 ${plan.color.includes('slate-900') ? 'bg-slate-800' : 'bg-white/50 border border-slate-100'}`}>
                                        <p className="text-xs font-bold mb-2 uppercase tracking-tighter opacity-70 flex items-center gap-1.5">
                                            <Target className="w-3 h-3" /> Caso de Uso
                                        </p>
                                        <p className="text-sm font-medium leading-relaxed italic">
                                            "{plan.useCase}"
                                        </p>
                                    </div>

                                    <ul className="space-y-4">
                                        {plan.features.map((feature, j) => (
                                            <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                                <Check className={`w-4 h-4 shrink-0 ${plan.color.includes('slate-900') ? 'text-cyan-400' : 'text-cyan-600'}`} />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Link
                                    href={plan.name === 'Business' ? '/chat?test=true' : 'https://wa.me/seu-numero'}
                                    className={`w-full py-4 rounded-2xl font-bold text-center transition-all flex items-center justify-center gap-2 ${plan.color.includes('slate-900')
                                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                                        }`}
                                >
                                    {plan.button}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Value Prop */}
                    <div className="grid md:grid-cols-2 gap-12 items-center p-12 rounded-[3rem] bg-slate-50 border border-slate-100">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">
                                Por que não tabelamos<br />os valores?
                            </h2>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                Porque cada personalidade de IA exige um treinamento específico. O custo depende do
                                volume de conhecimento que sua IA precisa absorver e das ações que ela deve realizar.
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                                    ))}
                                </div>
                                <p className="text-sm font-medium text-slate-700">
                                    +250 empresas já evoluíram com a Voke AI
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: Zap, label: 'Implantação Rápida' },
                                { icon: Users, label: 'Suporte Humano' },
                                { icon: Shield, label: 'Dados Seguros' },
                                { icon: Bot, label: 'IA de Ponta' }
                            ].map((item, i) => (
                                <div key={i} className="p-6 rounded-3xl bg-white border border-slate-100 flex flex-col items-center text-center gap-3">
                                    <item.icon className="w-6 h-6 text-cyan-600" />
                                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-12 px-6 border-t border-slate-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-slate-500 text-sm font-medium">© 2026 Voke AI • Inteligência que Transforma</p>
                    <div className="flex items-center gap-8 text-sm font-bold text-slate-600">
                        <Link href="#" className="hover:text-cyan-600 transition-colors">Termos</Link>
                        <Link href="#" className="hover:text-cyan-600 transition-colors">Privacidade</Link>
                        <Link href="mailto:contato@vokeai.com.br" className="hover:text-cyan-600 transition-colors">Suporte</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
