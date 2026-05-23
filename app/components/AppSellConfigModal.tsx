"use client";

import { X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { saveAppSellConfig } from "../actions/appsellActions";

interface AppSellConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function AppSellConfigModal({ isOpen, onClose, onSuccess, initialData }: AppSellConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [apiToken, setApiToken] = useState("");

  useEffect(() => {
    if (initialData) {
      setApiToken(initialData.api_token || "");
    } else {
      setApiToken("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await saveAppSellConfig(apiToken);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      alert(result.error || "Erro ao salvar configuração");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <img src="/appsell.png" alt="AppSell Logo" className="rounded-lg object-contain bg-white p-1.5 border border-neutral-200/10 shadow-sm" style={{ width: '60px', height: '60px', minWidth: '60px', flexShrink: 0 }} />
            <h2 className="modal-title">Configurar AppSell</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">API Token</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cole seu token ou deixe vazio para desconectar"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <p className="text-xs text-secondary mt-2">
              Insira o token de API da sua conta AppSell para integrar com seus checkouts e ofertas.
            </p>
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
