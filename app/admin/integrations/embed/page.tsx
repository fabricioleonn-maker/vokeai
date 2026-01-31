'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Copy, Check, Code, ExternalLink, Palette, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmbedIntegrationPage() {
  const { data: session } = useSession() || {};
  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#06B6D4');
  const [saving, setSaving] = useState(false);
  
  const user = session?.user as { tenantId?: string } | undefined;
  
  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
      loadSettings();
    }
  }, [user?.tenantId]);
  
  const loadSettings = async () => {
    if (!user?.tenantId) return;
    try {
      const res = await fetch(`/api/embed/config?tenantId=${user.tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setPrimaryColor(data.primaryColor || '#06B6D4');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };
  
  const saveSettings = async () => {
    if (!user?.tenantId) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/tenants/${user.tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { primaryColor }
        })
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const embedCode = `<!-- Sistema Matriz Chat Widget -->
<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/${tenantId}"
  style="position: fixed; bottom: 20px; right: 20px; width: 380px; height: 600px; border: none; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); z-index: 9999;"
  allow="microphone"
></iframe>`;
  
  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integração de Chat</h1>
        <p className="text-gray-500 mt-1">Adicione o chat ao seu site com apenas uma linha de código</p>
      </div>
      
      {/* Customization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Palette className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Personalização</h2>
            <p className="text-sm text-gray-500">Customize a aparência do chat</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor Principal
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Embed Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Code className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Código de Integração</h2>
              <p className="text-sm text-gray-500">Cole este código no HTML do seu site</p>
            </div>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Código
              </>
            )}
          </button>
        </div>
        
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{embedCode}</code>
        </pre>
      </motion.div>
      
      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Preview</h2>
              <p className="text-sm text-gray-500">Veja como o chat aparece para seus clientes</p>
            </div>
          </div>
          <a
            href={`/embed/${tenantId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir em Nova Aba
          </a>
        </div>
        
        <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
          <div className="w-[380px] h-[500px] rounded-xl overflow-hidden shadow-xl">
            <iframe
              src={`/embed/${tenantId}`}
              className="w-full h-full border-0"
              title="Chat Preview"
            />
          </div>
        </div>
      </motion.div>
      
      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-cyan-50 rounded-xl p-6 border border-cyan-200"
      >
        <h3 className="font-semibold text-cyan-800 mb-3">Como Integrar</h3>
        <ol className="space-y-2 text-sm text-cyan-700">
          <li>1. Copie o código acima</li>
          <li>2. Cole antes da tag <code className="bg-cyan-100 px-1 rounded">&lt;/body&gt;</code> do seu site</li>
          <li>3. O widget de chat aparecerá no canto inferior direito</li>
          <li>4. Personalize as cores e configurações conforme necessário</li>
        </ol>
      </motion.div>
    </div>
  );
}
