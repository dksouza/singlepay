"use client";

import { X, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { getProducts } from "../actions/productActions";
import { createCheckout, updateCheckout } from "../actions/checkoutActions";
import { useLoading } from "../context/LoadingContext";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (checkout: any) => void;
  initialData?: any;
  fixedProductId?: string;
}

export function CheckoutModal({ isOpen, onClose, onSuccess, initialData, fixedProductId }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const { setIsLoading } = useLoading();
  const [products, setProducts] = useState<any[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(false);

  const [isSubscription, setIsSubscription] = useState(false);

  useEffect(() => {
    if (initialData) {
      setIsSubscription(initialData.payment_type === "subscription");
    } else {
      setIsSubscription(false);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen && !fixedProductId) {
      fetchProducts();
    }
  }, [isOpen, fixedProductId]);

  const fetchProducts = async () => {
    setFetchingProducts(true);
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
    setFetchingProducts(false);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("payment_type", isSubscription ? "subscription" : "single");
    
    if (fixedProductId) {
      formData.set("product_id", fixedProductId);
    }

    const result = initialData 
      ? await updateCheckout(initialData.id, formData)
      : await createCheckout(formData);

    if (result.success) {
      onSuccess(result.data);
      onClose();
    } else {
      alert(result.error || "Erro ao processar checkout");
    }
    setLoading(false);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{initialData ? "Editar Checkout" : "Criar Novo Checkout"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título da Oferta</label>
            <input 
              name="title"
              type="text" 
              className="form-input" 
              placeholder="Ex: Oferta Especial de Lançamento" 
              defaultValue={initialData?.title || ""}
              required
            />
          </div>

          {!fixedProductId && (
            <div className="form-group">
              <label className="form-label">Produto</label>
              <select name="product_id" className="form-select" required defaultValue={initialData?.product_id || ""}>
                <option value="" disabled>Selecione um produto</option>
                {fetchingProducts ? (
                  <option disabled>Carregando produtos...</option>
                ) : products.length === 0 ? (
                  <option disabled>Nenhum produto encontrado</option>
                ) : (
                  products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: product.currency || "USD",
                      }).format(product.price)}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tipo de Pagamento</label>
            <div className="flex items-center justify-between p-4 bg-input rounded-xl border border-color">
              <span className="text-sm font-medium">Assinatura Mensal</span>
              <label className="switch-container">
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isSubscription}
                  onChange={(e) => setIsSubscription(e.target.checked)}
                />
                <div className="switch-track">
                  <div className="switch-thumb"></div>
                </div>
              </label>
            </div>
            <p className="text-xs text-secondary mt-2">
              {isSubscription 
                ? "Cobrança recorrente automática para o cliente." 
                : "Pagamento único no ato da compra."}
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading || (fetchingProducts && !fixedProductId)}>
              {loading ? "Processando..." : (initialData ? "Salvar Alterações" : "Criar Checkout")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
