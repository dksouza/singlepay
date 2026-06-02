"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, Loader2, AlertCircle, QrCode } from "lucide-react";
import { updateSaleStatus, getUpsellStrategy } from "../../actions/paymentActions";
import { Language, translations } from "./translations";

interface CajuPayCheckoutFormProps {
  publicKey: string;
  product: any;
  checkout: any;
  lang: Language;
  orderbumps: any[];
  hash: string;
  detectedCountry?: string;
}

export default function CajuPayCheckoutForm({
  publicKey,
  product,
  checkout,
  lang,
  orderbumps,
  hash,
  detectedCountry
}: CajuPayCheckoutFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [totalPrice, setTotalPrice] = useState<number>(product.price);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  
  const [pixData, setPixData] = useState<any>(null);

  const t = translations[lang];
  const formRef = useRef<HTMLFormElement>(null);
  
  // CajuPay SDK state
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const controllerRef = useRef<any>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const [sdkError, setSdkError] = useState(false);

  // Load CajuPay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.cajupay.com.br/sdk/v1/cajupay-sdk.min.js";
    script.async = true;
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => setSdkError(true);
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Sync total price when bumps change
  useEffect(() => {
    let newTotal = product.price;
    selectedBumps.forEach(bumpId => {
      const bump = orderbumps.find((b: any) => b.id === bumpId);
      if (bump) {
        newTotal += bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
      }
    });
    setTotalPrice(newTotal);
  }, [selectedBumps, product.price, orderbumps]);

  // Poll PIX payment status
  useEffect(() => {
    if (!pixData || !pixData.payment_id) return;
    
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?payment_id=${pixData.payment_id}`);
        const data = await res.json();
        
        if (data.status === 'succeeded' || data.status === 'paid') {
          clearInterval(intervalId);
          handleSuccessRedirect();
        }
      } catch (err) {
        // silently ignore fetch errors during polling
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [pixData]);

  // Auto-initialize SDK when script loads and method is card
  useEffect(() => {
    if (isSdkLoaded && paymentMethod === 'card' && !controllerRef.current && !isProcessing) {
      initCardSession();
    }
  }, [isSdkLoaded, paymentMethod, selectedBumps]);

  const getCustomerData = () => {
    const elements = formRef.current?.elements as any;
    if (!elements) return null;
    return {
      name: elements.customer_name?.value || "",
      email: elements.customer_email?.value || "",
      phone: elements.customer_phone ? `${elements.country_code?.value} ${elements.customer_phone.value}` : "",
      docNumber: elements.customer_doc?.value ? elements.customer_doc.value.replace(/\D/g, "") : "",
    };
  };

  const toggleBump = (bump: any) => {
    const isSelected = selectedBumps.includes(bump.id);
    const newSelected = isSelected
      ? selectedBumps.filter(id => id !== bump.id)
      : [...selectedBumps, bump.id];

    setSelectedBumps(newSelected);
  };

  // Start CajuPay Card Session
  const initCardSession = async () => {
    if (!isSdkLoaded || !(window as any).CajuPaySDK) return;
    
    try {
      const customerData = getCustomerData() || {};
      const urlParams = new URLSearchParams(window.location.search);
      const trackingData = {
        src: urlParams.get("src"),
        sck: urlParams.get("sck"),
        utm_source: urlParams.get("utm_source"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_medium: urlParams.get("utm_medium"),
        utm_content: urlParams.get("utm_content"),
        utm_term: urlParams.get("utm_term"),
        lang,
      };

      const res = await fetch("/api/checkout/cajupay/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash,
          selectedBumpIds: selectedBumps,
          customerData,
          trackingData
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      sessionTokenRef.current = data.token;
      
      const sdk = (window as any).CajuPaySDK.init({ baseUrl: "https://api.cajupay.com.br" });
      
      if (controllerRef.current) {
        controllerRef.current.destroy?.();
        const el = document.getElementById("cajupay-method");
        if (el) el.innerHTML = "";
      }

      controllerRef.current = await sdk.mountCheckout("#cajupay-method", {
        token: data.token,
        embeddedOnly: true,
        defaultMethod: "card",
        preparePaymentUIOnMount: true,
        onStatus: (ev: any) => {
          if (ev.phase === "error") {
            setErrorMessage(ev.error);
            setIsProcessing(false);
          }
        },
      });
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao iniciar sessão de pagamento seguro.");
      setIsProcessing(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    const customerData = getCustomerData();
    if (!customerData?.name || !customerData?.email || !customerData?.docNumber) {
      setErrorMessage("Preencha nome, email e CPF/CNPJ para continuar.");
      setIsProcessing(false);
      return;
    }

    // 1. Initialize session and mount SDK if not done yet
    if (!controllerRef.current) {
      await initCardSession();
    }

    if (!controllerRef.current) {
      setIsProcessing(false);
      return;
    }

    try {
      // 2. Set payer info in SDK
      controllerRef.current.setPayer({
        name: customerData.name,
        email: customerData.email,
        document: customerData.docNumber
      });

      // 3. Confirm payment in SDK
      await controllerRef.current.confirm();
      
      // Success will be captured by webhook in backend, we just redirect
      handleSuccessRedirect();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Pagamento recusado. Verifique os dados do cartão.");
      setIsProcessing(false);
    }
  };

  const handlePixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    const customerData = getCustomerData();
    if (!customerData?.name || !customerData?.email || !customerData?.docNumber) {
      setErrorMessage("Preencha nome, email e CPF/CNPJ para gerar o PIX.");
      setIsProcessing(false);
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trackingData = {
        src: urlParams.get("src"),
        sck: urlParams.get("sck"),
        utm_source: urlParams.get("utm_source"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_medium: urlParams.get("utm_medium"),
        utm_content: urlParams.get("utm_content"),
        utm_term: urlParams.get("utm_term"),
        lang,
      };

      const res = await fetch("/api/checkout/cajupay/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash,
          selectedBumpIds: selectedBumps,
          customerData,
          trackingData,
          docNumber: customerData.docNumber
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPixData(data);
      setIsProcessing(false);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao gerar PIX.");
      setIsProcessing(false);
    }
  };

  const handleSuccessRedirect = async () => {
    const upsell = await getUpsellStrategy(product.id);
    // Since we don't know the exact transaction ID from the SDK directly (webhook handles status),
    // we just redirect to upsell or success page.
    if (upsell && upsell.upsell_page_url) {
      window.location.href = upsell.upsell_page_url;
    } else if (product.delivery_link) {
      window.location.href = product.delivery_link;
    } else {
      window.location.href = `${window.location.origin}/pay/success?checkout=${checkout.id}`;
    }
  };

  const copyPixCode = () => {
    if (pixData?.pix_copy_paste) {
      navigator.clipboard.writeText(pixData.pix_copy_paste);
      alert("Código PIX copiado!");
    }
  };

  if (sdkError) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
        <p className="text-red-600 font-medium">Erro ao carregar sistema de pagamento seguro. Recarregue a página.</p>
      </div>
    );
  }

  return (
    <div>
      {!pixData ? (
        <form ref={formRef} onSubmit={paymentMethod === 'card' ? handleCardSubmit : handlePixSubmit}>
          <div className="form-section">
            <label className="checkout-form-label">{t.fullName}</label>
            <input name="customer_name" autoComplete="name" type="text" className="checkout-input" placeholder={t.fullNamePlaceholder} required />

            <label className="checkout-form-label">{t.email}</label>
            <input name="customer_email" autoComplete="email" type="email" className="checkout-input" placeholder={t.emailPlaceholder} required />

            <label className="checkout-form-label">CPF ou CNPJ</label>
            <input name="customer_doc" autoComplete="off" type="text" className="checkout-input" placeholder="000.000.000-00" required />

            <label className="checkout-form-label">{t.phone}</label>
            <div className="phone-input-group">
              <select name="country_code" className="country-select-real" defaultValue="+55">
                <option value="+55">🇧🇷 +55</option>
                <option value="+1">🇺🇸 +1</option>
              </select>
              <input name="customer_phone" autoComplete="tel" type="tel" className="checkout-input mb-0 flex-1" placeholder={t.phonePlaceholder} required />
            </div>
          </div>

          <div className="payment-custom-ui">
            <div className="payment-method-selector flex gap-4 mt-6 mb-6">
              <div 
                className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-accent bg-accent/5' : 'border-neutral-200 hover:border-accent/30'}`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={20} className={paymentMethod === 'card' ? 'text-accent' : 'text-slate-400'} />
                <span className={`font-semibold ${paymentMethod === 'card' ? 'text-accent' : 'text-slate-600'}`}>Cartão</span>
              </div>
              <div 
                className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 hover:border-emerald-200'}`}
                onClick={() => setPaymentMethod('pix')}
              >
                <QrCode size={20} className={paymentMethod === 'pix' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className={`font-semibold ${paymentMethod === 'pix' ? 'text-emerald-600' : 'text-slate-600'}`}>PIX</span>
              </div>
            </div>

            {paymentMethod === 'card' && (
              <div className="cajupay-panel" style={{ border: '2px solid #f3f4f6', borderRadius: '12px', background: 'rgba(249,250,251,0.5)', padding: '16px', marginBottom: '24px' }}>
                <div className="cajupay-widget-box" style={{ border: '2px solid #f3f4f6', borderRadius: '12px', background: '#fff', padding: '12px 16px' }}>
                  {/* Container for SDK */}
                  <div id="cajupay-method"></div>
                </div>
              </div>
            )}
          </div>

          {orderbumps.length > 0 && (
            <div className="space-y-4 mb-8 mt-8">
              {orderbumps.map((bump) => {
                const isSelected = selectedBumps.includes(bump.id);
                const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;

                return (
                  <div
                    key={bump.id}
                    className={`orderbump-container ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      toggleBump(bump);
                      // Clear SDK session to force regeneration with new amount
                      if (controllerRef.current) {
                        controllerRef.current.destroy?.();
                        controllerRef.current = null;
                      }
                    }}
                  >
                    <div className="orderbump-header">
                      <span className="orderbump-cta">{bump.call_to_action}</span>
                    </div>
                    <div className="orderbump-content">
                      <div className="orderbump-checkbox-wrapper">
                        <input type="checkbox" className="orderbump-checkbox" checked={isSelected} readOnly />
                      </div>
                      {bump.show_image && (
                        <img src={bump.bump_product?.image_url || "/placeholder-product.png"} alt={bump.title} className="orderbump-img" />
                      )}
                      <div className="orderbump-info">
                        <h3 className="orderbump-title"><span>{bump.title}:</span> {bump.description}</h3>
                        <p className="orderbump-price">
                          {new Intl.NumberFormat(lang === 'en' ? "en-US" : "pt-BR", { style: "currency", currency: product.currency || "BRL" }).format(bumpPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {errorMessage && (
            <div className="checkout-alert-error">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <button type="submit" disabled={!isSdkLoaded || isProcessing} className="buy-now-btn">
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                {t.processing}
              </div>
            ) : (
              paymentMethod === 'card' ? t.buyNow : 'Pagar via PIX'
            )}
          </button>
        </form>
      ) : (
        <div className="pix-payment-container text-center py-8">
          <div className="flex justify-center mb-6">
            <QrCode size={48} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Pagamento via PIX gerado!</h2>
          <p className="text-slate-600 mb-8">Copie o código abaixo ou escaneie o QR Code no app do seu banco para finalizar a compra.</p>
          
          {pixData.pix_qr_code && (
            <div className="flex justify-center mb-8">
              <img src={pixData.pix_qr_code} alt="QR Code PIX" className="w-48 h-48 border border-neutral-200 rounded-2xl" />
            </div>
          )}
          
          <div className="mb-8">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">PIX Copia e Cola</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={pixData.pix_copy_paste} className="form-input flex-1 bg-slate-50 font-mono text-sm" />
              <button onClick={copyPixCode} className="btn-primary px-6">Copiar</button>
            </div>
          </div>
          
          <p className="text-sm text-slate-500">Assim que o pagamento for confirmado, você receberá o acesso por e-mail.</p>
        </div>
      )}
    </div>
  );
}
