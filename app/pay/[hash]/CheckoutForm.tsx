"use client";

import { useState, useEffect } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CreditCard, ShieldCheck, Loader2, AlertCircle, Check } from "lucide-react";
import { useLoading } from "../../context/LoadingContext";
import { updateSaleStatus, getUpsellStrategy } from "../../actions/paymentActions";

interface CheckoutFormProps {
  clientSecret: string;
  publishableKey: string;
  product: any;
  checkout: any;
  lang: Language;
  orderbumps: any[];
}

const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#0f172a",
      letterSpacing: "0.025em",
      "::placeholder": {
        color: "#94a3b8",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  },
};

import { translations, Language } from "./translations";

function CheckoutFormContent({
  product,
  checkout,
  clientSecret,
  lang,
  orderbumps,
  selectedBumps,
  setSelectedBumps,
  totalPrice,
  setTotalPrice
}: {
  product: any,
  checkout: any,
  clientSecret: string,
  lang: Language,
  orderbumps: any[],
  selectedBumps: string[],
  setSelectedBumps: (ids: string[]) => void,
  totalPrice: number,
  setTotalPrice: (price: number) => void
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setIsLoading } = useLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const t = translations[lang];

  const toggleBump = (bump: any) => {
    const isSelected = selectedBumps.includes(bump.id);
    const newSelected = isSelected
      ? selectedBumps.filter(id => id !== bump.id)
      : [...selectedBumps, bump.id];

    setSelectedBumps(newSelected);

    // Calculate new total locally for instant UI feedback — no API call
    const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
    const newTotal = isSelected ? totalPrice - bumpPrice : totalPrice + bumpPrice;
    setTotalPrice(newTotal);
  };

  // Build bump data from selected IDs (reused by syncBumps and charge-bumps)
  const buildBumpsData = () => {
    return selectedBumps.map(bumpId => {
      const bump = orderbumps.find((b: any) => b.id === bumpId);
      if (!bump) return null;
      const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
      const bumpCurrency = (bump.bump_offer ? bump.bump_offer.currency : bump.bump_product.currency) || product.currency;
      return {
        orderbump_id: bump.id,
        product_id: bump.bump_product_id,
        offer_id: bump.bump_offer_id || null,
        amount: bumpPrice,
        currency: bumpCurrency,
      };
    }).filter(Boolean);
  };

  const syncBumps = async (piId: string, currentStatus: string, customer?: any) => {
    try {
      const response = await fetch('/api/checkout/sync-bumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: piId,
          status: currentStatus,
          bumpsData: buildBumpsData(),
          customerData: customer,
        })
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("[BUMP-SYNC] API error:", result);
      } else {
        console.log("[BUMP-SYNC] Success:", result);
      }
    } catch (e) {
      console.error("[BUMP-SYNC] Network error:", e);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);
    setIsProcessing(true);

    const formData = new FormData(event.currentTarget);
    const customerData = {
      name: formData.get("customer_name") as string,
      email: formData.get("customer_email") as string,
      phone: `${formData.get("country_code")} ${formData.get("customer_phone")}`,
    };

    // Capture tracking parameters and IP
    const urlParams = new URLSearchParams(window.location.search);
    const trackingData = {
      src: urlParams.get("src"),
      sck: urlParams.get("sck"),
      utm_source: urlParams.get("utm_source"),
      utm_campaign: urlParams.get("utm_campaign"),
      utm_medium: urlParams.get("utm_medium"),
      utm_content: urlParams.get("utm_content"),
      utm_term: urlParams.get("utm_term"),
    };

    const piId = clientSecret.split("_secret_")[0];
    const isSubscription = checkout.payment_type === "subscription";
    const hasBumps = selectedBumps.length > 0;

    // ── PRE-PAYMENT: run all preparatory calls in PARALLEL ──
    const prePaymentTasks: Promise<any>[] = [
      // 1. Update main sale with customer info
      updateSaleStatus(piId, "pending", customerData, trackingData),
    ];

    // 2. For single payments with bumps: update PI amount
    if (hasBumps && !isSubscription) {
      prePaymentTasks.push(
        fetch('/api/checkout/update-pi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: piId,
            selectedBumpIds: selectedBumps,
            hash: checkout.hash
          })
        }).catch(e => console.error("Failed to update PI:", e))
      );
    }

    // 3. Sync orderbump sales in DB (pending)
    if (hasBumps) {
      prePaymentTasks.push(
        syncBumps(piId, "pending", customerData)
      );
    }

    // Wait for all pre-payment tasks to complete (runs in parallel)
    await Promise.all(prePaymentTasks);

    // ── PAYMENT: confirm with Stripe (this is the only truly sequential step) ──
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardNumberElement)!,
        billing_details: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
        }
      },
    });

    if (error) {
      setErrorMessage(error.message || "Ocorreu um erro inesperado.");
      setIsLoading(false);
      setIsProcessing(false);
    } else {
      const pi = paymentIntent as any;
      const succeededCustomer = {
        ...customerData,
        stripe_customer_id: pi?.customer as string,
        stripe_payment_method_id: pi?.payment_method as string,
      };

      // ── POST-PAYMENT: run all bookkeeping + redirect lookup in PARALLEL ──
      const postPaymentTasks: Promise<any>[] = [
        // 1. Update main sale to succeeded
        updateSaleStatus(piId, "succeeded", succeededCustomer, trackingData),
        // 2. Get upsell strategy (needed for redirect decision)
        getUpsellStrategy(product.id),
      ];

      // 3. Sync orderbump sales (succeeded)
      if (hasBumps) {
        postPaymentTasks.push(syncBumps(piId, "succeeded", succeededCustomer));
      }

      // 4. For subscriptions with bumps: charge orderbumps separately
      if (hasBumps && isSubscription) {
        postPaymentTasks.push(
          fetch('/api/checkout/charge-bumps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: piId,
              bumpsData: buildBumpsData(),
              customerData: succeededCustomer,
            })
          }).then(r => r.json()).then(result => {
            if (result.error) console.error("[CHARGE-BUMPS] Error:", result);
            else console.log("[CHARGE-BUMPS] Success:", result);
          }).catch(e => console.error("[CHARGE-BUMPS] Network error:", e))
        );
      }

      // Wait for all post-payment tasks (parallel) — upsell result is at index 1
      const results = await Promise.all(postPaymentTasks);
      const upsell = results[1]; // getUpsellStrategy is the second task

      // ── REDIRECT ──
      if (upsell && upsell.upsell_page_url) {
        const upsellUrl = new URL(upsell.upsell_page_url);
        upsellUrl.searchParams.set('pi', piId);
        window.location.href = upsellUrl.toString();
      } else if (product.delivery_link) {
        window.location.href = product.delivery_link;
      } else {
        window.location.href = `${window.location.origin}/pay/success?checkout=${checkout.id}`;
      }
    }
  };

  const [isStripeLoaded, setIsStripeLoaded] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-section">
        <label className="checkout-form-label">{t.fullName}</label>
        <input name="customer_name" type="text" className="checkout-input" placeholder={t.fullNamePlaceholder} required />

        <label className="checkout-form-label">{t.email}</label>
        <input name="customer_email" type="email" className="checkout-input" placeholder={t.emailPlaceholder} required />

        <label className="checkout-form-label">{t.phone}</label>
        <div className="phone-input-group">
          <select name="country_code" className="country-select-real">
            <option value="+55">🇧🇷 +55</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+351">🇵🇹 +351</option>
            <option value="+34">🇪🇸 +34</option>
            <option value="+52">🇲🇽 +52</option>
          </select>
          <input name="customer_phone" type="tel" className="checkout-input mb-0 flex-1" placeholder={t.phonePlaceholder} required />
        </div>
      </div>

      {/* CUSTOM STRIPE UI */}
      <div className="payment-custom-ui">
        <div className="payment-method-selector">
          <div className="method-radio-group">
            <div className="radio-circle active">
              <div className="radio-inner"></div>
            </div>
            <CreditCard size={18} className="method-icon" />
            <span className="method-label">{t.creditCard}</span>
          </div>
        </div>

        <div className="custom-card-form">
          <div className="card-input-group">
            <label className="custom-input-label">{t.cardNumber}</label>
            <div className="stripe-element-container">
              <CardNumberElement options={ELEMENT_OPTIONS} onReady={() => setIsStripeLoaded(true)} />
            </div>
          </div>

          <div className="card-row">
            <div className="card-input-group flex-1">
              <label className="custom-input-label">{t.expiryDate}</label>
              <div className="stripe-element-container">
                <CardExpiryElement options={ELEMENT_OPTIONS} />
              </div>
            </div>
            <div className="card-input-group flex-1">
              <label className="custom-input-label">{t.cvc}</label>
              <div className="stripe-element-container">
                <CardCvcElement options={ELEMENT_OPTIONS} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ORDERBUMPS */}
      {orderbumps.length > 0 && (
        <div className="space-y-4 mb-8 mt-8">
          {orderbumps.map((bump) => {
            const isSelected = selectedBumps.includes(bump.id);
            const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;

            return (
              <div
                key={bump.id}
                className={`orderbump-container ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleBump(bump)}
              >
                <div className="orderbump-header">
                  <span className="orderbump-cta">{bump.call_to_action}</span>
                </div>
                <div className="orderbump-content">
                  <div className="orderbump-checkbox-wrapper">
                    <input
                      type="checkbox"
                      className="orderbump-checkbox"
                      checked={isSelected}
                      onChange={() => { }} // Handled by container onClick
                    />
                  </div>
                  {bump.show_image && (
                    <img
                      src={bump.bump_product?.image_url || "/placeholder-product.png"}
                      alt={bump.title}
                      className="orderbump-img"
                    />
                  )}
                  <div className="orderbump-info">
                    <h3 className="orderbump-title">
                      <span>{bump.title}:</span> {bump.description}
                    </h3>
                    <p className="orderbump-price">
                      {new Intl.NumberFormat(lang === 'en' ? "en-US" : "pt-BR", {
                        style: "currency",
                        currency: product.currency || "BRL",
                      }).format(bumpPrice)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUMMARY */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-secondary text-sm">{product.name}</span>
          <span className="font-medium text-sm">
            {new Intl.NumberFormat(lang === 'en' ? "en-US" : "pt-BR", {
              style: "currency",
              currency: product.currency || "BRL",
            }).format(product.price)}
          </span>
        </div>

        {selectedBumps.map(id => {
          const bump = orderbumps.find(b => b.id === id);
          if (!bump) return null;
          const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
          return (
            <div key={id} className="checkout-summary-bump">
              <div className="bump-name">
                <Check size={14} className="text-green-500" />
                {bump.title}
              </div>
              <div className="bump-price">
                {new Intl.NumberFormat(lang === 'en' ? "en-US" : "pt-BR", {
                  style: "currency",
                  currency: product.currency || "BRL",
                }).format(bumpPrice)}
              </div>
            </div>
          );
        })}

        <div className="nav-divider" style={{ margin: '12px 0', opacity: 0.1 }}></div>

        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-primary">{(t as any).total || "Total"}</span>
          <span className="text-xl font-extrabold text-accent">
            {new Intl.NumberFormat(lang === 'en' ? "en-US" : "pt-BR", {
              style: "currency",
              currency: product.currency || "BRL",
            }).format(totalPrice)}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border border-red-100">
          {errorMessage}
        </div>
      )}

      <button type="submit" disabled={!stripe || isProcessing} className="buy-now-btn">
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            {t.processing}
          </div>
        ) : (
          t.buyNow
        )}
      </button>
    </form>
  );
}

export default function CheckoutForm({ publishableKey, product, checkout, clientSecret, lang, orderbumps }: CheckoutFormProps) {
  const [stripePromise] = useState(() => loadStripe(publishableKey));
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(product.price);

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret,
        appearance: {
          theme: 'none', // We are using custom UI
        }
      } as any}
    >
      <CheckoutFormContent
        product={product}
        checkout={checkout}
        clientSecret={clientSecret}
        lang={lang}
        orderbumps={orderbumps}
        selectedBumps={selectedBumps}
        setSelectedBumps={setSelectedBumps}
        totalPrice={totalPrice}
        setTotalPrice={setTotalPrice}
      />
    </Elements>
  );
}
