"use client";

import { useState, useEffect } from "react";
import { X, Webhook, Info, Loader2, CheckCircle2, Package, Search, ChevronDown } from "lucide-react";
import { createWebhook, updateWebhook } from "../actions/webhookActions";
import { getProducts } from "../actions/productActions";
import { useLoading } from "../context/LoadingContext";

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  webhook?: any; // Add this for editing
}

export function WebhookModal({ isOpen, onClose, onSuccess, webhook }: WebhookModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const { setIsLoading } = useLoading();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    secret: "",
    product_ids: [] as string[],
    events: [] as string[]
  });

  // Load products
  useEffect(() => {
    if (isOpen) {
      getProducts().then(setProducts);
    }
  }, [isOpen]);

  // Handle editing mode - initialize form with webhook data
  useEffect(() => {
    if (webhook && isOpen) {
      setFormData({
        name: webhook.name || "",
        url: webhook.url || "",
        secret: webhook.secret || "",
        product_ids: webhook.product_ids || [],
        events: webhook.events || []
      });
    } else if (!webhook && isOpen) {
      // Reset form for new webhook
      setFormData({ name: "", url: "", secret: "", product_ids: [], events: [] });
    }
  }, [webhook, isOpen]);

  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const eventOptions = [
    { id: "card_paid", label: "Card Paid" },
    { id: "card_generated", label: "Card Generated" },
    { id: "card_expired", label: "Card Expired" },
    { id: "card_failed", label: "Card Failed" },
    { id: "card_refunded", label: "Card Refunded" },
    { id: "card_pending", label: "Card Pending" },
    { id: "quiz_completed", label: "Quiz Completed" },
  ];

  useEffect(() => {
    const handleClickOutside = () => setIsProductSelectOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleToggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const handleSelectAllEvents = () => {
    const allEventIds = eventOptions.map(e => e.id);
    const isAllSelected = formData.events.length === allEventIds.length;
    setFormData(prev => ({
      ...prev,
      events: isAllSelected ? [] : allEventIds
    }));
  };

  const handleToggleProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  const selectedProducts = products.filter(p => formData.product_ids.includes(p.id));
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return;

    setLoading(true);
    setIsLoading(true);

    let result;
    if (webhook?.id) {
      // Update existing webhook
      result = await updateWebhook(webhook.id, formData);
    } else {
      // Create new webhook
      result = await createWebhook(formData);
    }

    if (result.success) {
      onSuccess();
      onClose();
      // Only reset if it was a creation, if it's an edit the useEffect handles it
      if (!webhook) {
        setFormData({ name: "", url: "", secret: "", product_ids: [], events: [] });
      }
    } else {
      alert("Erro ao processar webhook: " + result.error);
    }

    setLoading(false);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container custom-scrollbar" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '700px', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
              <Webhook size={20} />
            </div>
            <h2 className="modal-title">{webhook ? "Editar Webhook" : "Novo Webhook"}</h2>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Nome da integração</label>
              <input 
                required
                type="text" 
                className="form-input" 
                placeholder="Ex: Enviar para Zapier"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">URL da integração</label>
              <input 
                required
                type="url" 
                className="form-input" 
                placeholder="https://webhook.site/..."
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              Secret (opcional)
              <Info size={14} className="text-secondary cursor-help" />
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Chave de segurança"
              value={formData.secret}
              onChange={e => setFormData(prev => ({ ...prev, secret: e.target.value }))}
            />
          </div>

          <div className="form-group relative" style={{ overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
            <label className="form-label">Selecione os produtos</label>
            <div 
              className={`form-input min-h-[46px] flex items-center justify-between gap-2 p-2 cursor-pointer transition-all border ${isProductSelectOpen ? 'border-accent ring-1 ring-accent/20' : 'border-slate-800'}`}
              onClick={() => setIsProductSelectOpen(!isProductSelectOpen)}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
            >
              <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden">
                {selectedProducts.length > 0 ? (
                  selectedProducts.map(product => (
                    <div key={product.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 text-accent rounded-lg text-[10px] font-black uppercase tracking-wider border border-accent/20">
                      <span className="truncate max-w-[150px]">{product.name}</span>
                      <X 
                        size={12} 
                        className="cursor-pointer hover:text-white transition-colors" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProduct(product.id);
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500 text-sm ml-2">Clique para selecionar os produtos...</span>
                )}
              </div>
              <ChevronDown 
                size={18} 
                className={`text-slate-500 transition-transform duration-300 mr-1 ${isProductSelectOpen ? 'rotate-180 text-accent' : ''}`} 
              />
            </div>

            {isProductSelectOpen && (
              <div 
                className="absolute z-[9999] left-0 right-0 top-[105%] border border-slate-700 rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden w-full"
                style={{ backgroundColor: '#0f172a' }}
              >
                <div className="p-3 border-b border-slate-800" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}>
                  <div className="relative flex items-center">
                    <div className="absolute left-8 flex items-center pointer-events-none">
                      <Search size={14} className="text-slate-500" />
                    </div>
                    <input 
                      type="text" 
                      style={{ 
                        backgroundColor: '#020617',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        padding: '12px 12px 12px 48px',
                        width: '100%',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        lineHeight: '1.2'
                      }}
                      placeholder="Pesquisar produto..."
                      autoFocus
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar" style={{ backgroundColor: '#0f172a' }}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                      const isSelected = formData.product_ids.includes(product.id);
                      return (
                        <div 
                          key={product.id}
                          className={`flex justify-between items-center p-3 mb-1 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/5 border border-transparent'}`}
                          onClick={() => handleToggleProduct(product.id)}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div 
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent/20 text-accent' : 'text-slate-500'}`}
                              style={{ backgroundColor: isSelected ? undefined : 'rgba(30, 41, 59, 0.5)' }}
                            >
                              <Package size={14} />
                            </div>
                            <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {product.name}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                              <CheckCircle2 size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center space-y-2">
                      <div className="w-12 h-12 bg-slate-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={24} className="text-slate-700 opacity-40" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium italic">Nenhum produto encontrado.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="form-label">Eventos</label>
              <button 
                type="button"
                onClick={handleSelectAllEvents}
                className="text-[10px] font-bold uppercase text-accent hover:underline"
              >
                {formData.events.length === eventOptions.length ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {eventOptions.map(event => (
                <label 
                  key={event.id} 
                  className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${formData.events.includes(event.id) ? 'bg-accent/5 border-accent/40' : 'bg-transparent border-border hover:border-gray-300'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={formData.events.includes(event.id)}
                    onChange={() => handleToggleEvent(event.id)}
                    className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span className="text-[11px] font-semibold">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-footer pt-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : (webhook ? "Salvar Alterações" : "Criar Webhook")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
