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
  clientSecret: string;
  orderbumps: any[];
}

export default function CheckoutPageClient({
  hash,
  initialProduct,
  initialCheckout,
  publishableKey,
  clientSecret,
  orderbumps
}: CheckoutPageClientProps) {
  const [lang, setLang] = useState<Language>(() => getLanguage());

  // Detect language by geolocation in background (non-blocking)
  useEffect(() => {
    const controller = new AbortController();

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(r => r.json())
      .then(geo => {
        if (geo.country_code === 'US' || geo.country_code === 'GB') {
          setLang('en');
        } else if (['ES', 'MX', 'AR', 'CO', 'CL'].includes(geo.country_code)) {
          setLang('es');
        }
      })
      .catch(() => {
        // Geo failed — keep browser-detected language
      });

    return () => controller.abort();
  }, []);

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

        {/* Stripe Checkout Form */}
        <CheckoutForm
          publishableKey={publishableKey}
          product={product}
          checkout={checkout}
          clientSecret={clientSecret}
          lang={lang}
          orderbumps={orderbumps}
        />

        <p className="checkout-footer-text">
          {t.termsText}
        </p>
      </div>
    </div>
  );
}
