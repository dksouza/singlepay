"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, Info, Loader2 } from "lucide-react";
import { saveStripeConfig } from "../actions/integrationActions";
import { useLoading } from "../context/LoadingContext";

interface StripeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function StripeConfigModal({ isOpen, onClose, onSuccess, initialData }: StripeConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const { setIsLoading } = useLoading();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await saveStripeConfig(formData);

    // Artificial delay to show the nice spinner
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      alert(result.error || "Erro ao salvar configuração");
    }
    setLoading(false);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <img src="/stripe.png" alt="Stripe Logo" className="w-[60px] h-[60px] rounded-lg object-contain bg-white p-1.5 border border-neutral-200/10 shadow-sm" />
            <h2 className="modal-title">Configurar Stripe</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ 
          backgroundColor: '#fefce8', 
          border: '1px solid #fef08a', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '40px', 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: '#fef9c3', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <Info style={{ color: '#a16207' }} size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ 
              fontSize: '13px', 
              color: '#854d0e', 
              lineHeight: '1.5', 
              fontWeight: '500',
              margin: 0
            }}>
              <strong>Importante:</strong> Pegue suas chaves no painel da Stripe em <strong>Developers {' > '} API keys</strong>. Use chaves de produção (live) para realizar vendas reais.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Secret Key (sk_live_...)</label>
            <input 
              name="secret_key"
              type="password" 
              className="form-input" 
              placeholder="sk_live_xxxxxxxxxxxxxxxxxxxxxxxx" 
              defaultValue={initialData?.secret_key || ""}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Publishable Key (pk_live_...)</label>
            <input 
              name="publishable_key"
              type="text" 
              className="form-input" 
              placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx" 
              defaultValue={initialData?.publishable_key || ""}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Webhook Secret (whsec_...)</label>
            <input 
              name="webhook_secret"
              type="password" 
              className="form-input" 
              placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx" 
              defaultValue={initialData?.webhook_secret || ""}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Salvar Configuração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
