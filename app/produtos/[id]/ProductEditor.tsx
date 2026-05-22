"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Upload, ArrowLeft, Save, Loader2, Image as ImageIcon,
  Info, DollarSign, Globe, Link as LinkIcon, ShoppingBag,
  Settings, Zap, CreditCard, Layout, Plus, ExternalLink, Edit, Trash2,
  Copy, MoreHorizontal, Check, Tag, GripVertical, AlertTriangle
} from "lucide-react";
import { updateProduct } from "@/app/actions/productActions";
import { getCheckoutsByProductId, deleteCheckout, toggleCheckoutStatus } from "@/app/actions/checkoutActions";
import { useRouter } from "next/navigation";
import { useLoading } from "@/app/context/LoadingContext";
import { CheckoutModal } from "@/app/components/CheckoutModal";
import { OfferModal } from "@/app/components/OfferModal";
import { OrderbumpModal } from "@/app/components/OrderbumpModal";
import { UpsellModal } from "@/app/components/UpsellModal";
import { DeleteModal } from "@/app/components/DeleteModal";
import { getOffersByProductId, deleteOffer, toggleOfferStatus } from "@/app/actions/offerActions";
import { toggleUpsellStatus } from "@/app/actions/upsellActions";
import { createClient } from "@/lib/supabase/client";
import styles from "./ProductEditor.module.css";
import { convertToWebP } from "@/lib/image-utils";

type Tab = "geral" | "orderbump" | "upsell" | "checkout" | "ofertas" | "links";

