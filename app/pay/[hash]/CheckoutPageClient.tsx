"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2, ShieldCheck, Zap } from "lucide-react";
import dynamic from "next/dynamic";
const CheckoutForm = dynamic(() => import("./CheckoutForm"), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-12 gap-4">
      <Loader2 className="animate-spin text-accent" size={32} />
      <p className="text-slate-400 text-sm font-medium">Carregando checkout seguro...</p>
    </div>
  )
});
import { translations, getLanguage, Language } from "./translations";

interface CheckoutPageClientProps {
  hash: string;
  initialProduct: any;
  initialCheckout: any;
  publishableKey: string;
  orderbumps: any[];
}

export default function CheckoutPageClient({
  hash,
  initialProduct,
  initialCheckout,
  publishableKey,
  orderbumps
}: CheckoutPageClientProps) {
  const [lang, setLang] = useState<Language>(() => getLanguage());
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];
  const product = initialProduct;
  const checkout = initialCheckout;

  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    const backUrl = checkout?.back_redirect;
    if (!backUrl) return;

    const targetUrl = backUrl.startsWith('http') ? backUrl : `https://${backUrl}`;

    // ── ESTRATÉGIA DE VOLTAR (BACK-REDIRECT) ──
    const pushState = () => {
      window.history.pushState({ trapped: true }, "", window.location.href);
    };

    const onPopState = (e: PopStateEvent) => {
      // Sempre redireciona ao detectar popstate se houver o link
      window.location.href = targetUrl;
    };

    // Injeta a trava inicial
    pushState();

    window.addEventListener("popstate", onPopState);
    
    // Garante que o usuário sempre tenha uma "parede" atrás dele no histórico
    window.addEventListener("click", pushState, { once: false });

    // ── ESTRATÉGIA DE SAÍDA (EXIT-INTENT) ──
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) { // Sensibilidade aumentada para 5px do topo
        setShowExitModal(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("click", pushState);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [checkout?.id, checkout?.back_redirect]);

  const handleExitDiscount = () => {
    const backUrl = checkout?.back_redirect;
    if (backUrl) {
      const targetUrl = backUrl.startsWith('http') ? backUrl : `https://${backUrl}`;
      window.location.href = targetUrl;
    } else {
      setShowExitModal(false);
    }
  };

  return (
    <div className="public-checkout-bg">
      {/* Exit Intent Modal - Simplified Premium Light Mode */}
      {showExitModal && (
        <div className="modal-overlay" style={{ zIndex: 9999999, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-container max-w-lg text-center p-0 border-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] animate-in zoom-in duration-300 bg-white relative overflow-hidden rounded-[32px]">
            
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
              {/* Clean Icon - Forced Center */}
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                 <Zap className="text-accent fill-accent" size={64} />
              </div>
              
              <h2 style={{ fontSize: '30px', fontWeight: '900', marginBottom: '16px', letterSpacing: '-0.025em', lineHeight: '1.2', color: '#0f172a', width: '100%', textAlign: 'center' }}>
                {(t as any).exitModalTitle}
              </h2>
              
              <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '40px', lineHeight: '1.6', maxWidth: '340px', width: '100%', textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                {(t as any).exitModalTextPre}<span style={{ color: '#0f172a', fontWeight: 'bold' }}>{(t as any).exitModalTextBold}</span>{(t as any).exitModalTextPost}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%' }}>
                <button 
                  onClick={handleExitDiscount}
                  className="btn-primary"
                  style={{ width: '100%', padding: '20px', borderRadius: '16px', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff' }}
                >
                  {(t as any).exitModalButton}
                </button>
                
                <button 
                  onClick={() => setShowExitModal(false)}
                  style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none', cursor: 'pointer', color: '#000', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%', textAlign: 'center' }}
                >
                  {(t as any).exitModalNo}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #f1f5f9',
        padding: '16px 0',
        marginBottom: '32px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck style={{ color: '#10b981' }} size={20} />
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#0f172a',
            letterSpacing: '-0.01em'
          }}>
            {t.securePayment}
          </span>
        </div>
      </div>

      <div className="checkout-page-container">
        {/* Product Header */}
        <div className="checkout-header-info">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="checkout-product-img" />
          ) : (
            <div className="checkout-product-img flex items-center justify-center bg-gray-100">
              <CreditCard className="text-gray-400" />
            </div>
          )}
          <div className="checkout-product-details">
            <h1>{product.name}</h1>
            <p className="checkout-product-price">
              {new Intl.NumberFormat(lang === 'en' ? "en-US" : (lang === 'es' ? "es-ES" : "pt-BR"), {
                style: "currency",
                currency: product.currency || "BRL",
              }).format(product.price)}
            </p>
          </div>
        </div>

        <div className="nav-divider" style={{ margin: '24px 0', opacity: 0.5 }}></div>

        {/* Loading State / Form */}
        {error ? (
          <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : (
          <CheckoutForm
            publishableKey={publishableKey}
            product={product}
            checkout={checkout}
            clientSecret={clientSecret}
            lang={lang}
            orderbumps={orderbumps}
            hash={hash}
          />
        )}

        <p className="checkout-footer-text">
          {t.termsText}
        </p>
      </div>
    </div>
  );
}
