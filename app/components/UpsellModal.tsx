"use client";

import { useState, useEffect } from "react";
import { X, Check, Copy, Loader2, Info, ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onSuccess: () => void;
  initialData?: any;
  initialStep?: number;
}

export function UpsellModal({ isOpen, onClose, productId, onSuccess, initialData, initialStep = 1 }: UpsellModalProps) {
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "Upsell",
    upsell_page_url: "",
    upsell_product_id: "",
    upsell_offer_id: "",
    accept_url: "",
    decline_url: "",
    accept_text: "Sim, eu quero comprar!",
    accept_bg_color: "#5CCE5E",
    accept_text_color: "#000000",
    decline_text: "Não, eu não quero comprar!",
    decline_bg_color: "#DC2626",
    decline_text_color: "#FFFFFF"
  });

  const [createdStrategy, setCreatedStrategy] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep || 1);
      fetchProducts();
      
      if (initialData) {
        setFormData({
          name: initialData.name || "",
          type: initialData.type || "Upsell",
          upsell_page_url: initialData.upsell_page_url || "",
          upsell_product_id: initialData.upsell_product_id || "",
          upsell_offer_id: initialData.upsell_offer_id || "",
          accept_url: initialData.accept_url || "",
          decline_url: initialData.decline_url || "",
          accept_text: initialData.accept_text || "Sim, eu quero comprar!",
          accept_bg_color: initialData.accept_bg_color || "#5CCE5E",
          accept_text_color: initialData.accept_text_color || "#000000",
          decline_text: initialData.decline_text || "Não, eu não quero comprar!",
          decline_bg_color: initialData.decline_bg_color || "#DC2626",
          decline_text_color: initialData.decline_text_color || "#FFFFFF"
        });
        setCreatedStrategy(initialData);
      } else {
        setFormData({
          name: "",
          type: "Upsell",
          upsell_page_url: "",
          upsell_product_id: "",
          upsell_offer_id: "",
          accept_url: "",
          decline_url: "",
          accept_text: "Sim, eu quero comprar!",
          accept_bg_color: "#5CCE5E",
          accept_text_color: "#000000",
          decline_text: "Não, eu não quero comprar!",
          decline_bg_color: "#DC2626",
          decline_text_color: "#FFFFFF"
        });
        setCreatedStrategy(null);
      }
    }
  }, [isOpen, initialData, initialStep]);

  useEffect(() => {
    if (formData.upsell_product_id) {
      fetchOffers(formData.upsell_product_id);
    }
  }, [formData.upsell_product_id]);

  async function fetchProducts() {
    const supabase = createClient();
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }

  async function fetchOffers(pid: string) {
    const supabase = createClient();
    const { data } = await supabase.from("offers").select("*").eq("product_id", pid).order("price");
    setOffers(data || []);
  }

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Limpa IDs vazios para enviar null em vez de ""
    const payload = {
      ...formData,
      upsell_product_id: formData.upsell_product_id || null,
      upsell_offer_id: formData.upsell_offer_id || null,
    };
    
    if (initialData?.id) {
      // Update existing strategy
      const { data, error } = await supabase
        .from("upsell_strategies")
        .update(payload)
        .eq("id", initialData.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating strategy:", error);
        alert("Erro ao atualizar estratégia: " + error.message);
      } else {
        setCreatedStrategy(data);
        setStep(5);
        onSuccess();
      }
    } else {
      // Create new strategy
      const { data, error } = await supabase
        .from("upsell_strategies")
        .insert({
          product_id: productId,
          user_id: user.id,
          ...payload
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating strategy:", error);
        alert("Erro ao criar estratégia: " + error.message);
      } else {
        setCreatedStrategy(data);
        setStep(5);
        onSuccess();
      }
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-fadeIn">
            <div className="form-group">
              <label className="form-label">Nome para identificação</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Upsell Produto Principal"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Estratégia</label>
              <select 
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="Upsell">Upsell</option>
                <option value="Downsell">Downsell</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">URL da Página de Oferta</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://suapagina.com/upsell"
                value={formData.upsell_page_url}
                onChange={(e) => setFormData({...formData, upsell_page_url: e.target.value})}
              />
            </div>

            <div className="modal-footer !px-0 !pb-0">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleNext}
                disabled={!formData.name || !formData.upsell_page_url}
              >
                Avançar <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="animate-fadeIn">
            <div className="form-group">
              <label className="form-label">Produto que será ofertado</label>
              <select 
                className="form-select"
                value={formData.upsell_product_id}
                onChange={(e) => setFormData({...formData, upsell_product_id: e.target.value, upsell_offer_id: ""})}
              >
                <option value="">Selecione um produto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Oferta específica</label>
              <select 
                className="form-select"
                value={formData.upsell_offer_id}
                onChange={(e) => setFormData({...formData, upsell_offer_id: e.target.value})}
                disabled={!formData.upsell_product_id}
              >
                <option value="">Preço padrão do produto</option>
                {offers.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: o.currency }).format(o.price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer !px-0 !pb-0">
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleNext}
                disabled={!formData.upsell_product_id}
              >
                Avançar <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="animate-fadeIn">
            <div className="form-group">
              <label className="form-label">URL caso o cliente ACEITE</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://..."
                value={formData.accept_url}
                onChange={(e) => setFormData({...formData, accept_url: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL caso o cliente RECUSE</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://..."
                value={formData.decline_url}
                onChange={(e) => setFormData({...formData, decline_url: e.target.value})}
              />
            </div>

            <div className="p-4 bg-accent/5 rounded-xl border border-accent/10 flex gap-3 mb-6">
              <Info size={16} className="text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-secondary leading-relaxed">
                Se deixado em branco, o cliente será levado para a página de obrigado padrão.
              </p>
            </div>

            <div className="modal-footer !px-0 !pb-0">
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <button type="button" className="btn-primary" onClick={handleNext}>
                Avançar <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Controls */}
              <div className="space-y-5">
                <div className="form-group">
                  <label className="form-label">Texto do botão de Aceite</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.accept_text}
                    onChange={(e) => setFormData({...formData, accept_text: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Cor de fundo</label>
                    <div className="flex items-center gap-3 bg-input border border-border-color p-2 rounded-xl">
                      <input 
                        type="color" 
                        className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0" 
                        value={formData.accept_bg_color} 
                        onChange={(e) => setFormData({...formData, accept_bg_color: e.target.value})} 
                      />
                      <span className="text-xs font-mono uppercase text-secondary">{formData.accept_bg_color}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cor do texto</label>
                    <div className="flex items-center gap-3 bg-input border border-border-color p-2 rounded-xl">
                      <input 
                        type="color" 
                        className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0" 
                        value={formData.accept_text_color} 
                        onChange={(e) => setFormData({...formData, accept_text_color: e.target.value})} 
                      />
                      <span className="text-xs font-mono uppercase text-secondary">{formData.accept_text_color}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Texto do link de Recusa</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.decline_text}
                    onChange={(e) => setFormData({...formData, decline_text: e.target.value})}
                  />
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="sticky top-0">
                <label className="form-label mb-3 block text-center">Prévia em tempo real</label>
                <div className="rounded-[24px] flex flex-col items-center justify-center shadow-2xl min-h-[300px]" style={{ backgroundColor: '#ffffff', padding: '48px', gap: '20px', border: '2px solid var(--border-color)' }}>
                  <button 
                    style={{ 
                      backgroundColor: formData.accept_bg_color, 
                      color: formData.accept_text_color,
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '16px',
                      boxShadow: `0 4px 14px ${formData.accept_bg_color}40`
                    }}
                  >
                    {formData.accept_text}
                  </button>
                  
                  <span 
                    style={{ 
                      color: '#1a1a1a', 
                      textDecoration: 'underline', 
                      fontSize: '14px', 
                      cursor: 'pointer', 
                      fontWeight: 500,
                      opacity: 0.8
                    }}
                  >
                    {formData.decline_text}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer !px-0 !pb-0 !mt-8 border-t border-border-color pt-6">
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <button type="button" className="btn-primary" onClick={handleFinish} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Estratégia"}
              </button>
            </div>
          </div>
        );

      case 5:
        const copyToClipboard = (text: string, stepNum: number) => {
          navigator.clipboard.writeText(text);
          setCopiedStep(stepNum);
          setTimeout(() => setCopiedStep(null), 2000);
        };

        const scriptTag = `<script src="http://localhost:3000/upsell.js" defer async></script>`;
        const divTag = `<div data-singlepay-upsell="${createdStrategy?.id}"></div>`;

        return (
          <div className="upsell-success-container animate-fadeIn">
            {/* Success Icon Block */}
            <div className="success-badge-box">
              <div className="success-badge-inner">
                <Check size={20} className="text-white" strokeWidth={3} />
              </div>
            </div>
            
            <h2 className="upsell-success-title">Estratégia criada</h2>
            <p className="upsell-success-subtitle">
              Sua estratégia de upsell/downsell foi criada. Para integrá-la à sua página, siga o passo a passo abaixo:
            </p>

            {/* Timeline */}
            <div className="timeline-wrapper">
              <div className="timeline-dashed-line" />
              
              {/* Step 1 */}
              <div className="timeline-item">
                <div className="timeline-step-circle">1</div>
                <div className="timeline-content">
                  <div className="timeline-header-row">
                    <p className="timeline-step-title">
                      Abra o editor da sua página e cole o código dentro da tag <span>&lt;head&gt;</span>
                    </p>
                    <button 
                      onClick={() => copyToClipboard(scriptTag, 1)}
                      className="btn-copy-code"
                    >
                      {copiedStep === 1 ? <Check size={14} style={{color: '#4ade80'}} /> : <Copy size={14} />}
                      {copiedStep === 1 ? "Copiado" : "Copiar código"}
                    </button>
                  </div>
                  <div className="code-card">
                    {scriptTag}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="timeline-item">
                <div className="timeline-step-circle">2</div>
                <div className="timeline-content">
                  <div className="timeline-header-row">
                    <p className="timeline-step-title">
                      Abra o editor da sua página e cole o código dentro da tag <span>&lt;body&gt;</span>
                    </p>
                    <button 
                      onClick={() => copyToClipboard(divTag, 2)}
                      className="btn-copy-code"
                    >
                      {copiedStep === 2 ? <Check size={14} style={{color: '#4ade80'}} /> : <Copy size={14} />}
                      {copiedStep === 2 ? "Copiado" : "Copiar código"}
                    </button>
                  </div>
                  <div className="code-card">
                    {divTag}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="timeline-item">
                <div className="timeline-step-circle">3</div>
                <div className="timeline-content">
                  <p className="timeline-simple-text">Salve e publique as alterações.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="timeline-item">
                <div className="timeline-step-circle">4</div>
                <div className="timeline-content">
                  <p className="timeline-simple-text">Teste a integração para garantir que está funcionando.</p>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="btn-upsell-footer">
              <button 
                className="btn-upsell-back" 
                onClick={onClose}
              >
                Voltar à página de upsells
              </button>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Nova Estratégia (1/4)";
      case 2: return "Produto e Oferta (2/4)";
      case 3: return "Redirecionamento (3/4)";
      case 4: return "Personalização (4/4)";
      case 5: return "Sucesso!";
      default: return "Estratégia";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: step === 5 ? '600px' : '650px' }}>
        <div className="modal-header">
          {step !== 5 ? (
            <h2 className="modal-title">{getStepTitle()}</h2>
          ) : (
            <div />
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
