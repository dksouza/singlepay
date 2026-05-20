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
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-card p-16 rounded-3xl border border-dashed border-border flex flex-col items-center text-center gap-6">
          <img src="/webhook.png" alt="Webhook Logo" className="w-20 h-20 rounded-3xl object-contain bg-white p-2.5 border border-neutral-200/10 shadow-sm" />
          <div className="space-y-2">
            <h4 className="font-bold text-xl">Configurar Webhook</h4>
            <p className="text-secondary text-sm max-w-sm mx-auto leading-relaxed">
              Integre sua conta com ferramentas externas recebendo notificações de eventos em tempo real.
            </p>
          </div>
          <button 
            className="btn-primary px-8 py-3 flex items-center gap-2"
            onClick={handleAdd}
          >
            <Plus size={20} />
            Criar Webhook
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

