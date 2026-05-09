"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertCircle } from "lucide-react";
import CheckoutForm from "./CheckoutForm";
import { translations, getLanguage, Language } from "./translations";

interface CheckoutPageClientProps {
  hash: string;
  initialProduct: any;
  initialCheckout: any;
  publishableKey: string;
}

export default function CheckoutPageClient({ hash, initialProduct, initialCheckout, publishableKey }: CheckoutPageClientProps) {
  const [isReady, setIsReady] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('pt');

  useEffect(() => {
    // 1. Detect by Browser
    let detectedLang = getLanguage();
    
    const detectLocation = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        
        if (geoData.country_code === 'US' || geoData.country_code === 'GB') {
          detectedLang = 'en';
        } else if (['ES', 'MX', 'AR', 'CO', 'CL'].includes(geoData.country_code)) {
          detectedLang = 'es';
        }
        setLang(detectedLang);
      } catch (e) {
        console.warn("Geo-location failed, falling back to browser language");
        setLang(detectedLang);
      }
    };

    detectLocation();

    const fetchIntent = async () => {
      try {
        const res = await fetch('/api/checkout/intent', {
          method: 'POST',
          body: JSON.stringify({ hash }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setPaymentData(data);
          setIsReady(true);
        }
      } catch (e) {
        setError(translations[lang].errorLoading);
      }
    };
    fetchIntent();
  }, [hash, lang]);

  const t = translations[lang];

  useEffect(() => {
    if (isReady) {
      const serverLoading = document.getElementById('server-loading');
      if (serverLoading) {
        serverLoading.style.display = 'none';
      }
    }
  }, [isReady]);

  if (!isReady && !error) {
    return null; // The server-side HTML is already showing the loading
  }

  if (error || !paymentData) {
    return (
      <div className="public-checkout-bg">
        <div className="checkout-page-container text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold mb-4">{t.checkoutUnavailable}</h1>
          <p className="text-secondary mb-4">
            {error || t.checkoutUnavailableDesc}
          </p>
        </div>
      </div>
    );
  }

  const { product, checkout, clientSecret } = paymentData;

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

        {/* Stripe Checkout Form */}
        <CheckoutForm
          publishableKey={publishableKey}
          product={product}
          checkout={checkout}
          clientSecret={clientSecret}
          lang={lang}
          orderbumps={paymentData.orderbumps || []}
        />

        <p className="checkout-footer-text">
          {t.termsText}
        </p>
      </div>
    </div>
  );
}
