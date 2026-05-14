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
          <div className="w-20 h-20 bg-accent/5 rounded-3xl flex items-center justify-center text-accent/20">
            <Webhook size={40} />
          </div>
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
            <div key={webhook.id} className="checkout-card group" style={{ cursor: 'default' }}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
                  <Webhook size={24} />
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                  >
                    <CheckCircle2 size={12} />
                    Ativo
                  </div>
                  
                  <div className="relative group/menu">
                    <button 
                      type="button"
                      className="more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === webhook.id ? null : webhook.id);
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    <div 
                      className={`product-actions ${openMenuId === webhook.id ? "flex" : "hidden"} group-hover/menu:flex`} 
                      style={{ display: openMenuId === webhook.id ? 'flex' : undefined }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="action-item" onClick={() => handleEdit(webhook)}>
                        <Edit size={14} /> Editar
                      </button>
                      <button 
                        className="action-item action-delete" 
                        onClick={() => handleDelete(webhook.id)}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 truncate text-white">{webhook.name}</h3>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-8 opacity-70">
                <ExternalLink size={12} className="shrink-0" />
                <p className="truncate">{webhook.url}</p>
              </div>

              <div className="checkout-footer-premium mt-auto pt-6 border-t border-slate-800/60">
                <button 
                  type="button"
                  className="btn-primary flex items-center justify-center gap-2 px-6 py-2.5 text-sm"
                  onClick={() => handleTest(webhook.id)}
                  disabled={testingId === webhook.id}
                >
                  {testingId === webhook.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Testar Agora
                </button>
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

