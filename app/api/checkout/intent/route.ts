import { createClient } from "../../../../lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { calculatePlatformFee } from "../../../../lib/billing";

/**
 * STRIPE INTENT API
 * 
 * Optimized for performance: 
 * - Parallelizes Stripe resource creation (Customer, Product).
 * - Reuses existing PaymentIntents via cookies.
 * - Fire-and-forget DB inserts where appropriate.
 */
export async function POST(req: Request) {
  try {
    const { hash } = await req.json();
    const supabase = await createClient();

    // 1. Fetch checkout/offer details
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
        return NextResponse.json({ error: "Checkout não encontrado" }, { status: 404 });
      }

      isOffer = true;
      userId = offer.user_id;
      finalCheckout = { ...offer, title: offer.name, payment_type: "single" };
      finalProduct = { ...offer.products, price: offer.price, currency: offer.currency };
    }

    // 2. Fetch Config & Orderbumps in PARALLEL
    const [stripeConfigResult, orderbumpsResult] = await Promise.all([
      supabase.from("stripe_configs").select("*").eq("user_id", userId).single(),
      supabase.from("orderbumps").select("*, bump_product:products!bump_product_id(*), bump_offer:offers!bump_offer_id(*)").eq("product_id", finalProduct.id).neq("is_active", false).order("order_index", { ascending: true })
    ]);

    const stripeConfig = stripeConfigResult.data;
    const orderbumps = orderbumpsResult.data || [];

    if (!stripeConfig?.secret_key) {
      return NextResponse.json({ error: "Gateway não configurado" }, { status: 400 });
    }

    const stripe = new Stripe(stripeConfig.secret_key.trim(), { apiVersion: '2023-10-16' } as any);
    const isSubscription = finalCheckout.payment_type === "subscription";

    // Client admin para bypass RLS em checkout público
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const extraMetadataObj: Record<string, string> = {};
    if (finalProduct.extra_metadata && Array.isArray(finalProduct.extra_metadata)) {
      finalProduct.extra_metadata.forEach((m: any) => {
        if (m.key && m.value) {
          extraMetadataObj[m.key.substring(0, 40)] = String(m.value).substring(0, 500);
        }
      });
    }

    if (isSubscription) {
      // ── SUBSCRIPTION FLOW (Optimized) ──

      // Step A: Create Customer and Product in PARALLEL
      const [customer, stripeProduct] = await Promise.all([
        stripe.customers.create({ metadata: { user_id: userId, external_user_id: userId } }),
        stripe.products.create({ name: finalProduct.name, description: finalProduct.description, metadata: { product_id: finalProduct.id } })
      ]);

      // Step B: Create Price (needs Product ID)
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(finalProduct.price * 100),
        currency: finalProduct.currency.toLowerCase() || "brl",
        recurring: { interval: 'month' },
      });

      // Step C: Create Subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: stripePrice.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice', 'latest_invoice.payment_intent'],
        metadata: {
          checkout_id: isOffer ? "" : finalCheckout.id,
          offer_id: isOffer ? finalCheckout.id : "",
          product_id: finalProduct.id,
          user_id: userId,
          ...extraMetadataObj
        }
      });

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      if (!paymentIntent) {
        return NextResponse.json({ error: "Erro ao gerar assinatura" }, { status: 500 });
      }

      // Copiar os metadados também para o PaymentIntent da assinatura, pois a Stripe não faz isso por padrão
      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: {
          checkout_id: isOffer ? "" : finalCheckout.id,
          offer_id: isOffer ? finalCheckout.id : "",
          product_id: finalProduct.id,
          user_id: userId,
          ...extraMetadataObj
        }
      });

      // Record pending sale (Using Admin client)
      const platformFee = await calculatePlatformFee(userId, finalProduct.price);
      await supabaseAdmin.from("sales").insert({
        user_id: userId,
        product_id: finalProduct.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customer.id,
        amount: finalProduct.price,
        currency: finalProduct.currency,
        platform_fee: platformFee,
        status: "pending",
        is_orderbump: false,
        checkout_id: isOffer ? null : finalCheckout.id,
        offer_id: isOffer ? finalCheckout.id : null,
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeConfig.publishable_key,
        subscriptionId: subscription.id
      });

    } else {
      // ── ONE-TIME PAYMENT FLOW ──
      const cookieStore = await cookies();
      const cookieName = `pi_${hash}`;

      // Removido o reaproveitamento de PI para garantir que cada tentativa gere um novo registro
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalProduct.price * 100),
        currency: finalProduct.currency.toLowerCase() || "brl",
        automatic_payment_methods: { enabled: true },
        metadata: {
          checkout_id: isOffer ? "" : finalCheckout.id,
          offer_id: isOffer ? finalCheckout.id : "",
          product_id: finalProduct.id,
          user_id: userId,
          ...extraMetadataObj
        },
      });

      const platformFee = await calculatePlatformFee(userId, finalProduct.price);

      // Save sale record (Using Admin client)
      await supabaseAdmin.from("sales").insert({
        user_id: userId,
        product_id: finalProduct.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: finalProduct.price,
        currency: finalProduct.currency,
        platform_fee: platformFee,
        status: "pending",
        is_orderbump: false,
        checkout_id: isOffer ? null : finalCheckout.id,
        offer_id: isOffer ? finalCheckout.id : null,
      });

      cookieStore.set(cookieName, paymentIntent.id, {
        maxAge: 60 * 30, path: '/', httpOnly: true, sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeConfig.publishable_key
      });
    }

  } catch (error: any) {
    console.error("[INTENT-API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
