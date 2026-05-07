import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useState, useRef, DragEvent } from "react";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: any) => void;
  initialData?: any;
}

import { createProduct, updateProduct } from "../actions/productActions";
import { useEffect } from "react";
import { useLoading } from "../context/LoadingContext";

export function ProductModal({ isOpen, onClose, onSuccess, initialData }: ProductModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIsLoading } = useLoading();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [currency, setCurrency] = useState("BRL");

  useEffect(() => {
    if (initialData) {
      setCurrency(initialData.currency || "BRL");
      const locale = initialData.currency === "USD" ? "en-US" : (initialData.currency === "EUR" ? "de-DE" : "pt-BR");
      setPrice(new Intl.NumberFormat(locale, {
        style: "currency",
        currency: initialData.currency || "BRL",
      }).format(initialData.price));
      setSelectedImage(initialData.image_url);
    } else {
      setPrice("");
      setCurrency("BRL");
      setSelectedImage(null);
      setSelectedFile(null);
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
    // Re-format current price with new currency
    const digits = price.replace(/\D/g, "");
    if (digits) {
      setPrice(formatCurrencyValue(digits, newCurr));
    }
  };

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    if (selectedFile) {
      formData.set("image", selectedFile);
    }

    const result = initialData 
      ? await updateProduct(initialData.id, formData, initialData.image_url)
      : await createProduct(formData);

    // Artificial delay to show the nice spinner
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (result.success) {
      onSuccess(result.data || result.data?.[0]);
      onClose();
    } else {
      alert(result.error || "Erro ao processar produto");
    }
    setLoading(false);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{initialData ? "Editar Produto" : "Criar Novo Produto"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome do produto</label>
            <input 
              name="name"
              type="text" 
              className="form-input" 
              placeholder="Ex: Smart Watch Aurora" 
              defaultValue={initialData?.name || ""}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea 
              name="description"
              className="form-textarea" 
              placeholder="Descreva as principais características..."
              defaultValue={initialData?.description || ""}
            ></textarea>
          </div>

          <div className="flex gap-4">
            <div className="form-group flex-1">
              <label className="form-label">Moeda</label>
              <select name="currency" className="form-select" value={currency} onChange={handleCurrencyChange}>
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Valor</label>
              <input 
                name="price"
                type="text" 
                className="form-input" 
                placeholder={currency === "USD" ? "$0.00" : (currency === "EUR" ? "€ 0,00" : "R$ 0,00")} 
                value={price}
                onChange={handlePriceChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link Entregável</label>
            <input 
              name="delivery_link"
              type="url" 
              className="form-input" 
              placeholder="https://sua-entrega.com/download" 
              defaultValue={initialData?.delivery_link || ""}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Imagem do produto</label>
            <input 
              name="image"
              type="file" 
              ref={fileInputRef} 
              onChange={onFileChange} 
              accept="image/*" 
              className="hidden" 
              id="product-image-upload"
            />
            
            <div 
              className={`image-upload-area ${isDragging ? "dragging" : ""} ${selectedImage ? "has-image" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'relative', overflow: 'hidden', minHeight: '180px' }}
            >
              {selectedImage ? (
                <div className="image-preview-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={selectedImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'contain' }} />
                  <button 
                    type="button" 
                    className="remove-image-btn" 
                    onClick={removeImage}
                    style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="upload-icon">
                    <Upload size={20} />
                  </div>
                  <div className="upload-text">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Clique para selecionar ou arraste</p>
                    <p className="text-xs">PNG, JPG ou WEBP (Max. 5MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (initialData ? "Salvando..." : "Criando...") : (initialData ? "Salvar Alterações" : "Criar Produto")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
