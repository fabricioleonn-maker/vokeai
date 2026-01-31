'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, Loader2, MessageCircle,
  MoreVertical, Search, Smile, ChevronLeft,
  CheckCheck, Clock, Sparkles, Info
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agent?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: Date;
  unread: number;
  avatar?: string;
  isActive?: boolean;
}

interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('test') === 'true';

  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isHoveringStatus, setIsHoveringStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mount effect and load tenants
  useEffect(() => {
    setMounted(true);
    // Load available tenants
    fetch('/api/admin/tenants')
      .then(res => res.json())
      .then((data: TenantOption[]) => {
        setTenants(data);

        if (isTestMode) {
          const testTenant = data.find((t: any) => t.slug === 'voke' || t.slug === 'matriz' || t.status === 'active');
          if (testTenant) setTenantId(testTenant.id);
        } else {
          const activeTenant = data.find((t: any) => t.status === 'active');
          if (activeTenant) {
            setTenantId(activeTenant.id);
          } else if (data.length > 0) {
            setTenantId(data[0].id);
          }
        }
      })
      .catch(console.error);
  }, [isTestMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.turns) {
          setMessages(data.turns.map((turn: any) => ({
            id: turn.id,
            role: turn.role,
            content: turn.content,
            timestamp: new Date(turn.createdAt),
            agent: turn.metadata?.agentUsed,
            status: 'read'
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !tenantId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    inputRef.current?.focus();

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          tenantId,
          channel: 'web',
          isTestMode
        })
      });

      const data = await res.json();

      setMessages((prev: Message[]) => prev.map((m: Message) =>
        m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m
      ));

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.agentUsed) {
        setCurrentAgent(data.agentUsed);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.response || 'Desculpe, ocorreu um erro.',
        timestamp: new Date(),
        agent: data.agentUsed,
        status: 'read'
      };

      setMessages((prev: Message[]) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Send error:', error);
      setMessages((prev: Message[]) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
        status: 'read'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setCurrentAgent(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100 font-sans overflow-hidden">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden"
          >
            <div className="p-4 bg-[#12b5d1] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight">Mensagens</h2>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Voke.AI</p>
                </div>
              </div>
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Voltar
              </Link>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar conversas..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 border-transparent focus:border-cyan-500/50 transition-all font-medium"
                />
              </div>
            </div>

            <button
              onClick={startNewConversation}
              className="m-3 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all font-bold shadow-lg shadow-cyan-600/20"
            >
              <Sparkles className="w-4 h-4" />
              Nova Conversa
            </button>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && (
                <div className="p-10 text-center text-slate-400">
                  <MessageCircle className="w-10 h-10 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Nenhuma conversa encontrada</p>
                </div>
              )}
              {conversations.map((conv: Conversation) => (
                <div
                  key={conv.id}
                  onClick={() => setConversationId(conv.id)}
                  className={`flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors ${conversationId === conv.id ? 'bg-cyan-50/50' : ''}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 font-bold border border-slate-200">
                    {conv.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{conv.name}</h3>
                      <span className="text-[10px] font-bold text-slate-400">{formatTime(conv.lastTime)}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative bg-white h-full overflow-hidden">
        {isTestMode && (
          <div className="bg-cyan-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 z-20 shadow-lg">
            <Sparkles className="w-4 h-4 text-cyan-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Este é um ambiente de teste para você conhecer todas as funcionalidades.</span>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-slate-50 rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="relative w-20 h-6">
                  <Image
                    src="/logo_voke_ai_transparent.png"
                    alt="Voke AI"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Humano & Consultivo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isTestMode && (
              <select
                value={tenantId}
                onChange={(e) => {
                  setTenantId(e.target.value);
                  startNewConversation();
                }}
                className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
              >
                {tenants.length === 0 && <option value="">Carregando...</option>}
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <button className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
              <Search className="w-5 h-5 text-slate-400" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2.5 rounded-xl transition-all ${showMenu ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-400'}`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 py-2 z-50"
                  >
                    <Link
                      href="/"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-cyan-600 transition-colors"
                    >
                      Menu Inicial
                    </Link>
                    <Link
                      href="/planos"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-cyan-600 transition-colors"
                    >
                      Nossos Planos
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{ backgroundColor: '#fafbfc' }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Como posso evoluir<br />seu negócio hoje?</h3>
              <p className="text-slate-500 max-w-sm mb-12 text-base font-medium leading-relaxed">
                Sou sua inteligência consultiva. Posso automatizar processos, qualificar leads e gerenciar sua produtividade com uma voz única.
              </p>
              <div className="flex flex-wrap justify-center gap-3 max-w-lg">
                {[
                  { text: '📅 Agendar reunião', action: 'Preciso organizar minha agenda de hoje' },
                  { text: '💰 Consultar financeiro', action: 'Como está meu fluxo de caixa?' },
                  { text: '🎯 Ver planos', action: 'Quero conhecer os planos do Sistema Matriz' },
                  { text: '📝 Ajuda com texto', action: 'Pode me ajudar a escrever um email importante?' }
                ].map((item) => (
                  <button
                    key={item.text}
                    onClick={() => {
                      setInput(item.action);
                      setTimeout(() => sendMessage(), 100);
                    }}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all shadow-sm active:scale-95"
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message: Message, index: number) => {
            const isUser = message.role === 'user';
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-[2rem] px-5 py-4 ${isUser
                      ? 'bg-slate-900 text-white rounded-br-lg'
                      : 'bg-white text-slate-800 rounded-bl-lg shadow-xl shadow-slate-200/50 border border-slate-100'
                      }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed font-medium">{message.content}</p>
                    <div className={`flex items-center justify-end gap-1.5 mt-2 ${isUser ? 'text-slate-400' : 'text-slate-300'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{formatTime(message.timestamp)}</span>
                      {isUser && (
                        message.status === 'sending' ? <Clock className="w-3 h-3" /> :
                          message.status === 'delivered' ? <CheckCheck className="w-3 h-3" /> :
                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-bl-md px-5 py-3 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-1.5 h-1.5 bg-slate-300 rounded-full"></motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-300 rounded-full"></motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-300 rounded-full"></motion.span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analisando</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-slate-100 p-6">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors">
              <Smile className="w-6 h-6" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Como posso ajudar seu negócio hoje?"
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-500/10 border border-transparent focus:border-cyan-500/20 transition-all font-medium text-slate-900"
                disabled={loading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-slate-900/10 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden xl:flex w-96 flex-col bg-slate-50/50 border-l border-slate-100 h-full overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Contexto da Operação</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <motion.div
            onMouseEnter={() => setIsHoveringStatus(true)}
            onMouseLeave={() => setIsHoveringStatus(false)}
            className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-cyan-500/5"
          >
            {/* Hover Glow Effect */}
            <motion.div
              animate={{
                opacity: isHoveringStatus ? 0.3 : 0,
                scale: isHoveringStatus ? 1.2 : 0.8,
              }}
              className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-transparent pointer-events-none transition-all duration-700"
            />

            <div className="relative flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center">
                <Info className="w-4 h-4 text-cyan-600" />
              </div>
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status da IA Voke</h4>
              <motion.div
                animate={{
                  scale: isHoveringStatus ? [1, 1.2, 1] : 1,
                  opacity: isHoveringStatus ? [1, 0.5, 1] : 1
                }}
                className="w-2 h-2 rounded-full bg-cyan-500"
              />
            </div>
            <div className="relative space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">IA VOKE</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-black text-slate-900 tracking-tighter uppercase">Ativa & Treinada</p>
                </div>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                Sua IA está configurada para atuar como um <span className="text-cyan-600 font-bold">consultor sênior</span>, priorizando clareza e resultados.
              </p>

              {isHoveringStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-600"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  Atualizado em tempo real
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ações Sugeridas</h4>
            <div className="space-y-2">
              {[
                { icon: '📅', label: 'Organizar Agenda', action: 'Quero organizar minha agenda de hoje' },
                { icon: '💰', label: 'Fluxo de Caixa', action: 'Ver resumo do financeiro' },
                { icon: '🎯', label: 'Qualificar Lead', action: 'Como qualifico um novo lead?' },
                { icon: '📝', label: 'E-mail Profissional', action: 'Ajuda para escrever um e-mail' }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(item.action);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-slate-900 hover:text-white rounded-2xl border border-slate-100 shadow-sm transition-all group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="text-xs font-bold text-left">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isTestMode && (
            <div className="p-6 bg-cyan-600 rounded-3xl text-white shadow-xl shadow-cyan-600/20">
              <h4 className="font-black text-[10px] uppercase tracking-widest mb-3 text-cyan-100">Dica Pro</h4>
              <p className="text-sm font-medium leading-relaxed">
                No modo de teste, você pode simular cenários complexos como: "Tive um problema com um cliente insatisfeito, como respondo?".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
