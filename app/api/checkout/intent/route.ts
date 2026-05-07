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

    if (checkoutError || !checkout) {
      return NextResponse.json({ error: "Checkout não encontrado" }, { status: 404 });
    }

    // 2. Get user's stripe configuration
    const { data: stripeConfig, error: configError } = await supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", checkout.user_id)
      .single();

    if (configError || !stripeConfig || !stripeConfig.secret_key) {
      return NextResponse.json({ error: "Configuração da Stripe não encontrada" }, { status: 400 });
    }

    const stripe = new Stripe(stripeConfig.secret_key.trim(), {
      apiVersion: '2024-06-20',
    });

    const isSubscription = checkout.payment_type === "subscription";

    if (isSubscription) {
      // 1. Create or Get Customer
      const customer = await stripe.customers.create({
        metadata: {
          user_id: checkout.user_id,
          external_user_id: checkout.user_id
        }
      });

      // 2. Create Product and Price on Stripe
      // In a real app, you might want to cache these IDs in your DB
      const stripeProduct = await stripe.products.create({
        name: checkout.products.name,
        description: checkout.products.description,
        metadata: {
          product_id: checkout.products.id
        }
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(checkout.products.price * 100),
        currency: checkout.products.currency.toLowerCase() || "brl",
        recurring: { interval: 'month' }, // Default to monthly for now
      });

      // 3. Create Subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: stripePrice.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          checkout_id: checkout.id,
          product_id: checkout.products.id,
          user_id: checkout.user_id
        }
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      // 4. Record initial pending sale in DB
      await supabase.from("sales").insert({
        user_id: checkout.user_id,
        checkout_id: checkout.id,
        product_id: checkout.products.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_subscription_id: subscription.id,
        amount: checkout.products.price,
        currency: checkout.products.currency,
        status: "pending"
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeConfig.publishable_key,
        product: checkout.products,
        checkout: checkout,
        subscriptionId: subscription.id
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
              product: checkout.products,
              checkout: checkout
            });
          }
        } catch (e) {
          console.log("Existing PI not found or expired");
        }
      }

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(checkout.products.price * 100),
        currency: checkout.products.currency.toLowerCase() || "brl",
        automatic_payment_methods: { enabled: true },
        metadata: {
          checkout_id: checkout.id,
          product_id: checkout.products.id,
          user_id: checkout.user_id
        },
      });

      // Record initial pending sale in DB
      await supabase.from("sales").insert({
        user_id: checkout.user_id,
        checkout_id: checkout.id,
        product_id: checkout.products.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: checkout.products.price,
        currency: checkout.products.currency,
        status: "pending"
      });

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
        product: checkout.products,
        checkout: checkout
      });
    }

  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
