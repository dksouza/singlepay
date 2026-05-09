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

function CheckoutFormContent({ product, checkout, clientSecret, lang, orderbumps }: { product: any, checkout: any, clientSecret: string, lang: Language, orderbumps: any[] }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setIsLoading } = useLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(product.price);
  const t = translations[lang];

  const toggleBump = async (bump: any) => {
    const isSelected = selectedBumps.includes(bump.id);
    const newSelected = isSelected
      ? selectedBumps.filter(id => id !== bump.id)
      : [...selectedBumps, bump.id];

    setSelectedBumps(newSelected);

    // Calculate new total locally for instant feedback
    const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
    const newTotal = isSelected ? totalPrice - bumpPrice : totalPrice + bumpPrice;
    setTotalPrice(newTotal);

    // Update PI on server
    try {
      const piId = clientSecret.split("_secret_")[0];
      await fetch('/api/checkout/update-pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: piId,
          selectedBumpIds: newSelected,
          hash: checkout.hash
        })
      });
    } catch (e) {
      console.error("Failed to update PI amount", e);
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

    // Update sale record with customer info before redirecting to Stripe
    const piId = clientSecret.split("_secret_")[0];
    await updateSaleStatus(piId, "pending", customerData);

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
      // Success! Update DB status to succeeded
      await updateSaleStatus(piId, "succeeded", {
        ...customerData,
        stripe_customer_id: paymentIntent?.customer as string,
        stripe_payment_method_id: paymentIntent?.payment_method as string,
      });

      // Check for Upsell Strategy
      const upsell = await getUpsellStrategy(product.id);

      if (upsell && upsell.upsell_page_url) {
        // Redirect to configured upsell page with PI in query for one-click logic
        const upsellUrl = new URL(upsell.upsell_page_url);
        upsellUrl.searchParams.set('pi', piId);
        window.location.href = upsellUrl.toString();
      } else if (product.delivery_link) {
        // Redirect to delivery link if available and no upsell
        window.location.href = product.delivery_link;
      } else {
        // Default success page
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
          <span className="font-bold text-primary">{t.total || "Total"}</span>
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
  const [currentClientSecret, setCurrentClientSecret] = useState(clientSecret);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(product.price);

  return (
    <Elements
      key={currentClientSecret}
      stripe={stripePromise}
      options={{
        clientSecret: currentClientSecret,
        appearance: {
          theme: 'none', // We are using custom UI
        }
      }}
    >
      <CheckoutFormContent
        product={product}
        checkout={checkout}
        clientSecret={currentClientSecret}
        setClientSecret={setCurrentClientSecret}
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
