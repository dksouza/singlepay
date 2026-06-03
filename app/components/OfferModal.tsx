"use client";

import { X, Tag, DollarSign, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { createOffer, updateOffer } from "../actions/offerActions";
import { useLoading } from "../context/LoadingContext";

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (offer: any) => void;
  initialData?: any;
  productId: string;
}

export function OfferModal({ isOpen, onClose, onSuccess, initialData, productId }: OfferModalProps) {
  const [loading, setLoading] = useState(false);
  const { setIsLoading } = useLoading();
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("BRL");

  useEffect(() => {
    if (initialData) {
      setCurrency(initialData.currency || "BRL");
      const locale = initialData.currency === "USD" ? "en-US" : (initialData.currency === "EUR" ? "de-DE" : "pt-BR");
      setPrice(new Intl.NumberFormat(locale, {
        style: "currency",
        currency: initialData.currency || "BRL",
      }).format(initialData.price));
    } else {
      setPrice("");
      setCurrency("BRL");
    }
  }, [initialData, isOpen]);

  const formatCurrencyValue = (value: string, curr: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";

    const amount = parseInt(digits) / 100;
    const locale = curr === "USD" ? "en-US" : (curr === "EUR" ? "de-DE" : "pt-BR");
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: curr,
    }).format(amount);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyValue(e.target.value, currency);
    setPrice(formatted);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurr = e.target.value;
    setCurrency(newCurr);
    const digits = price.replace(/\D/g, "");
    if (digits) {
      setPrice(formatCurrencyValue(digits, newCurr));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("product_id", productId);
    
    const result = initialData 
      ? await updateOffer(initialData.id, formData)
      : await createOffer(formData);

    if (result.success) {
      onSuccess(result.data);
      onClose();
    } else {
      alert(result.error || "Erro ao processar oferta");
    }
    setLoading(false);
    setIsLoading(false);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="modal-title m-0">{initialData ? "Editar Oferta" : "Criar Nova Oferta"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="drawer-body custom-scrollbar">
          <div className="form-group">
            <label className="form-label">Nome da Oferta</label>
            <input 
              name="name"
              type="text" 
              className="form-input" 
              placeholder="Ex: Oferta Black Friday" 
              defaultValue={initialData?.name || ""}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                <Globe size={14} className="inline mr-1 mb-0.5" />
                Moeda
              </label>
              <select 
                name="currency" 
                className="form-select" 
                value={currency} 
                onChange={handleCurrencyChange}
                required
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <DollarSign size={14} className="inline mr-1 mb-0.5" />
                Preço
              </label>
              <input 
                name="price"
                type="text" 
                className="form-input" 
                value={price}
                onChange={handlePriceChange}
                placeholder="R$ 0,00"
                required
              />
            </div>
          </div>
          </div>

          <div className="drawer-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Processando..." : (initialData ? "Salvar Alterações" : "Criar Oferta")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
