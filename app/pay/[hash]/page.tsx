import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import CheckoutPageClient from "./CheckoutPageClient";

interface PageProps {
  params: Promise<{ hash: string }>;
}

export default async function PublicCheckoutPage({ params }: PageProps) {
  const { hash } = await params;
  const supabase = await createClient();

  // ── 1. Find checkout or offer by hash ──
  const { data: checkout, error: checkoutError } = await supabase
    .from("checkouts")
    .select("*, products (*)")
    .eq("hash", hash)
    .single();

  let finalProduct = checkout?.products;
  let finalCheckout = checkout;
  let userId = checkout?.user_id;
  let isOffer = false;

  if (checkoutError || !checkout) {
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("*, products (*)")
      .eq("hash", hash)
      .single();

    if (offerError || !offer) {
      notFound();
    }

    if (offer.is_active === false) {
      return renderError("Oferta desativada no momento");
    }

    isOffer = true;
    userId = offer.user_id;
    finalCheckout = {
      ...offer,
      title: offer.name,
      payment_type: "single",
    };
    finalProduct = {
      ...offer.products,
      price: offer.price,
      currency: offer.currency,
    };
  } else {
    if (checkout.is_active === false) {
      return renderError("Checkout desativado no momento");
    }
  }

  // ── 2. Fetch stripe config + orderbumps in PARALLEL ──
  const [stripeConfigResult, orderbumpsResult] = await Promise.all([
    supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("orderbumps")
      .select(`
        *,
        bump_product:products!bump_product_id(*),
        bump_offer:offers!bump_offer_id(*)
      `)
      .eq("product_id", finalProduct.id)
      .neq("is_active", false)
      .order("order_index", { ascending: true }),
  ]);

  const stripeConfig = stripeConfigResult.data;
  const orderbumps = orderbumpsResult.data || [];

  if (!stripeConfig?.secret_key) {
    return renderError("Este vendedor ainda não configurou o gateway de pagamento.");
  }

  // ── 3. Create Stripe PI (or reuse existing) ──
  const stripe = new Stripe(stripeConfig.secret_key.trim(), {
    apiVersion: '2024-06-20',
  });

  const isSubscription = finalCheckout.payment_type === "subscription";
  let clientSecret: string;
  let subscriptionId: string | undefined;

  if (isSubscription) {
    // Subscription flow: create customer + product + price + subscription (sequential Stripe calls)
    const [customer, stripeProduct] = await Promise.all([
      stripe.customers.create({
        metadata: { user_id: userId, external_user_id: userId }
      }),
      stripe.products.create({
        name: finalProduct.name,
        description: finalProduct.description,
        metadata: { product_id: finalProduct.id }
      }),
    ]);

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(finalProduct.price * 100),
      currency: finalProduct.currency.toLowerCase() || "brl",
      recurring: { interval: 'month' },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: stripePrice.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        checkout_id: isOffer ? "" : finalCheckout.id,
        offer_id: isOffer ? finalCheckout.id : "",
        product_id: finalProduct.id,
        user_id: userId
      }
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    clientSecret = paymentIntent.client_secret!;
    subscriptionId = subscription.id;

    // Record pending sale (don't await — fire and forget)
    const saleData: any = {
      user_id: userId,
      product_id: finalProduct.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customer.id,
      amount: finalProduct.price,
      currency: finalProduct.currency,
      status: "pending",
      is_orderbump: false
    };
    if (isOffer) saleData.offer_id = finalCheckout.id;
    else saleData.checkout_id = finalCheckout.id;

    supabase.from("sales").insert(saleData).then(() => {});

  } else {
    // One-time payment flow
    const cookieStore = await cookies();
    const cookieName = `pi_${hash}`;
    const existingPiId = cookieStore.get(cookieName)?.value;

    let piReused = false;

    if (existingPiId) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(existingPiId);
        if (existingPi.status === 'requires_payment_method' || existingPi.status === 'requires_confirmation') {
          clientSecret = existingPi.client_secret!;
          piReused = true;
        }
      } catch (e) {
        // PI expired or not found, create new
      }
    }

    if (!piReused) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalProduct.price * 100),
        currency: finalProduct.currency.toLowerCase() || "brl",
        automatic_payment_methods: { enabled: true },
        metadata: {
          checkout_id: isOffer ? "" : finalCheckout.id,
          offer_id: isOffer ? finalCheckout.id : "",
          product_id: finalProduct.id,
          user_id: userId
        },
      });

      clientSecret = paymentIntent.client_secret!;

      // Record sale + set cookie (fire and forget for sale, await cookie)
      const saleData: any = {
        user_id: userId,
        product_id: finalProduct.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: finalProduct.price,
        currency: finalProduct.currency,
        status: "pending",
        is_orderbump: false
      };
      if (isOffer) saleData.offer_id = finalCheckout.id;
      else saleData.checkout_id = finalCheckout.id;

      supabase.from("sales").insert(saleData).then(() => {});

      cookieStore.set(cookieName, paymentIntent.id, {
        maxAge: 60 * 30,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
  }

  // ── 4. Render checkout — client receives EVERYTHING it needs ──
  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', position: 'relative' }}>
      <CheckoutPageClient
        hash={hash}
        initialProduct={finalProduct}
        initialCheckout={finalCheckout}
        publishableKey={stripeConfig.publishable_key}
        clientSecret={clientSecret!}
        orderbumps={orderbumps}
      />
    </div>
  );
}

function renderError(message: string) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 999999
    }}>
      <div style={{
        padding: '40px', border: '1px solid black',
        borderRadius: '12px', backgroundColor: 'white', textAlign: 'center'
      }}>
        <p style={{ color: 'black', fontSize: '18px', fontWeight: 'normal', margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
