"use client";

import { X, Package, Upload, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef, DragEvent } from "react";
import { getProducts } from "../actions/productActions";
import { createCheckout, updateCheckout } from "../actions/checkoutActions";
import { useLoading } from "../context/LoadingContext";
import { convertToWebP } from "../../lib/image-utils";

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
  const [showBanner, setShowBanner] = useState(false);
  const [enableWallets, setEnableWallets] = useState(true);
  const [enableTimer, setEnableTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerText, setTimerText] = useState("Oferta expira em");
  const [timerBgColor, setTimerBgColor] = useState("#ef4444");
  const [timerTextColor, setTimerTextColor] = useState("#ffffff");
  const [selectedBannerImage, setSelectedBannerImage] = useState<string | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setIsSubscription(initialData.payment_type === "subscription");
      setShowBanner(initialData.show_banner || false);
      setEnableWallets(initialData.enable_wallets !== false); // default true
      setEnableTimer(initialData.enable_timer || false);
      setTimerMinutes(initialData.timer_minutes || 15);
      setTimerText(initialData.timer_text || "Oferta expira em");
      setTimerBgColor(initialData.timer_bg_color || "#ef4444");
      setTimerTextColor(initialData.timer_text_color || "#ffffff");
      setSelectedBannerImage(initialData.banner_url || null);
    } else {
      setIsSubscription(false);
      setShowBanner(false);
      setEnableWallets(true);
      setEnableTimer(false);
      setTimerMinutes(15);
      setTimerText("Oferta expira em");
      setTimerBgColor("#ef4444");
      setTimerTextColor("#ffffff");
      setSelectedBannerImage(null);
      setSelectedBannerFile(null);
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

  const handleFile = async (file: File) => {
    if (file && file.type.startsWith("image/")) {
      try {
        const webpFile = await convertToWebP(file);
        setSelectedBannerFile(webpFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedBannerImage(e.target?.result as string);
        };
        reader.readAsDataURL(webpFile);
      } catch (error) {
        console.error("Error converting banner to WebP:", error);
        setSelectedBannerFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedBannerImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const removeBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBannerImage(null);
    setSelectedBannerFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("payment_type", isSubscription ? "subscription" : "single");
    formData.set("show_banner", showBanner.toString());
    formData.set("enable_wallets", enableWallets.toString());
    formData.set("enable_timer", enableTimer.toString());
    formData.set("timer_minutes", timerMinutes.toString());
    formData.set("timer_text", timerText);
    formData.set("timer_bg_color", timerBgColor);
    formData.set("timer_text_color", timerTextColor);

    if (fixedProductId) {
      formData.set("product_id", fixedProductId);
    }

    if (selectedBannerFile) {
      formData.set("banner", selectedBannerFile);
    }

    if (initialData?.banner_url) {
      formData.set("old_banner_url", initialData.banner_url);
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
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="modal-title m-0">{initialData ? "Editar Checkout" : "Criar Novo Checkout"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="drawer-body custom-scrollbar">
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

          <div className="form-group">
            <label className="form-label">Banner do Topo</label>
            <div className="flex items-center justify-between p-4 bg-input rounded-xl border border-color mb-3">
              <span className="text-sm font-medium">Habilitar Banner</span>
              <label className="switch-container">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={showBanner}
                  onChange={(e) => setShowBanner(e.target.checked)}
                />
                <div className="switch-track">
                  <div className="switch-thumb"></div>
                </div>
              </label>
            </div>

            {showBanner && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div 
                  className={`image-upload-area ${isDragging ? "dragging" : ""} ${selectedBannerImage ? "has-image" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'relative', overflow: 'hidden', minHeight: '120px' }}
                >
                  {selectedBannerImage ? (
                    <div className="image-preview-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={selectedBannerImage} alt="Banner Preview" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', objectFit: 'contain' }} />
                      <button 
                        type="button" 
                        className="remove-image-btn" 
                        onClick={removeBanner}
                        style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="upload-icon">
                        <Upload size={18} />
                      </div>
                      <div className="upload-text text-center">
                        <p className="text-sm font-semibold">Upload do Banner</p>
                        <p className="text-[10px]">Recomendado: 1200x200px</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Carteiras Digitais (Google Pay / Apple Pay)</label>
            <div className="flex items-center justify-between p-4 bg-input rounded-xl border border-color">
              <span className="text-sm font-medium">Habilitar Carteiras</span>
              <label className="switch-container">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={enableWallets}
                  onChange={(e) => setEnableWallets(e.target.checked)}
                />
                <div className="switch-track">
                  <div className="switch-thumb"></div>
                </div>
              </label>
            </div>
            <p className="text-xs text-secondary mt-2">
              Se habilitado, as opções de Google Pay e Apple Pay serão exibidas no checkout quando disponíveis.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Timer de Urgência (Topo do Checkout)</label>
            <div className="flex items-center justify-between p-4 bg-input rounded-xl border border-color">
              <span className="text-sm font-medium">Exibir Cronômetro</span>
              <label className="switch-container">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={enableTimer}
                  onChange={(e) => setEnableTimer(e.target.checked)}
                />
                <div className="switch-track">
                  <div className="switch-thumb"></div>
                </div>
              </label>
            </div>
            {enableTimer && (
              <div className="mt-4 p-4 border border-color rounded-xl flex flex-col gap-4 bg-slate-50">
                <div>
                  <label className="form-label text-xs">Minutos</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input !h-10"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 15)}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Texto do Timer</label>
                  <input
                    type="text"
                    className="form-input !h-10"
                    value={timerText}
                    onChange={(e) => setTimerText(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="form-label text-xs">Cor de Fundo</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        value={timerBgColor}
                        onChange={(e) => setTimerBgColor(e.target.value)}
                      />
                      <span className="text-xs text-secondary uppercase">{timerBgColor}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="form-label text-xs">Cor do Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        value={timerTextColor}
                        onChange={(e) => setTimerTextColor(e.target.value)}
                      />
                      <span className="text-xs text-secondary uppercase">{timerTextColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Link de Redirecionamento (Back-redirect)</label>
            <input
              name="back_redirect"
              type="url"
              className="form-input"
              placeholder="https://seu-link-de-volta.com"
              defaultValue={initialData?.back_redirect || ""}
            />
            <p className="text-xs text-secondary mt-2">
              Se preenchido, o cliente será enviado para este link ao tentar voltar a página no checkout.
            </p>
          </div>
          </div>
          <div className="drawer-footer">
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
