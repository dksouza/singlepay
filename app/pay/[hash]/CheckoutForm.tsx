"use client";

import { useState, useEffect, useRef } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { StripePaymentRequestButtonElementOptions, PaymentRequest } from "@stripe/stripe-js";
import { CreditCard, ShieldCheck, Loader2, AlertCircle, Check } from "lucide-react";
import { useLoading } from "../../context/LoadingContext";
import { updateSaleStatus, getUpsellStrategy } from "../../actions/paymentActions";

interface CheckoutFormProps {
  clientSecret: string | null;
  publishableKey: string;
  product: any;
  checkout: any;
  lang: Language;
  orderbumps: any[];
  hash: string;
  detectedCountry?: string;
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
  clientSecret: initialClientSecret,
  lang,
  orderbumps,
  selectedBumps,
  setSelectedBumps,
  totalPrice,
  setTotalPrice,
  hash,
  detectedCountry
}: {
  product: any,
  checkout: any,
  clientSecret: string | null,
  lang: Language,
  orderbumps: any[],
  selectedBumps: string[],
  setSelectedBumps: (ids: string[]) => void,
  totalPrice: number,
  setTotalPrice: (price: number) => void,
  hash: string,
  detectedCountry?: string
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setIsLoading } = useLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const intentPromiseRef = useRef<Promise<string> | null>(null);
  const lastLeadValues = useRef({ name: "", email: "", phone: "" });
  const t = translations[lang];

  const getOrCreateIntent = async (): Promise<string> => {
    if (activeClientSecretRef.current) return activeClientSecretRef.current;
    
    if (!intentPromiseRef.current) {
      intentPromiseRef.current = fetch('/api/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        activeClientSecretRef.current = data.clientSecret;
        return data.clientSecret;
      })
      .catch(err => {
        intentPromiseRef.current = null;
        throw err;
      });
    }
    
    return intentPromiseRef.current;
  };

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % (t as any).loadingPhrases.length);
      }, 3500);
    } else {
      setCurrentPhraseIndex(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing, t]);

  const activeClientSecretRef = useRef(initialClientSecret);
  useEffect(() => {
    activeClientSecretRef.current = initialClientSecret;
  }, [initialClientSecret]);

  // ── Autofill robust watcher (Uncontrolled + Native DOM + Events) ──
  // Chrome's autofill hides data from React and FormData until interaction.
  // We read the raw `.value` from elements directly, and trigger on blur/click/visibility.
  useEffect(() => {
    const captureLeadData = async () => {
      if (!formRef.current) return;
      const elements = formRef.current.elements as any;
      const name = elements.customer_name?.value || "";
      const email = elements.customer_email?.value || "";
      const phone = elements.customer_phone?.value || "";
      const countryCode = elements.country_code?.value || "+55";

      const hasValidEmail = email && email.includes('@') && email.length > 5;
      const hasValidPhone = phone && phone.length > 6;
      if (!hasValidEmail && !hasValidPhone) return;

      if (name === lastLeadValues.current.name &&
          email === lastLeadValues.current.email &&
          phone === lastLeadValues.current.phone) return;

      lastLeadValues.current = { name, email, phone };

      let activeClientSecret;
      try {
        activeClientSecret = await getOrCreateIntent();
      } catch (err) { return; }
      if (!activeClientSecret) return;

      const piId = activeClientSecret.split("_secret_")[0];
      const customerData = {
        name: name || "",
        email: email || "",
        phone: phone ? `${countryCode} ${phone}` : "",
      };

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

      updateSaleStatus(piId, "pending", customerData, trackingData).catch(() => {});
    };

    // 1. Regular check
    const interval = setInterval(captureLeadData, 1500);

    // 2. Catch them when they leave or switch tabs (Chrome usually releases autofill values here)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') captureLeadData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 3. Catch them if they click anywhere (e.g. clicking autofill dropdown)
    const handleClick = () => captureLeadData();
    document.addEventListener("click", handleClick);

    // 4. Catch them on focus out
    const handleFocusOut = () => captureLeadData();
    formRef.current?.addEventListener("focusout", handleFocusOut);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("click", handleClick);
      formRef.current?.removeEventListener("focusout", handleFocusOut);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, lang]);

  // ── Initialize Payment Request (Google Pay / Apple Pay) ──
  // Initialize as soon as Stripe is ready, without waiting for clientSecret.
  useEffect(() => {
    if (!stripe) return;

    const currency = (product.currency || "brl").toLowerCase();
    // country code: derive from currency or fall back to BR
    const countryCode = currency === "usd" ? "US"
      : currency === "eur" ? "DE"
      : currency === "gbp" ? "GB"
      : currency === "brl" ? "BR"
      : "US";

    const pr = stripe.paymentRequest({
      country: countryCode,
      currency,
      total: {
        label: product.name || "Pedido",
        amount: Math.round(totalPrice * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    // ── Handle wallet payment method event ──
    pr.on("paymentmethod", async (ev) => {
      setIsProcessing(true);

      let activeSecret;
      
      // If we still don't have it, fetch it on the fly
      try {
        activeSecret = await getOrCreateIntent();
      } catch (err: any) {
        ev.complete("fail");
        setErrorMessage(err.message || "Erro ao inicializar o pagamento. Tente novamente.");
        setIsProcessing(false);
        return;
      }

      if (!activeSecret) {
         ev.complete("fail");
         setIsProcessing(false);
         return;
      }

      const piId = activeSecret.split("_secret_")[0];

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

      const customerData = {
        name: ev.payerName || "",
        email: ev.payerEmail || "",
        phone: "",
      };

      const hasBumps = selectedBumps.length > 0;

      // Update sale to pending in parallel with any bump sync
      const preTasks: Promise<any>[] = [
        updateSaleStatus(piId, "pending", customerData, trackingData),
      ];
      if (hasBumps) {
        preTasks.push(syncBumps(piId, "pending", customerData));
      }
      await Promise.all(preTasks);

      // Confirm the payment using the payment method from the wallet event
      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
        activeSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (confirmError) {
        ev.complete("fail");
        setErrorMessage(confirmError.message || "Erro ao processar pagamento.");
        await updateSaleStatus(piId, "refused", customerData, trackingData);
        setIsProcessing(false);
        return;
      }

      // Payment confirmed — close the wallet UI
      ev.complete("success");

      // Handle 3DS if required
      if (paymentIntent?.status === "requires_action") {
        const { error: actionError } = await stripe.confirmCardPayment(activeSecret);
        if (actionError) {
          setErrorMessage(actionError.message || "Autenticação adicional falhou.");
          await updateSaleStatus(piId, "refused", customerData, trackingData);
          setIsProcessing(false);
          return;
        }
      }

      const pi = paymentIntent as any;
      const succeededCustomer = {
        ...customerData,
        stripe_customer_id: pi?.customer as string,
        stripe_payment_method_id: pi?.payment_method as string,
      };

      const postTasks: Promise<any>[] = [
        updateSaleStatus(piId, "succeeded", succeededCustomer, trackingData),
        getUpsellStrategy(product.id),
      ];
      if (hasBumps) {
        postTasks.push(syncBumps(piId, "succeeded", succeededCustomer));
      }

      const results = await Promise.all(postTasks);
      const upsell = results[1];

      if (upsell?.upsell_page_url) {
        const upsellUrl = new URL(upsell.upsell_page_url);
        upsellUrl.searchParams.set("pi", piId);
        window.location.href = upsellUrl.toString();
      } else if (product.delivery_link) {
        window.location.href = product.delivery_link;
      } else {
        window.location.href = `${window.location.origin}/pay/success?checkout=${checkout.id}`;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, totalPrice, product.currency, product.name]);

  // ── Update payment request amount when orderbumps change ──
  useEffect(() => {
    if (paymentRequest) {
      paymentRequest.update({
        total: {
          label: product.name || "Pedido",
          amount: Math.round(totalPrice * 100),
        },
      });
    }
  }, [paymentRequest, totalPrice, product.name]);

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

  // handleLeadCapture was replaced by the useEffect watcher

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    let activeClientSecret;

    // ── 0. DEFERRED INTENT: Fetch clientSecret if missing ──
    try {
      activeClientSecret = await getOrCreateIntent();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao inicializar o pagamento. Tente novamente.");
      setIsProcessing(false);
      return;
    }

    if (!activeClientSecret) return;

    const formData = new FormData(form);
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
      lang: lang,
    };

    const piId = activeClientSecret.split("_secret_")[0];
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
    const { error, paymentIntent } = await stripe.confirmCardPayment(activeClientSecret, {
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
      setErrorMessage(error.message || "Erro ao processar o cartão. Tente novamente.");
      setIsProcessing(false);
      // Record the refusal in the database (Await it to ensure it triggers before any redirect/refresh)
      await updateSaleStatus(piId, "refused", customerData, trackingData);
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
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="form-section">
        <label className="checkout-form-label">{t.fullName}</label>
        <input name="customer_name" autoComplete="name" type="text" className="checkout-input" placeholder={t.fullNamePlaceholder} required />

        <label className="checkout-form-label">{t.email}</label>
        <input name="customer_email" autoComplete="email" type="email" className="checkout-input" placeholder={t.emailPlaceholder} required />

        <label className="checkout-form-label">{t.phone}</label>
        <div className="phone-input-group">
          <select
            name="country_code"
            className="country-select-real"
            defaultValue={
              detectedCountry === "BR" ? "+55" :
                detectedCountry === "US" ? "+1" :
                  detectedCountry === "PT" ? "+351" :
                    detectedCountry === "ES" ? "+34" :
                      detectedCountry === "MX" ? "+52" : "+1"
            }
          >
            <option value="+1">🇺🇸 +1</option>
            <option value="+55">🇧🇷 +55</option>
            <option value="+351">🇵🇹 +351</option>
            <option value="+34">🇪🇸 +34</option>
            <option value="+52">🇲🇽 +52</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+49">🇩🇪 +49</option>
            <option value="+33">🇫🇷 +33</option>
            <option value="+39">🇮🇹 +39</option>
            <option value="+1">🇨🇦 +1</option>
            <option value="+61">🇦🇺 +61</option>
            <option value="+81">🇯🇵 +81</option>
            <option value="+86">🇨🇳 +86</option>
            <option value="+7">🇷🇺 +7</option>
            <option value="+91">🇮🇳 +91</option>
            <option value="+54">🇦🇷 +54</option>
            <option value="+56">🇨🇱 +56</option>
            <option value="+57">🇨🇴 +57</option>
            <option value="+51">🇵🇪 +51</option>
            <option value="+58">🇻🇪 +58</option>
            <option value="+598">🇺🇾 +598</option>
            <option value="+595">🇵🇾 +595</option>
            <option value="+591">🇧🇴 +591</option>
            <option value="+593">🇪🇨 +593</option>
            <option value="+506">🇨🇷 +506</option>
            <option value="+507">🇵🇦 +507</option>
            <option value="+502">🇬🇹 +502</option>
            <option value="+503">🇸🇻 +503</option>
            <option value="+504">🇭🇳 +504</option>
            <option value="+505">🇳🇮 +505</option>
            <option value="+53">🇨🇺 +53</option>
            <option value="+1809">🇩🇴 +1</option>
            <option value="+509">🇭🇹 +509</option>
            <option value="+20">🇪🇬 +20</option>
            <option value="+27">🇿🇦 +27</option>
            <option value="+234">🇳🇬 +234</option>
            <option value="+254">🇰🇪 +254</option>
            <option value="+212">🇲🇦 +212</option>
            <option value="+971">🇦🇪 +971</option>
            <option value="+966">🇸🇦 +966</option>
            <option value="+972">🇮🇱 +972</option>
            <option value="+90">🇹🇷 +90</option>
            <option value="+82">🇰🇷 +82</option>
            <option value="+66">🇹🇭 +66</option>
            <option value="+84">🇻🇳 +84</option>
            <option value="+62">🇮🇩 +62</option>
            <option value="+60">🇲🇾 +60</option>
            <option value="+63">🇵🇭 +63</option>
            <option value="+64">🇳🇿 +64</option>
          </select>
          <input name="customer_phone" autoComplete="tel" type="tel" className="checkout-input mb-0 flex-1" placeholder={t.phonePlaceholder} required />
        </div>
      </div>

      {/* WALLET BUTTONS: Google Pay / Apple Pay */}
      {paymentRequest && (
        <div className="payment-wallet-section">
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: "buy",
                  theme: "dark",
                  height: "52px",
                },
              },
            } as StripePaymentRequestButtonElementOptions}
          />
          <div className="payment-divider">
            <span className="payment-divider-line" />
            <span className="payment-divider-text">{lang === 'en' ? 'or pay with card' : lang === 'es' ? 'o paga con tarjeta' : 'ou pague com cartão'}</span>
            <span className="payment-divider-line" />
          </div>
        </div>
      )}

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


      {errorMessage && (
        <div className="checkout-alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
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

      {/* Processando Overlay Imersivo */}
      {isProcessing && (
        <div className="global-loading-overlay flex-col gap-6" style={{ zIndex: 100000 }}>
          <Loader2 className="animate-spin text-blue-500" size={48} strokeWidth={2.5} />
          <p className="text-white font-bold text-xl tracking-tight animate-pulse text-center px-6">
            {(t as any).loadingPhrases[currentPhraseIndex]}
          </p>
        </div>
      )}
    </form>
  );
}

export default function CheckoutForm({ publishableKey, product, checkout, clientSecret, lang, orderbumps, hash, detectedCountry }: CheckoutFormProps) {
  const [stripePromise] = useState(() => loadStripe(publishableKey));
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(product.price);

  const elementsOptions = {
    appearance: { theme: 'none' }
  } as any;

  return (
    <Elements
      stripe={stripePromise}
      options={elementsOptions}
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
        hash={hash}
        detectedCountry={detectedCountry}
      />
    </Elements>
  );
}
