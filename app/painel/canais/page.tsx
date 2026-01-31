'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Phone, Instagram, Facebook, Check, X, Settings, Plus, Loader2 } from 'lucide-react';

type ChannelType = 'whatsapp' | 'instagram' | 'facebook' | 'sms';

interface ChannelConfig {
    type: ChannelType;
    provider: 'zenvia' | 'twilio' | 'meta' | null;
    status: 'connected' | 'disconnected' | 'error';
    phoneNumberId?: string;
    apiToken?: string;
    connectedAt?: string;
}

export default function CanaisPage() {
    const [channels, setChannels] = useState<ChannelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const res = await fetch('/api/tenant/channels');
            const data = await res.json();
            if (Array.isArray(data)) {
                setChannels(data);
            }
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    };

    const channelInfo = {
        whatsapp: {
            name: 'WhatsApp Business',
            icon: Phone,
            color: 'from-green-500 to-green-600',
            description: 'Converse com seus clientes pelo WhatsApp'
        },
        instagram: {
            name: 'Instagram Direct',
            icon: Instagram,
            color: 'from-pink-500 to-purple-600',
            description: 'Atenda mensagens diretas do Instagram'
        },
        facebook: {
            name: 'Facebook Messenger',
            icon: Facebook,
            color: 'from-blue-500 to-blue-600',
            description: 'Responda mensagens do Facebook'
        },
        sms: {
            name: 'SMS',
            icon: MessageSquare,
            color: 'from-cyan-500 to-blue-500',
            description: 'Envie e receba mensagens SMS'
        }
    };

    const getChannelStatus = (type: ChannelType) => {
        const channel = channels.find(c => c.type === type);
        return channel?.status || 'disconnected';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Canais de Atendimento</h1>
                <p className="text-slate-600 mt-1">Conecte os canais onde você atende seus clientes</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {(Object.keys(channelInfo) as ChannelType[]).map((type, i) => {
                    const info = channelInfo[type];
                    const status = getChannelStatus(type);
                    const Icon = info.icon;

                    return (
                        <motion.div
                            key={type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-cyan-300 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg`}>
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-lg">{info.name}</h3>
                                        <p className="text-sm text-slate-500">{info.description}</p>
                                    </div>
                                </div>

                                {status === 'connected' && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        Conectado
                                    </div>
                                )}
                            </div>

                            {status === 'connected' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Provider</span>
                                        <span className="font-medium text-slate-900 capitalize">
                                            {channels.find(c => c.type === type)?.provider || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Conectado em</span>
                                        <span className="font-medium text-slate-900">
                                            {channels.find(c => c.type === type)?.connectedAt
                                                ? new Date(channels.find(c => c.type === type)!.connectedAt!).toLocaleDateString('pt-BR')
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => setSelectedChannel(type)}
                                            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Configurar
                                        </button>
                                        <button
                                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
                                        >
                                            Desconectar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSelectedChannel(type)}
                                    className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
                                >
                                    <Plus className="w-5 h-5" />
                                    Conectar {info.name}
                                </button>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal de Configuração */}
            {selectedChannel && (
                <WhatsAppConfigModal
                    channel={selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                    onSuccess={fetchChannels}
                />
            )}
        </div>
    );
}

// Modal de Configuração do WhatsApp
function WhatsAppConfigModal({
    channel,
    onClose,
    onSuccess
}: {
    channel: ChannelType;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [step, setStep] = useState(1);
    const [provider, setProvider] = useState<'zenvia' | 'twilio' | ''>('');
    const [config, setConfig] = useState({
        apiToken: '',
        phoneNumberId: '',
        accountSid: '',
        authToken: ''
    });
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState('');

    const handleTest = async () => {
        setTesting(true);
        setError('');

        try {
            const res = await fetch('/api/tenant/channels/whatsapp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, ...config })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao testar conexão');
            }

            setStep(3);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/tenant/channels/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    ...config,
                    channelType: channel
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao salvar configuração');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900">Conectar WhatsApp Business</h2>
                    <p className="text-slate-600 mt-1">Siga os passos para configurar seu canal</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Steps Indicator */}
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                    {step > s ? <Check className="w-5 h-5" /> : s}
                                </div>
                                {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-cyan-500' : 'bg-slate-200'}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Escolher Provider */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Escolha seu provider</h3>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => setProvider('zenvia')}
                                    className={`p-4 border-2 rounded-xl text-left transition-all ${provider === 'zenvia'
                                            ? 'border-cyan-500 bg-cyan-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="font-semibold text-slate-900">Zenvia (Recomendado para Brasil)</div>
                                    <div className="text-sm text-slate-600 mt-1">Suporte em português, melhor custo-benefício</div>
                                </button>
                                <button
                                    onClick={() => setProvider('twilio')}
                                    className={`p-4 border-2 rounded-xl text-left transition-all ${provider === 'twilio'
                                            ? 'border-cyan-500 bg-cyan-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="font-semibold text-slate-900">Twilio (Global)</div>
                                    <div className="text-sm text-slate-600 mt-1">Líder mundial, mais recursos disponíveis</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Configurar Credenciais */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Configure suas credenciais {provider === 'zenvia' ? 'Zenvia' : 'Twilio'}</h3>

                            {provider === 'zenvia' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">API Token</label>
                                        <input
                                            type="password"
                                            value={config.apiToken}
                                            onChange={e => setConfig({ ...config, apiToken: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Cole seu API Token da Zenvia"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number ID</label>
                                        <input
                                            type="text"
                                            value={config.phoneNumberId}
                                            onChange={e => setConfig({ ...config, phoneNumberId: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Ex: 5511999887766"
                                        />
                                    </div>
                                </>
                            )}

                            {provider === 'twilio' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Account SID</label>
                                        <input
                                            type="text"
                                            value={config.accountSid}
                                            onChange={e => setConfig({ ...config, accountSid: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Auth Token</label>
                                        <input
                                            type="password"
                                            value={config.authToken}
                                            onChange={e => setConfig({ ...config, authToken: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Cole seu Auth Token"
                                        />
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Sucesso */}
                    {step === 3 && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Conexão Testada com Sucesso!</h3>
                            <p className="text-slate-600">Seu WhatsApp Business está pronto para uso</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <div className="flex gap-3">
                        {step > 1 && step < 3 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                            >
                                Voltar
                            </button>
                        )}
                        {step === 1 && (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!provider}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Próximo
                            </button>
                        )}
                        {step === 2 && (
                            <button
                                onClick={handleTest}
                                disabled={testing || !config.apiToken && !config.authToken}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {testing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Testar Conexão
                            </button>
                        )}
                        {step === 3 && (
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all"
                            >
                                Salvar e Ativar
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
