'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Loader2, X, MessageCircle, Minimize2 } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agent?: string;
}

const AGENT_COLORS: Record<string, string> = {
  'agent.secretary': '#3B82F6',
  'agent.finance': '#10B981',
  'agent.support.n1': '#F97316',
  'agent.sales': '#8B5CF6',
  'agent.productivity': '#06B6D4'
};

export default function EmbedChatPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tenantName, setTenantName] = useState('Assistente');
  const [primaryColor, setPrimaryColor] = useState('#06B6D4');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Load tenant config
    loadTenantConfig();
  }, [tenantId]);

  const loadTenantConfig = async () => {
    try {
      const res = await fetch(`/api/embed/config?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setTenantName(data.name || 'Assistente');
        setPrimaryColor(data.primaryColor || '#06B6D4');
      }
    } catch (error) {
      console.error('Failed to load tenant config:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          tenantId,
          channel: 'embed'
        })
      });

      const data = await res.json();

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.response || 'Desculpe, ocorreu um erro.',
        timestamp: new Date(),
        agent: data.agentUsed
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Send error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Embedded mode - full page widget
  return (
    <div className="h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <div
        className="px-4 py-3 text-white flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className="w-auto h-12 flex items-center justify-center">
            <div className="relative h-12 w-32">
              <Image
                src="/logo.png"
                alt="Voke AI"
                fill
                className="object-contain mix-blend-screen"
              />
            </div>
            <span className="text-2xl font-black text-white tracking-tight -ml-3 relative z-10 font-sans">.AI</span>
          </div>
          <div>
            <h2 className="font-semibold">{tenantName}</h2>
            <p className="text-xs opacity-80">Online agora</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="relative w-32 h-32 mx-auto mb-4 opacity-50 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Voke AI"
                fill
                className="object-contain invert mix-blend-multiply"
              />
              <span className="text-3xl font-black text-slate-900 tracking-tight -ml-2 relative z-10 font-sans">.AI</span>
            </div>
            <h3 className="font-medium text-gray-800 mb-1">Olá! 👋</h3>
            <p className="text-sm text-gray-500">Como posso ajudar você hoje?</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${message.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                  }`}
                style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                  }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: primaryColor }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-2 rounded-full text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Powered by Voke AI
        </p>
      </div>
    </div>
  );
}
