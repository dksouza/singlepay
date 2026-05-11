export const runtime = 'edge';

import { createClient } from "../../../../lib/supabase/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { hash } = await req.json();
    const supabase = await createClient();

    // 1. Get checkout and product details
    const { data: checkout, error: checkoutError } = await supabase
      .from("checkouts")
      .select(`
        *,
        products (*)
      `)
      .eq("hash", hash)
      .single();

    let finalProduct = checkout?.products;
    let finalCheckout = checkout;
    let userId = checkout?.user_id;
    let isOffer = false;

    if (checkoutError || !checkout) {
      // 1.1 Check in offers
      const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select(`
          *,
          products (*)
        `)
        .eq("hash", hash)
        .single();

      if (offerError || !offer) {
        return NextResponse.json({ error: "Checkout não encontrado" }, { status: 404 });
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
    }

    // 1.2 Fetch Orderbumps for this product
    const { data: orderbumps } = await supabase
      .from("orderbumps")
      .select(`
        *,
        bump_product:products!bump_product_id(*),
        bump_offer:offers!bump_offer_id(*)
      `)
      .eq("product_id", finalProduct.id)
      .neq("is_active", false)
      .order("order_index", { ascending: true });

    // 2. Get user's stripe configuration
    const { data: stripeConfig, error: configError } = await supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (configError || !stripeConfig || !stripeConfig.secret_key) {
      return NextResponse.json({ error: "Configuração da Stripe não encontrada" }, { status: 400 });
    }

    const stripe = new Stripe(stripeConfig.secret_key.trim(), {});

    const isSubscription = finalCheckout.payment_type === "subscription";

    if (isSubscription) {
      // 1. Create or Get Customer
      const customer = await stripe.customers.create({
        metadata: {
          user_id: userId,
          external_user_id: userId
        }
      });

      // 2. Create Product and Price on Stripe
      // In a real app, you might want to cache these IDs in your DB
      const stripeProduct = await stripe.products.create({
        name: finalProduct.name,
        description: finalProduct.description,
        metadata: {
          product_id: finalProduct.id
        }
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(finalProduct.price * 100),
        currency: finalProduct.currency.toLowerCase() || "brl",
        recurring: { interval: 'month' }, // Default to monthly for now
      });

      // 3. Create Subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: stripePrice.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice', 'latest_invoice.payment_intent'],
        metadata: {
          checkout_id: isOffer ? "" : finalCheckout.id,
          offer_id: isOffer ? finalCheckout.id : "",
          product_id: finalProduct.id,
          user_id: userId
        }
      });

      let invoice = subscription.latest_invoice as any;
      
      // Fallback: If for some reason latest_invoice is just an ID or payment_intent is missing
      if (typeof invoice === 'string' || !invoice?.payment_intent) {
        const invoiceId = typeof invoice === 'string' ? invoice : invoice?.id;
        if (invoiceId) {
          invoice = await stripe.invoices.retrieve(invoiceId, {
            expand: ['payment_intent'],
          });
        }
      }

      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      if (!paymentIntent) {
        console.error("[INTENT-API] Critical: No Payment Intent found on subscription invoice after fallback.", {
          subscriptionId: subscription.id,
          invoiceId: invoice?.id
        });
        return NextResponse.json({ error: "Erro ao gerar pagamento da assinatura" }, { status: 500 });
      }

      // 4. Record initial pending sale in DB
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

      if (isOffer) {
        saleData.offer_id = finalCheckout.id;
      } else {
        saleData.checkout_id = finalCheckout.id;
      }

      await supabase.from("sales").insert(saleData);

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeConfig.publishable_key,
        product: finalProduct,
        checkout: finalCheckout,
        subscriptionId: subscription.id,
        orderbumps: orderbumps || []
      });

    } else {
      // ONE-TIME PAYMENT LOGIC (Existing)
      const cookieStore = await cookies();
      const cookieName = `pi_${hash}`;
      const existingPiId = cookieStore.get(cookieName)?.value;

      if (existingPiId) {
        try {
          const existingPi = await stripe.paymentIntents.retrieve(existingPiId);
          if (existingPi.status === 'requires_payment_method' || existingPi.status === 'requires_confirmation') {
            return NextResponse.json({
              clientSecret: existingPi.client_secret,
              publishableKey: stripeConfig.publishable_key,
              product: finalProduct,
              checkout: finalCheckout,
              orderbumps: orderbumps || []
            });
          }
        } catch (e) {
          console.log("Existing PI not found or expired");
        }
      }

      // Create PaymentIntent
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

      // Record initial pending sale in DB
      const saleData: any = {
        user_id: userId,
        product_id: finalProduct.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: finalProduct.price,
        currency: finalProduct.currency,
        status: "pending",
        is_orderbump: false
      };

      if (isOffer) {
        saleData.offer_id = finalCheckout.id;
      } else {
        saleData.checkout_id = finalCheckout.id;
      }

      await supabase.from("sales").insert(saleData);

      // Save PI ID in cookie
      cookieStore.set(cookieName, paymentIntent.id, {
        maxAge: 60 * 30,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeConfig.publishable_key,
        product: finalProduct,
        checkout: finalCheckout,
        orderbumps: orderbumps || []
      });
    }

  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
