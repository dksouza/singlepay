
"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OrderbumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mainProductId: string;
  initialData?: any;
}

export function OrderbumpModal({ isOpen, onClose, onSuccess, mainProductId, initialData }: OrderbumpModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    bump_product_id: "",
    bump_offer_id: "",
    call_to_action: "Sim, eu aceito essa oferta especial!",
    title: "",
    description: "Adicionar a compra",
    show_image: true
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (initialData) {
        setFormData({
          bump_product_id: initialData.bump_product_id,
          bump_offer_id: initialData.bump_offer_id || "",
          call_to_action: initialData.call_to_action,
          title: initialData.title,
          description: initialData.description,
          show_image: initialData.show_image !== false
        });
      } else {
        setFormData({
          bump_product_id: "",
          bump_offer_id: "",
          call_to_action: "Sim, eu aceito essa oferta especial!",
          title: "",
          description: "Adicionar a compra",
          show_image: true
        });
      }
    }
  }, [isOpen, initialData]);

  // When selected product changes, fetch its offers
  useEffect(() => {
    if (formData.bump_product_id) {
      fetchOffers(formData.bump_product_id);
      
      // Update title with product name if title is empty or was previous product name
      const selectedProduct = products.find(p => p.id === formData.bump_product_id);
      if (selectedProduct && (!formData.title || products.some(p => p.name === formData.title))) {
        setFormData(prev => ({ ...prev, title: selectedProduct.name }));
      }
    } else {
      setOffers([]);
    }
  }, [formData.bump_product_id]);

  async function fetchProducts() {
    setLoadingData(true);
    const supabase = createClient();
    
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .neq("id", mainProductId)
      .order("name");

    setProducts(productsData || []);
    
    // Set first available product as default if none selected and not editing
    if (productsData && productsData.length > 0 && !formData.bump_product_id && !initialData) {
      setFormData(prev => ({ ...prev, bump_product_id: productsData[0].id }));
    }
    
    setLoadingData(false);
  }

  async function fetchOffers(productId: string) {
    const supabase = createClient();
    const { data: offersData } = await supabase
      .from("offers")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("name");

    setOffers(offersData || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.bump_product_id) return;
    
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    if (initialData) {
      // Update
      const { error } = await supabase
        .from("orderbumps")
        .update({
          bump_product_id: formData.bump_product_id,
          bump_offer_id: formData.bump_offer_id || null,
          call_to_action: formData.call_to_action,
          title: formData.title,
          description: formData.description,
          show_image: formData.show_image,
        })
        .eq("id", initialData.id);

      if (error) {
        console.error("Error updating orderbump:", error);
        alert("Erro ao atualizar orderbump");
      } else {
        onSuccess();
        onClose();
      }
    } else {
      // Create
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
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">{initialData ? "Editar Orderbump" : "Novo Orderbump"}</h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Produto</label>
            <select
              className="form-select"
              value={formData.bump_product_id}
              onChange={(e) => setFormData({ ...formData, bump_product_id: e.target.value, bump_offer_id: "" })}
              required
            >
              <option value="" disabled>Selecione um produto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Oferta (Opcional)</label>
            <select
              className="form-select"
              value={formData.bump_offer_id}
              onChange={(e) => setFormData({ ...formData, bump_offer_id: e.target.value })}
            >
              <option value="">Preço padrão do produto</option>
              {offers.map(o => (
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
              {loading ? <Loader2 className="animate-spin" size={18} /> : (initialData ? "Salvar Alterações" : "Criar Orderbump")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
