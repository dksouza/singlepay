"use client";

import { useState, useEffect } from "react";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Activity,
  Loader2,
  Send,
  CheckCircle2,
  Settings2,
  MoreVertical,
  Edit,
  ChevronRight,
} from "lucide-react";
import { getWebhooks, deleteWebhook, testWebhook } from "../actions/webhookActions";
import { WebhookModal } from "./WebhookModal";

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const wList = await getWebhooks();
    setWebhooks(wList);
    setIsLoading(false);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setSelectedWebhook(null);
    setIsModalOpen(true);
  };

  const handleEdit = (webhook: any) => {
    setSelectedWebhook(webhook);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este webhook?")) return;
    const result = await deleteWebhook(id);
    if (result.success) {
      fetchData();
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    const result = await testWebhook(id);
    setTestingId(null);

    if (result.success) {
      alert(`✅ ${result.message || "Teste enviado com sucesso!"}`);
    } else {
      alert("❌ Erro no teste: " + result.error);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold">Webhooks Ativos</h3>
          <p className="text-secondary text-sm">Gerencie seus pontos de integração em tempo real</p>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={handleAdd}
        >
          <Plus size={18} />
          Novo Webhook
        </button>
      </div>

      {isLoading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 40px',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          gap: '20px',
          minHeight: '300px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle mesh background effect */}
          <div className="absolute inset-0 mesh-gradient opacity-[0.05] pointer-events-none"></div>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Pulsing glow ring */}
            <div style={{
              position: 'absolute',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              filter: 'blur(8px)',
              animation: 'pulse 2s infinite'
            }}></div>
            
            {/* Spinning ring */}
            <Loader2 
              className="animate-spin" 
              size={48} 
              strokeWidth={2} 
              style={{ 
                color: 'var(--accent)',
                filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))'
              }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', zIndex: 1 }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Carregando Webhooks...</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Buscando seus webhooks ativos com segurança</span>
          </div>
        </div>
      ) : webhooks.length === 0 ? (
        <div 
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: 'var(--bg-card)',
            border: '2px dashed rgba(139, 92, 246, 0.2)',
            padding: '96px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '32px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Glowing blur background */}
          <div className="absolute inset-0 mesh-gradient opacity-[0.25] pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_center,_var(--accent)_0%,_transparent_65%)]" style={{ transform: 'scale(1.2)' }}></div>

          {/* Animated Webhook Network Graphic */}
          <div 
            style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '120px', 
              height: '120px',
              margin: '0 auto'
            }}
          >
            {/* Glowing blur behind the icon */}
            <div className="absolute inset-0 bg-[#8b5cf6]/15 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Orbiting dashed tech rings */}
            <div 
              className="absolute border border-dashed border-[#8b5cf6]/25 rounded-full" 
              style={{ 
                width: '110px', 
                height: '110px',
                animation: 'spin 40s linear infinite' 
              }}
            ></div>
            <div 
              className="absolute border border-dashed border-[#8b5cf6]/15 rounded-full" 
              style={{ 
                width: '84px', 
                height: '84px',
                animation: 'spin 20s linear infinite reverse' 
              }}
            ></div>
            
            {/* Center glass container */}
            <div 
              className="relative flex items-center justify-center bg-[#18181b]/95 border border-neutral-800 rounded-2xl shadow-xl inner-glow"
              style={{
                width: '68px',
                height: '68px'
              }}
            >
              <Webhook size={32} className="text-[#8b5cf6] animate-pulse" />
            </div>
            
            {/* Orbiting tiny badge indicator 1 */}
            <div 
              className="absolute bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center shadow-lg" 
              style={{ 
                top: '-4px',
                right: '-4px',
                width: '24px',
                height: '24px',
                animation: 'bounce 3s infinite' 
              }}
            >
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              <span className="absolute w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            </div>

            {/* Orbiting tiny badge indicator 2 */}
            <div 
              className="absolute bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-full flex items-center justify-center shadow-lg" 
              style={{ 
                bottom: '-4px',
                left: '-4px',
                width: '28px',
                height: '28px',
                animation: 'bounce 4s infinite 1s' 
              }}
            >
              <Send size={13} className="text-[#a78bfa]" />
            </div>
          </div>

          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              zIndex: 10 
            }}
          >
            <h4 
              className="font-bold tracking-tight text-white"
              style={{ 
                fontSize: '24px', 
                margin: 0,
                lineHeight: '1.2'
              }}
            >
              Configurar Integração de Webhook
            </h4>
            <p 
              className="text-secondary" 
              style={{ 
                fontSize: '15px', 
                maxWidth: '440px', 
                margin: '0 auto', 
                lineHeight: '1.6', 
                opacity: 0.9 
              }}
            >
              Dispare notificações em tempo real de vendas e reembolsos para qualquer plataforma externa de forma 100% automática.
            </p>
          </div>

          <button 
            className="btn-primary px-8 py-3.5 flex items-center gap-2.5 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-200 z-10"
            onClick={handleAdd}
          >
            <Plus size={20} />
            <span>Criar Novo Webhook</span>
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="checkout-card" style={{ cursor: 'pointer' }} onClick={() => handleEdit(webhook)}>
              <div className="flex justify-between items-start mb-6">
                <img src="/webhook.png" alt="Webhook Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 border border-neutral-200/10" />
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'transparent', color: '#10b981' }}
                >
                  <CheckCircle2 size={12} style={{ color: '#10b981', marginRight: '6px' }} />
                  Ativo
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 truncate">{webhook.name}</h3>
              <p className="text-sm text-secondary mb-6 leading-relaxed truncate flex items-center gap-1.5">
                <ExternalLink size={14} className="shrink-0 text-secondary/60" />
                <span className="truncate">{webhook.url}</span>
              </p>

              <div className="checkout-footer-premium">
                <span className="text-xs font-semibold text-accent flex items-center gap-1">
                  Editar Webhook <ChevronRight size={14} />
                </span>
                <div className="checkout-actions-group flex gap-2">
                  <button 
                    type="button" 
                    className="action-btn-premium open" 
                    title="Testar Webhook"
                    onClick={(e) => { e.stopPropagation(); handleTest(webhook.id); }}
                    disabled={testingId === webhook.id}
                  >
                    {testingId === webhook.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="action-btn-premium delete" 
                    title="Excluir Webhook"
                    onClick={(e) => { e.stopPropagation(); handleDelete(webhook.id); }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WebhookModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWebhook(null);
        }}
        onSuccess={fetchData}
        webhook={selectedWebhook}
      />
    </div>
  );
}

