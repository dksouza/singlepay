"use client";

import { useState, useEffect } from "react";
import { Plus, MoreVertical, Calendar, Package, Edit, Copy, Trash, ArrowLeft } from "lucide-react";
import { Header } from "../components/Header";
import { ProductModal } from "../components/ProductModal";
import { DeleteModal } from "../components/DeleteModal";
import { deleteProduct } from "../actions/productActions";
import { useLoading } from "../context/LoadingContext";
import { useRouter } from "next/navigation";

export default function ProductsList({ initialProducts }: { initialProducts: any[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { setIsLoading } = useLoading();
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [productToEdit, setProductToEdit] = useState<any>(null);
  const [products, setProducts] = useState(initialProducts);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products");
      const result = await response.json();

      // Small delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!result.error) {
        setProducts(result);
      } else {
        console.error("Products fetch error:", result.error);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSuccess = (product: any) => {
    if (productToEdit) {
      setProducts(products.map(p => p.id === product.id ? product : p));
    } else {
      setProducts([product, ...products]);
    }
    setProductToEdit(null);
  };

  const handleEdit = (product: any) => {
    router.push(`/produtos/${product.id}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  const openDeleteModal = (product: any) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setDeleteLoading(true);
    setIsLoading(true);
    const result = await deleteProduct(productToDelete.id, productToDelete.image_url);

    // Artificial delay to show the nice spinner
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (result.success) {
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } else {
      alert(result.error || "Erro ao excluir produto");
    }
    setDeleteLoading(false);
    setIsLoading(false);
  };

  return (
    <>
      <Header />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Meus Produtos</h2>
          <p className="text-secondary text-sm">Gerencie sua listagem de produtos do banco de dados</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Adicionar novo produto</span>
        </button>
      </div>

      <div className="nav-divider" style={{ marginBottom: "32px" }}></div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProductSuccess}
      />

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Package size={48} />
          </div>
          <h3>Nenhum produto cadastrado</h3>
          <p>Você ainda não tem produtos no banco de dados. Crie um agora!</p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Criar primeiro produto
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => handleEdit(product)}
              style={{ cursor: 'pointer' }}
            >
              <button
                className="more-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // O menu 'more' já deve ter sua lógica de exibição via CSS ou estado
                }}
              >
                <MoreVertical size={18} />
              </button>

              <div className="product-actions" onClick={(e) => e.stopPropagation()}>
                <button className="action-item" onClick={() => handleEdit(product)}>
                  <Edit size={14} /> Editar
                </button>
                <button className="action-item"><Copy size={14} /> Duplicar</button>
                <button
                  className="action-item action-delete"
                  onClick={() => openDeleteModal(product)}
                >
                  <Trash size={14} /> Excluir
                </button>
              </div>

              <div className="product-image-container">
                <img
                  src={product.image_url || "/no-image.png"}
                  alt={product.name}
                  className="product-image"
                />
              </div>

              <div className="product-content">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-price">
                  {new Intl.NumberFormat(product.currency === "BRL" ? "pt-BR" : (product.currency === "EUR" ? "de-DE" : "en-US"), {
                    style: "currency",
                    currency: product.currency || "BRL",
                  }).format(product.price)}
                </p>

                <div className="product-info-row">
                  <div className="flex items-center gap-1">
                    <Package size={12} style={{ opacity: 0.6 }} />
                    <span className="text-[11px] text-secondary">Produto Digital</span>
                  </div>
                  <div className={`status-tag ${product.status === "Ativo" ? "status-active" : "status-inactive"}`}>
                    {product.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleProductSuccess}
        initialData={productToEdit}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        itemName={productToDelete?.name || ""}
      />
    </>
  );
}
