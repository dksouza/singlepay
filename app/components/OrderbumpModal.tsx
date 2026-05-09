
"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OrderbumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mainProductId: string;
}

export function OrderbumpModal({ isOpen, onClose, onSuccess, mainProductId }: OrderbumpModalProps) {
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    bump_product_id: mainProductId,
    bump_offer_id: "",
    call_to_action: "Sim, eu aceito essa oferta especial!",
    title: "",
    description: "Adicionar a compra",
    show_image: true
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    setLoadingData(true);
    const supabase = createClient();

    // Fetch offers for the current product
    const { data: offersData } = await supabase
      .from("offers")
      .select("*")
      .eq("product_id", mainProductId)
      .order("name");

    setOffers(offersData || []);
    setLoadingData(false);
  }

  const filteredOffers = offers;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Get current max order_index
    const { data: currentBumps } = await supabase
      .from("orderbumps")
      .select("order_index")
      .eq("product_id", mainProductId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextIndex = currentBumps && currentBumps.length > 0 ? (currentBumps[0].order_index + 1) : 0;

    const { error } = await supabase.from("orderbumps").insert({
      user_id: user.id,
      product_id: mainProductId,
      bump_product_id: formData.bump_product_id,
      bump_offer_id: formData.bump_offer_id || null,
      call_to_action: formData.call_to_action,
      title: formData.title,
      description: formData.description,
      show_image: formData.show_image,
      order_index: nextIndex
    });

    if (error) {
      console.error("Error creating orderbump:", error);
      alert("Erro ao criar orderbump");
    } else {
      onSuccess();
      onClose();
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Novo Orderbump</h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Oferta (Opcional)</label>
            <select
              className="form-select"
              value={formData.bump_offer_id}
              onChange={(e) => setFormData({ ...formData, bump_offer_id: e.target.value })}
            >
              <option value="">Preço padrão do produto</option>
              {filteredOffers.map(o => (
                <option key={o.id} value={o.id}>{o.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: o.currency }).format(o.price)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Call to action</label>
            <input
              type="text"
              className="form-input"
              value={formData.call_to_action}
              onChange={(e) => setFormData({ ...formData, call_to_action: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Título</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nome do produto"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input
              type="text"
              className="form-input"
              placeholder="Adicionar a compra"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <div className="flex items-center justify-between p-4 bg-input rounded-xl border border-border-color">
              <span className="text-sm font-medium">Exibir imagem do produto</span>
              <label className="switch-container">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.show_image}
                  onChange={(e) => setFormData({ ...formData, show_image: e.target.checked })}
                />
                <div className="switch-track">
                  <div className="switch-thumb"></div>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Criar Orderbump"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
