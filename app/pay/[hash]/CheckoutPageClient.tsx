"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import CheckoutForm from "./CheckoutForm";
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Detect language (Non-blocking)
  useEffect(() => {
    const controller = new AbortController();
    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(r => r.json())
      .then(geo => {
        if (geo.country_code === 'US' || geo.country_code === 'GB') setLang('en');
        else if (['ES', 'MX', 'AR', 'CO', 'CL'].includes(geo.country_code)) setLang('es');
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // 2. Fetch Stripe Client Secret (The heavy lifting moved from Server to Client)
  useEffect(() => {
    async function initCheckout() {
      try {
        const response = await fetch('/api/checkout/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error("[CHECKOUT-INIT] Error:", err);
        setError(err.message || "Erro ao inicializar o checkout. Por favor, recarregue a página.");
      } finally {
        setIsInitializing(false);
      }
    }

    initCheckout();
  }, [hash]);

  const t = translations[lang];
  const product = initialProduct;
  const checkout = initialCheckout;

  return (
    <div className="public-checkout-bg">
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
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-accent" size={40} />
            <p className="text-sm font-medium text-secondary">
              Iniciando pagamento seguro...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : (
          <CheckoutForm
            publishableKey={publishableKey}
            product={product}
            checkout={checkout}
            clientSecret={clientSecret!}
            lang={lang}
            orderbumps={orderbumps}
          />
        )}

        <p className="checkout-footer-text">
          {t.termsText}
        </p>
      </div>
    </div>
  );
}
