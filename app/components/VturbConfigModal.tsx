"use client";

import { X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { saveVturbConfig } from "../actions/vturbActions";

interface VturbConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function VturbConfigModal({ isOpen, onClose, onSuccess, initialData }: VturbConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (initialData) {
      setUrl(initialData.url || "");
      setToken(initialData.token || "");
    } else {
      setUrl("");
      setToken("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await saveVturbConfig(url, token);

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
            <img src="/vturb.png" alt="Vturb Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-2.5 border border-neutral-200/10 shadow-sm" />
            <h2 className="modal-title">Configurar Vturb</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">URL da Integração</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cole a URL do Vturb ou deixe vazio para desconectar"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Token / Chave API</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cole o token do Vturb"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-secondary mt-2">
              Insira as credenciais da sua conta Vturb para integrar com sua plataforma.
            </p>
          </div>

          <div className="modal-footer mt-6">
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
