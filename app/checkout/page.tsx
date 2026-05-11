"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { Plus, CreditCard as CreditCardIcon, ExternalLink, Edit, Trash2, MoreVertical, Package, Zap } from "lucide-react";
import { Header } from "../components/Header";
import { CheckoutModal } from "../components/CheckoutModal";
import { DeleteModal } from "../components/DeleteModal";
import { useState, useEffect } from "react";
import { getCheckouts, deleteCheckout } from "../actions/checkoutActions";
import { useLoading } from "../context/LoadingContext";


export default function CheckoutPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { setIsLoading } = useLoading();
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const fetchCheckouts = async () => {
    setLoading(true);
    setIsLoading(true);
    const data = await getCheckouts();
    setCheckouts(data);
    setLoading(false);
    setIsLoading(false);
  };

  const handleCheckoutSuccess = () => {
    fetchCheckouts();
    setIsModalOpen(false);
    setSelectedCheckout(null);
  };

  const handleEdit = (checkout: any) => {
    setSelectedCheckout(checkout);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (checkout: any) => {
    setSelectedCheckout(checkout);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCheckout) return;
    setDeleteLoading(true);
    setIsLoading(true);
    const result = await deleteCheckout(selectedCheckout.id);
    
    // Artificial delay to show the nice spinner
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (result.success) {
      setCheckouts(checkouts.filter(c => c.id !== selectedCheckout.id));
      setIsDeleteModalOpen(false);
    } else {
      alert(result.error || "Erro ao excluir checkout");
    }
    setDeleteLoading(false);
    setIsLoading(false);
    setSelectedCheckout(null);
  };

  const openCheckoutLink = (hash: string) => {
    // For now, just show the link. In the future, this will be the real checkout URL
    const url = `${window.location.origin}/pay/${hash}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Header />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Checkout</h2>
          <p className="text-secondary text-sm">Gerencie seus links de checkout e pagamentos</p>
        </div>
        <button className="btn-primary" onClick={() => { setSelectedCheckout(null); setIsModalOpen(true); }}>
          <Plus size={18} />
          <span>Criar novo checkout</span>
        </button>
      </div>

      <div className="nav-divider" style={{ marginBottom: "32px" }}></div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : checkouts.length > 0 ? (
        <div className="product-grid">
          {checkouts.map((checkout) => (
            <div key={checkout.id} className="checkout-card">
              <div className="flex justify-between items-start mb-4">
                <div className={`checkout-badge ${checkout.payment_type === "subscription" ? "badge-subscription" : "badge-single"}`}>
                  {checkout.payment_type === "subscription" ? (
                    <Zap size={14} />
                  ) : (
                    <CreditCardIcon size={14} />
                  )}
                  {checkout.payment_type === "subscription" ? "Assinatura" : "Pagamento Único"}
                </div>
              </div>

              <div className="checkout-product-tag">
                <Package size={16} />
                <span>{checkout.products?.name || "Produto Removido"}</span>
              </div>
              
              <h3 className="checkout-title-premium">{checkout.title}</h3>
              
              <div className="checkout-footer-premium">
                <div className="checkout-price-large">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: checkout.products?.currency || "USD",
                  }).format(checkout.products?.price || 0)}
                </div>
                <div className="checkout-actions-group">
                  <button className="action-btn-premium open" title="Abrir link" onClick={() => openCheckoutLink(checkout.hash)}>
                    <ExternalLink size={18} />
                  </button>
                  <button className="action-btn-premium" title="Editar" onClick={() => handleEdit(checkout)}>
                    <Edit size={18} />
                  </button>
                  <button className="action-btn-premium delete" title="Excluir" onClick={() => handleDeleteClick(checkout)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <CreditCardIcon size={48} />
          </div>
          <h3>Nenhum checkout configurado</h3>
          <p>Você ainda não tem links de checkout. Crie um agora para começar a vender!</p>
          <button className="btn-primary" onClick={() => { setSelectedCheckout(null); setIsModalOpen(true); }}>
            Criar primeiro checkout
          </button>
        </div>
      )}

      <CheckoutModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCheckoutSuccess}
        initialData={selectedCheckout}
      />

      <DeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        itemName={selectedCheckout?.title || ""}
        title="Excluir Checkout"
      />
    </>
  );
}
