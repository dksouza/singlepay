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
import { CreditCard, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { useLoading } from "../../context/LoadingContext";
import { updateSaleStatus } from "../../actions/paymentActions";

interface CheckoutFormProps {
  clientSecret: string;
  publishableKey: string;
  product: any;
  checkout: any;
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

function CheckoutFormContent({ product, checkout, clientSecret, lang }: { product: any, checkout: any, clientSecret: string, lang: Language }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setIsLoading } = useLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const t = translations[lang];

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

    const { error } = await stripe.confirmCardPayment(clientSecret, {
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
      await updateSaleStatus(piId, "succeeded", customerData);
      
      // Redirect to delivery link if available, otherwise to success page
      if (product.delivery_link) {
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

export default function CheckoutForm({ publishableKey, product, checkout, clientSecret, lang }: { publishableKey: string, product: any, checkout: any, clientSecret: string, lang: Language }) {
  const [stripePromise] = useState(() => loadStripe(publishableKey));

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret,
        appearance: {
          theme: 'none', // We are using custom UI
        }
      }}
    >
      <CheckoutFormContent
        product={product}
        checkout={checkout}
        clientSecret={clientSecret}
        lang={lang}
      />
    </Elements>
  );
}