export default function ProductEditor({ product }: { product: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("geral");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Checkouts State
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [loadingCheckouts, setLoadingCheckouts] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Offers State
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isOfferDeleteModalOpen, setIsOfferDeleteModalOpen] = useState(false);

  // Orderbumps State
  const [orderbumps, setOrderbumps] = useState<any[]>([]);
  const [loadingOrderbumps, setLoadingOrderbumps] = useState(false);
  const [selectedOrderbump, setSelectedOrderbump] = useState<any>(null);
  const [isOrderbumpModalOpen, setIsOrderbumpModalOpen] = useState(false);
  const [isOrderbumpDeleteModalOpen, setIsOrderbumpDeleteModalOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [selectedUpsell, setSelectedUpsell] = useState<any>(null);
  const [isUpsellDeleteModalOpen, setIsUpsellDeleteModalOpen] = useState(false);
  const [upsellInitialStep, setUpsellInitialStep] = useState<number>(1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Geral Tab State
  const [selectedImage, setSelectedImage] = useState<string | null>(product.image_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currency, setCurrency] = useState(product.currency || "BRL");
  const [price, setPrice] = useState("");
  const [metadataList, setMetadataList] = useState<{key: string, value: string}[]>(() => {
    if (product?.extra_metadata && Array.isArray(product.extra_metadata)) {
      return product.extra_metadata;
    }
    return [];
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchCheckouts();
    fetchOffers();
    fetchOrderbumps();
    fetchUpsellStrategies();
  }, []);

  const [upsellStrategies, setUpsellStrategies] = useState<any[]>([]);
  const [loadingUpsell, setLoadingUpsell] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  async function fetchUpsellStrategies() {
    setLoadingUpsell(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("upsell_strategies")
      .select(`
        *,
        upsell_product:upsell_product_id(name),
        upsell_offer:upsell_offer_id(name, price, currency)
      `)
      .eq("product_id", product.id)
      .order("created_at", { ascending: false });

    setUpsellStrategies(data || []);
    setLoadingUpsell(false);
  }

  const handleEditUpsell = (strategy: any) => {
    setSelectedUpsell(strategy);
    setUpsellInitialStep(1);
    setIsUpsellModalOpen(true);
  };

  const handleViewUpsellCode = (strategy: any) => {
    setSelectedUpsell(strategy);
    setUpsellInitialStep(5); // Direct to success/code screen
    setIsUpsellModalOpen(true);
  };

  const handleDeleteUpsell = (strategy: any) => {
    setSelectedUpsell(strategy);
    setIsUpsellDeleteModalOpen(true);
  };

  const handleConfirmDeleteUpsell = async () => {
    if (!selectedUpsell) return;
    setDeleteLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("upsell_strategies")
      .delete()
      .eq("id", selectedUpsell.id);

    if (error) {
      setNotification({
        isOpen: true,
        title: "Erro ao excluir",
        message: error.message.includes("violates foreign key constraint")
          ? "Esta estratégia não pode ser excluída porque já foi utilizada em vendas. Você pode apenas desativá-la."
          : "Não foi possível excluir a estratégia: " + error.message,
        type: "error"
      });
    } else {
      fetchUpsellStrategies();
      setIsUpsellDeleteModalOpen(false);
    }
    setDeleteLoading(false);
    setSelectedUpsell(null);
  };

  const handleToggleUpsellStatus = async (strategy: any) => {
    const result = await toggleUpsellStatus(strategy.id, strategy.is_active !== false, product.id);
    if (result.success) {
      setUpsellStrategies(upsellStrategies.map(s => s.id === strategy.id ? { ...s, is_active: !s.is_active } : s));
    } else {
      alert(result.error || "Erro ao alterar status da estratégia");
    }
  };

  async function fetchOrderbumps() {
    setLoadingOrderbumps(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orderbumps")
      .select(`
        *,
        bump_product:bump_product_id(*),
        bump_offer:bump_offer_id(*)
      `)
      .eq("product_id", product.id)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching orderbumps:", error);
      // alert("Erro ao buscar orderbumps: " + error.message);
    }

    setOrderbumps(data || []);
    setLoadingOrderbumps(false);
  }

  const handleEditOrderbump = (bump: any) => {
    setSelectedOrderbump(bump);
    setIsOrderbumpModalOpen(true);
  };

  const handleDeleteOrderbump = (bump: any) => {
    setSelectedOrderbump(bump);
    setIsOrderbumpDeleteModalOpen(true);
  };

  const handleConfirmDeleteOrderbump = async () => {
    if (!selectedOrderbump) return;
    setDeleteLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("orderbumps")
      .delete()
      .eq("id", selectedOrderbump.id);

    if (error) {
      alert("Erro ao excluir orderbump: " + error.message);
    } else {
      fetchOrderbumps();
      setIsOrderbumpDeleteModalOpen(false);
    }
    setDeleteLoading(false);
    setSelectedOrderbump(null);
  };

  const handleToggleOrderbumpStatus = async (bump: any) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("orderbumps")
      .update({ is_active: bump.is_active === false })
      .eq("id", bump.id);

    if (error) {
      alert("Erro ao alterar status do orderbump: " + error.message);
    } else {
      setOrderbumps(orderbumps.map(b => b.id === bump.id ? { ...b, is_active: !b.is_active } : b));
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrderbumps = [...orderbumps];
    const draggedItem = newOrderbumps[draggedIndex];
    newOrderbumps.splice(draggedIndex, 1);
    newOrderbumps.splice(index, 0, draggedItem);

    // Update locally
    setOrderbumps(newOrderbumps);
    setDraggedIndex(null);

    // Update in database
    const supabase = createClient();
    const updates = newOrderbumps.map((bump, idx) => ({
      id: bump.id,
      order_index: idx
    }));

    for (const update of updates) {
      await supabase
        .from("orderbumps")
        .update({ order_index: update.order_index })
        .eq("id", update.id);
    }
  };

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const fetchCheckouts = async () => {
    setLoadingCheckouts(true);
    const data = await getCheckoutsByProductId(product.id);
    setCheckouts(data);
    setLoadingCheckouts(false);
  };

  const fetchOffers = async () => {
    setLoadingOffers(true);
    const data = await getOffersByProductId(product.id);
    setOffers(data);
    setLoadingOffers(false);
  };

  const handleOfferSuccess = () => {
    fetchOffers();
    setIsOfferModalOpen(false);
    setSelectedOffer(null);
  };

  const handleEditOffer = (offer: any) => {
    setSelectedOffer(offer);
    setIsOfferModalOpen(true);
  };

  const handleDeleteOffer = (offer: any) => {
    setSelectedOffer(offer);
    setIsOfferDeleteModalOpen(true);
  };

  const handleConfirmDeleteOffer = async () => {
    if (!selectedOffer) return;
    setDeleteLoading(true);
    const result = await deleteOffer(selectedOffer.id, product.id);
    if (result.success) {
      setOffers(offers.filter(o => o.id !== selectedOffer.id));
      setIsOfferDeleteModalOpen(false);
    } else {
      setNotification({
        isOpen: true,
        title: "Ação não permitida",
        message: result.error?.includes("violates foreign key constraint")
          ? "Esta oferta não pode ser excluída porque já existem vendas vinculadas a ela. Para manter seu histórico financeiro íntegro, o sistema impede a exclusão de ofertas que já processaram pagamentos."
          : (result.error || "Erro ao excluir oferta"),
        type: "warning"
      });
      setIsOfferDeleteModalOpen(false);
    }
    setDeleteLoading(false);
    setSelectedOffer(null);
  };

  const handleToggleOfferStatus = async (offer: any) => {
    const result = await toggleOfferStatus(offer.id, offer.is_active, product.id);
    if (result.success) {
      setOffers(offers.map(o => o.id === offer.id ? { ...o, is_active: !o.is_active } : o));
    } else {
      alert(result.error || "Erro ao alterar status da oferta");
    }
  };

  const handleCheckoutSuccess = () => {
    fetchCheckouts();
    setIsModalOpen(false);
    setSelectedCheckout(null);
  };

  const handleEditCheckout = (checkout: any) => {
    setSelectedCheckout(checkout);
    setIsModalOpen(true);
  };

  const handleDeleteCheckout = (checkout: any) => {
    setSelectedCheckout(checkout);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCheckout) return;
    setDeleteLoading(true);
    const result = await deleteCheckout(selectedCheckout.id);
    if (result.success) {
      setCheckouts(checkouts.filter(c => c.id !== selectedCheckout.id));
      setIsDeleteModalOpen(false);
    } else {
      setNotification({
        isOpen: true,
        title: "Ação não permitida",
        message: result.error?.includes("violates foreign key constraint")
          ? "Este checkout não pode ser excluído porque já existem vendas vinculadas a ele. Para manter seu histórico financeiro íntegro, o sistema impede a exclusão de checkouts que já processaram pagamentos."
          : (result.error || "Erro ao excluir checkout"),
        type: "warning"
      });
      setIsDeleteModalOpen(false);
    }
    setDeleteLoading(false);
    setSelectedCheckout(null);
  };

  const handleToggleCheckoutStatus = async (checkout: any) => {
    const result = await toggleCheckoutStatus(checkout.id, checkout.is_active);
    if (result.success) {
      setCheckouts(checkouts.map(c => c.id === checkout.id ? { ...c, is_active: !c.is_active } : c));
    } else {
      alert(result.error || "Erro ao alterar status do checkout");
    }
  };

  const openCheckoutLink = (hash: string) => {
    const url = `${window.location.origin}/pay/${hash}`;
    window.open(url, "_blank");
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (hash: string, id: string) => {
    const url = `${window.location.origin}/pay/${hash}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const locale = product.currency === "USD" ? "en-US" : (product.currency === "EUR" ? "de-DE" : "pt-BR");
    setPrice(new Intl.NumberFormat(locale, {
      style: "currency",
      currency: product.currency || "BRL",
    }).format(product.price));
  }, [product]);

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

  const handleFile = async (file: File) => {
    if (file && file.type.startsWith("image/")) {
      try {
        const webpFile = await convertToWebP(file);
        setSelectedFile(webpFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(webpFile);
      } catch (error) {
        console.error("Error converting image to WebP:", error);
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setIsLoading(true);

    const formElement = document.getElementById("product-form") as HTMLFormElement;
    const formData = new FormData(formElement);
    if (selectedFile) {
      formData.set("image", selectedFile);
    }
    
    const filteredMetadata = metadataList.filter(m => m.key.trim() !== "");
    formData.set("extra_metadata", JSON.stringify(filteredMetadata));

    const result = await updateProduct(product.id, formData, product.image_url);

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.refresh();
    } else {
      alert(result.error || "Erro ao atualizar produto");
    }
    setLoading(false);
    setIsLoading(false);
  };

  return (
    <div className={`${styles.editorContainer} ${scrolled ? styles.scrolled : ""}`}>
      {/* Sticky Header */}
      <header className={styles.stickyHeader}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/produtos")}
            className={styles.backButton}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
              <span className="status-tag status-active flex items-center gap-1.5 py-1 px-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Ativo
              </span>
            </div>
            <p className="text-secondary text-xs font-medium uppercase tracking-wider mt-0.5">Editor de Produto</p>
          </div>
        </div>

        <div className={styles.headerActions}>
        </div>
      </header>

      {/* Modern Tabs */}
      <nav className={styles.tabList}>
        <button
          className={`${styles.tabTrigger} ${activeTab === "geral" ? styles.tabTriggerActive : ""}`}
          onClick={() => setActiveTab("geral")}
        >
          <Settings size={18} />
          Geral
        </button>
        <button
          className={`${styles.tabTrigger} ${activeTab === "checkout" ? styles.tabTriggerActive : ""}`}
          onClick={() => setActiveTab("checkout")}
        >
          <Layout size={18} />
          Checkout
        </button>
        <button
          className={`${styles.tabTrigger} ${activeTab === "ofertas" ? styles.tabTriggerActive : ""}`}
          onClick={() => setActiveTab("ofertas")}
        >
          <Tag size={18} />
          Ofertas
        </button>
        <button
          className={`${styles.tabTrigger} ${activeTab === "orderbump" ? styles.tabTriggerActive : ""}`}
          onClick={() => setActiveTab("orderbump")}
        >
          <Zap size={18} />
          Orderbump
        </button>
        <button
          className={`${styles.tabTrigger} ${activeTab === "upsell" ? styles.tabTriggerActive : ""}`}
          onClick={() => setActiveTab("upsell")}
        >
          <ShoppingBag size={18} />
          Upsell
        </button>
        <button
          className={`${styles.tabTrigger} ${activeTab === "links" ? styles.tabTriggerActive : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <LinkIcon size={18} />
          Links
        </button>
      </nav>

      {/* Tab Specific Action Bar */}
      {activeTab === "geral" && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '32px' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className={styles.saveBtn}
            disabled={loading}
            style={{ boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)' }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>{loading ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="animate-fadeIn" style={{ animation: 'fadeIn 0.4s ease-out' }}>
        {activeTab === "geral" && (
          <form id="product-form" onSubmit={handleSubmit}>
            <div className={styles.grid}>
              {/* Left Column */}
              <div className="space-y-6">
                {/* Basic Info */}
                <section className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>
                    <Info size={20} />
                    Informações Básicas
                  </h2>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Nome do produto</label>
                    <input
                      name="name"
                      type="text"
                      className="form-input"
                      defaultValue={product.name}
                      placeholder="Ex: Smart Watch Aurora"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Descrição</label>
                    <textarea
                      name="description"
                      className={`form-textarea ${styles.descriptionTextarea}`}
                      defaultValue={product.description}
                      placeholder="Descreva as principais características e benefícios do seu produto..."
                    ></textarea>
                  </div>
                </section>

                {/* Pricing & Delivery */}
                <section className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>
                    <CreditCard size={20} />
                    Preificação e Entrega
                  </h2>

                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>
                        <Globe size={14} />
                        Moeda
                      </label>
                      <select name="currency" className="form-select" value={currency} onChange={handleCurrencyChange}>
                        <option value="BRL">Real (BRL)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>
                        <DollarSign size={14} />
                        Valor do Produto
                      </label>
                      <input
                        name="price"
                        type="text"
                        className="form-input"
                        value={price}
                        onChange={handlePriceChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <LinkIcon size={14} />
                      Link de Entrega
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        name="delivery_link"
                        type="url"
                        className="form-input"
                        placeholder="https://sua-entrega.com/download"
                        defaultValue={product.delivery_link}
                      />
                    </div>
                    <p className="text-[11px] text-secondary mt-1">Este link será enviado automaticamente após a confirmação do pagamento.</p>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={styles.label + " mb-0"}>
                        <Tag size={14} />
                        Metadados Extras <span className="text-xs text-secondary opacity-70 font-normal ml-1">(Chave / Valor)</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setMetadataList([...metadataList, { key: "", value: "" }])}
                        className="text-xs text-primary font-bold flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                    
                    {metadataList.length === 0 ? (
                      <div className="text-xs text-secondary opacity-50 py-2 border border-dashed border-[var(--border-color)] rounded-lg text-center mt-2">
                        Nenhum metadado extra configurado.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mt-2">
                        {metadataList.map((meta, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              className="form-input flex-1 !py-2 text-sm"
                              placeholder="Chave (ex: id_curso)"
                              value={meta.key}
                              onChange={(e) => {
                                const newList = [...metadataList];
                                newList[index].key = e.target.value;
                                setMetadataList(newList);
                              }}
                            />
                            <input
                              type="text"
                              className="form-input flex-1 !py-2 text-sm"
                              placeholder="Valor (ex: 12345)"
                              value={meta.value}
                              onChange={(e) => {
                                const newList = [...metadataList];
                                newList[index].value = e.target.value;
                                setMetadataList(newList);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setMetadataList(metadataList.filter((_, i) => i !== index))}
                              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <section className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>
                    <ImageIcon size={20} />
                    Mídia do Produto
                  </h2>

                  <div
                    className={styles.imageUploadArea}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      name="image"
                      type="file"
                      ref={fileInputRef}
                      onChange={onFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {selectedImage ? (
                      <>
                        <img src={selectedImage} alt="Preview" className={styles.imagePreview} />
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={removeImage}
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4 text-secondary p-8 text-center">
                        <div className={`p-5 bg-card-hover rounded-2xl border border-border-color ${styles.uploadIcon}`}>
                          <Upload size={32} className="text-accent" />
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">Upload de Imagem</p>
                          <p className="text-xs mt-1">Arraste ou clique para selecionar</p>
                          <p className="text-[10px] mt-2 opacity-50 uppercase tracking-tighter">PNG, JPG ou WEBP (Max. 5MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>


              </div>
            </div>
          </form>
        )}

        {activeTab === "checkout" && (
          <div key="tab-checkout" className="animate-fadeIn">
            <div className={styles.tabHeader}>
              <div>

              </div>
              {/*
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => { setSelectedCheckout(null); setIsModalOpen(true); }}
              >
                <Plus size={18} />
                <span>Criar checkout</span>
              </button>
              */}
            </div>

            {loadingCheckouts ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-accent" size={32} />
              </div>
            ) : checkouts.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.checkoutTable}>
                  <thead>
                    <tr>
                      <th>NOME</th>
                      <th>LINK</th>
                      <th>OFERTA</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkouts.map((checkout) => (
                      <tr key={checkout.id}>
                        <td>
                          <span className="font-bold">{checkout.title}</span>
                        </td>
                        <td>
                          <div className={styles.linkContainer}>
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/pay/${checkout.hash}`}
                              className={styles.linkInput}
                            />
                            <button
                              type="button"
                              className={styles.linkActionBtn}
                              onClick={() => openCheckoutLink(checkout.hash)}
                              title="Abrir link"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.linkActionBtn}
                              onClick={() => copyToClipboard(checkout.hash, checkout.id)}
                              title="Copiar link"
                            >
                              {copiedId === checkout.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{product.name}</span>
                            <span className="text-xs text-secondary">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: product.currency || "BRL",
                              }).format(product.price)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-tag ${checkout.is_active !== false ? 'status-active' : 'status-inactive'} flex items-center gap-1.5 py-1 px-2.5 w-fit`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {checkout.is_active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end relative">
                            <div className={styles.moreMenuContainer}>
                              <button
                                type="button"
                                className={`${styles.moreButton} ${openMenuId === checkout.id ? styles.moreButtonActive : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === checkout.id ? null : checkout.id);
                                }}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {openMenuId === checkout.id && (
                                <div className={styles.moreMenu} style={{ display: 'block', opacity: 1, visibility: 'visible', pointerEvents: 'all' }}>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleEditCheckout(checkout)}
                                  >
                                    <Edit size={14} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleToggleCheckoutStatus(checkout)}
                                  >
                                    <Zap size={14} className={checkout.is_active !== false ? "text-amber-500" : "text-emerald-500"} />
                                    {checkout.is_active !== false ? 'Desativar' : 'Ativar'}
                                  </button>
                                  {/*
                                  <button
                                    type="button"
                                    className={`${styles.menuItem} ${styles.menuItemDelete}`}
                                    onClick={() => handleDeleteCheckout(checkout)}
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                  */}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyBlock}>
                <p className={styles.emptyText}>Nenhum conteudo para ser exibido</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "ofertas" && (
          <div key="tab-ofertas" className="animate-fadeIn">
            <div className={styles.tabHeader}>
              <div>

              </div>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => { setSelectedOffer(null); setIsOfferModalOpen(true); }}
              >
                <Plus size={18} />
                <span>Criar oferta</span>
              </button>
            </div>

            {loadingOffers ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-accent" size={32} />
              </div>
            ) : offers.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.checkoutTable}>
                  <thead>
                    <tr>
                      <th>NOME</th>
                      <th>VALOR</th>
                      <th>PRODUTO</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          <span className="font-bold">{offer.name}</span>
                        </td>
                        <td>
                          <span className="font-bold text-accent">
                            {new Intl.NumberFormat(offer.currency === "USD" ? "en-US" : (offer.currency === "EUR" ? "de-DE" : "pt-BR"), {
                              style: "currency",
                              currency: offer.currency,
                            }).format(offer.price)}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{product.name}</span>
                            <span className="text-xs text-secondary">{offer.currency}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-tag ${offer.is_active !== false ? 'status-active' : 'status-inactive'} flex items-center gap-1.5 py-1 px-2.5 w-fit`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {offer.is_active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end relative">
                            <div className={styles.moreMenuContainer}>
                              <button
                                type="button"
                                className={`${styles.moreButton} ${openMenuId === offer.id ? styles.moreButtonActive : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === offer.id ? null : offer.id);
                                }}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {openMenuId === offer.id && (
                                <div className={styles.moreMenu} style={{ display: 'block', opacity: 1, visibility: 'visible', pointerEvents: 'all' }}>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleEditOffer(offer)}
                                  >
                                    <Edit size={14} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleToggleOfferStatus(offer)}
                                  >
                                    <Zap size={14} className={offer.is_active !== false ? "text-amber-500" : "text-emerald-500"} />
                                    {offer.is_active !== false ? 'Desativar' : 'Ativar'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.menuItem} ${styles.menuItemDelete}`}
                                    onClick={() => handleDeleteOffer(offer)}
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyBlock}>
                <p className={styles.emptyText}>Nenhum conteudo para ser exibido</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "upsell" && (
          <div key="tab-upsell" className="animate-fadeIn">
            <div className={styles.tabHeader}>
              <div>
                {/* Space for title/description if needed */}
              </div>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setIsUpsellModalOpen(true)}
              >
                <Plus size={18} />
                <span>Criar estratégia</span>
              </button>
            </div>

            {loadingUpsell ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-accent" size={32} />
              </div>
            ) : upsellStrategies.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.checkoutTable}>
                  <thead>
                    <tr>
                      <th>ESTRATÉGIA</th>
                      <th>TIPO</th>
                      <th>PRODUTO/OFERTA ALVO</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upsellStrategies.map((strategy) => (
                      <tr key={strategy.id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-bold">{strategy.name}</span>
                            <span className="text-[10px] text-secondary font-mono">{strategy.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-tag flex items-center gap-1.5 py-1 px-2.5 w-fit ${strategy.type === 'Upsell' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                            {strategy.type}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{strategy.upsell_product?.name}</span>
                            <span className="text-xs text-secondary">{strategy.upsell_offer?.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-tag ${strategy.is_active !== false ? 'status-active' : 'status-inactive'} flex items-center gap-1.5 py-1 px-2.5 w-fit`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {strategy.is_active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end relative">
                            <div className={styles.moreMenuContainer}>
                              <button
                                type="button"
                                className={`${styles.moreButton} ${openMenuId === strategy.id ? styles.moreButtonActive : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === strategy.id ? null : strategy.id);
                                }}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {openMenuId === strategy.id && (
                                <div className={styles.moreMenu} style={{ display: 'block', opacity: 1, visibility: 'visible', pointerEvents: 'all' }}>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleViewUpsellCode(strategy)}
                                  >
                                    <LinkIcon size={14} /> Ver Código
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleEditUpsell(strategy)}
                                  >
                                    <Edit size={14} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleToggleUpsellStatus(strategy)}
                                  >
                                    <Zap size={14} className={strategy.is_active !== false ? "text-amber-500" : "text-emerald-500"} />
                                    {strategy.is_active !== false ? 'Desativar' : 'Ativar'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.menuItem} ${styles.menuItemDelete}`}
                                    onClick={() => handleDeleteUpsell(strategy)}
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyBlock}>
                <p className={styles.emptyText}>Crie sua primeira estratégia de upsell para aumentar seu ticket médio.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "links" && (
          <div key="tab-links" className="animate-fadeIn">


            {(loadingCheckouts || loadingOffers) ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-accent" size={32} />
              </div>
            ) : (checkouts.length > 0 || offers.length > 0) ? (
              <div className={styles.tableWrapper}>
                <table className={styles.checkoutTable}>
                  <thead>
                    <tr>
                      <th>TIPO</th>
                      <th>NOME / REFERÊNCIA</th>
                      <th>VALOR</th>
                      <th>LINK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Checkouts */}
                    {checkouts.map((checkout) => (
                      <tr key={`link-checkout-${checkout.id}`}>
                        <td>
                          <span className="status-tag flex items-center gap-1.5 py-1 px-2.5 w-fit bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Checkout
                          </span>
                        </td>
                        <td>
                          <span className="font-bold">{checkout.title}</span>
                        </td>
                        <td>
                          <span className="text-sm">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: product.currency || "BRL",
                            }).format(product.price)}
                          </span>
                        </td>
                        <td>
                          <div className={styles.linkContainer}>
                            <input
                              type="text"
                              readOnly
                              value={checkout.hash ? `${window.location.origin}/pay/${checkout.hash}` : "Link não disponível"}
                              className={styles.linkInput}
                            />
                            <button
                              type="button"
                              className={styles.linkActionBtn}
                              onClick={() => checkout.hash && openCheckoutLink(checkout.hash)}
                              disabled={!checkout.hash}
                              title="Abrir link"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.linkActionBtn}
                              onClick={() => checkout.hash && copyToClipboard(checkout.hash, checkout.id)}
                              disabled={!checkout.hash}
                              title="Copiar link"
                            >
                              {copiedId === checkout.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Offers */}
                    {offers.map((offer) => (
                      <tr key={`link-offer-${offer.id}`}>
                        <td>
                          <span className="status-tag flex items-center gap-1.5 py-1 px-2.5 w-fit bg-purple-500/10 text-purple-500 border-purple-500/20">
                            Oferta
                          </span>
                        </td>
                        <td>
                          <span className="font-bold">{offer.name}</span>
                        </td>
                        <td>
                          <span className="font-bold text-accent">
                            {new Intl.NumberFormat(offer.currency === "USD" ? "en-US" : (offer.currency === "EUR" ? "de-DE" : "pt-BR"), {
                              style: "currency",
                              currency: offer.currency,
                            }).format(offer.price)}
                          </span>
                        </td>
                        <td>
                          <div className={styles.linkContainer}>
                            <input
                              type="text"
                              readOnly
                              value={offer.hash ? `${window.location.origin}/pay/${offer.hash}` : "Link não disponível"}
                              className={styles.linkInput}
                            />
                            <button
                              type="button"
                              className={styles.linkActionBtn}
                              onClick={() => offer.hash && openCheckoutLink(offer.hash)}
                              disabled={!offer.hash}
                              title="Abrir link"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.linkActionBtn}
                              onClick={() => offer.hash && copyToClipboard(offer.hash, offer.id)}
                              disabled={!offer.hash}
                              title="Copiar link"
                            >
                              {copiedId === offer.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyBlock}>
                <p className={styles.emptyText}>Nenhum conteudo para ser exibido</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "orderbump" && (
          <div key="tab-orderbump" className="animate-fadeIn">
            <div className={styles.tabHeader}>
              <div></div>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => { setIsOrderbumpModalOpen(true); }}
              >
                <Plus size={18} />
                <span>Criar orderbump</span>
              </button>
            </div>

            {orderbumps.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.checkoutTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ORDEM</th>
                      <th>PRODUTO</th>
                      <th>OFERTA</th>
                      <th>CALL TO ACTION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderbumps.map((bump, index) => (
                      <tr
                        key={bump.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        className={draggedIndex === index ? "opacity-50" : ""}
                        style={{ cursor: 'grab' }}
                      >
                        <td>
                          <div className="flex items-center gap-3 text-secondary">
                            <GripVertical size={16} className="cursor-grab active:cursor-grabbing" />
                            <span className="text-xs font-bold tabular-nums opacity-50">{index + 1}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-bold">{bump.bump_product?.name}</span>
                            <span className="text-xs text-secondary">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: bump.bump_product?.currency || "BRL",
                              }).format(bump.bump_product?.price)}
                            </span>
                          </div>
                        </td>
                        <td>
                          {bump.bump_offer ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{bump.bump_offer.name}</span>
                              <span className="text-xs text-accent">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: bump.bump_offer.currency,
                                }).format(bump.bump_offer.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-secondary italic">Preço padrão</span>
                          )}
                        </td>
                        <td>
                          <span className="text-sm">{bump.call_to_action}</span>
                        </td>
                        <td>
                          <span className={`status-tag ${bump.is_active !== false ? 'status-active' : 'status-inactive'} flex items-center gap-1.5 py-1 px-2.5 w-fit`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {bump.is_active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end relative">
                            <div className={styles.moreMenuContainer}>
                              <button
                                type="button"
                                className={`${styles.moreButton} ${openMenuId === bump.id ? styles.moreButtonActive : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === bump.id ? null : bump.id);
                                }}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {openMenuId === bump.id && (
                                <div className={styles.moreMenu} style={{ display: 'block', opacity: 1, visibility: 'visible', pointerEvents: 'all' }}>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleEditOrderbump(bump)}
                                  >
                                    <Edit size={14} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => handleToggleOrderbumpStatus(bump)}
                                  >
                                    <Zap size={14} className={bump.is_active !== false ? "text-amber-500" : "text-emerald-500"} />
                                    {bump.is_active !== false ? 'Desativar' : 'Ativar'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.menuItem} ${styles.menuItemDelete}`}
                                    onClick={() => handleDeleteOrderbump(bump)}
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyBlock}>
                <p className={styles.emptyText}>Nenhum conteudo para ser exibido</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modals */}
      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCheckoutSuccess}
        initialData={selectedCheckout}
        fixedProductId={product.id}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        itemName={selectedCheckout?.title || ""}
        title="Excluir Checkout"
      />

      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSuccess={handleOfferSuccess}
        initialData={selectedOffer}
        productId={product.id}
      />

      <DeleteModal
        isOpen={isOfferDeleteModalOpen}
        onClose={() => setIsOfferDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteOffer}
        loading={deleteLoading}
        itemName={selectedOffer?.name || ""}
        title="Excluir Oferta"
      />

      <OrderbumpModal
        isOpen={isOrderbumpModalOpen}
        onClose={() => {
          setIsOrderbumpModalOpen(false);
          setSelectedOrderbump(null);
        }}
        onSuccess={() => {
          fetchOrderbumps();
        }}
        mainProductId={product.id}
        initialData={selectedOrderbump}
      />

      <DeleteModal
        isOpen={isOrderbumpDeleteModalOpen}
        onClose={() => setIsOrderbumpDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteOrderbump}
        loading={deleteLoading}
        itemName={selectedOrderbump?.title || ""}
        title="Excluir Orderbump"
      />

      <UpsellModal
        isOpen={isUpsellModalOpen}
        onClose={() => {
          setIsUpsellModalOpen(false);
          setSelectedUpsell(null);
          setUpsellInitialStep(1);
        }}
        productId={product.id}
        onSuccess={fetchUpsellStrategies}
        initialData={selectedUpsell}
        initialStep={upsellInitialStep}
      />

      <DeleteModal
        isOpen={isUpsellDeleteModalOpen}
        onClose={() => setIsUpsellDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteUpsell}
        loading={deleteLoading}
        itemName={selectedUpsell?.name || ""}
        title="Excluir Estratégia de Upsell"
      />
      {/* Notification Modal */}
      {notification.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setNotification({ ...notification, isOpen: false })}>
          <div className="modal-container delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`delete-modal-icon ${notification.type === 'error' ? 'bg-red-500/10 text-red-500' :
                notification.type === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                  'bg-accent/10 text-accent'
              }`}>
              {notification.type === 'error' ? <X size={32} /> :
                notification.type === 'warning' ? <AlertTriangle size={32} /> :
                  <Check size={32} />}
            </div>

            <h2 className="delete-modal-title">{notification.title}</h2>
            <p className="delete-modal-text">{notification.message}</p>

            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setNotification({ ...notification, isOpen: false })}
                className="btn-primary w-full justify-center py-3"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
