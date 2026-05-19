"use server";

import { createClient } from "../../lib/supabase/server";
import Stripe from "stripe";
import { BILLING_PLANS } from "../../lib/billing";
import { revalidatePath } from "next/cache";

/**
 * Creates a Stripe Setup Intent for capturing a payment method
 */
export async function createSetupIntent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  } as any);

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id }
    });
    customerId = customer.id;
    
    // Use service role to update profile
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin.from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (updateError) throw new Error("Erro ao salvar informações de faturamento.");
    revalidatePath("/cobrancas");
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });

  return {
    clientSecret: setupIntent.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  };
}

/**
 * Updates the user's plan and charges the monthly fee immediately
 */
export async function updatePlan(planId: keyof typeof BILLING_PLANS) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const plan = BILLING_PLANS[planId];
  if (!plan) throw new Error("Plano inválido");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error("Você precisa vincular um cartão antes de ativar um plano pago.");
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  } as any);

  // 1. Manage Stripe Subscription if it's a paid plan
  if (plan.price > 0) {
    try {
      // Find the customer's payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        throw new Error("Nenhum cartão encontrado. Por favor, vincule seu cartão novamente.");
      }

      // Find or create product dynamically to avoid manual dashboard setup
      let product;
      const products = await stripe.products.list({ limit: 100 });
      product = products.data.find(p => p.metadata.plan_id === planId);
      
      if (!product) {
        product = await stripe.products.create({
          name: `SinglePay - Plano ${plan.name}`,
          metadata: { plan_id: planId }
        });
      }

      // Find or create price dynamically (recurring monthly)
      let price;
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      price = prices.data.find(p => p.unit_amount === Math.round(plan.price * 100) && p.recurring?.interval === 'month');
      
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(plan.price * 100),
          currency: 'brl',
          recurring: { interval: 'month' }
        });
      }

      // Check if user already has subscriptions, and cancel them to avoid double charging
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all'
      });
      
      for (const sub of subscriptions.data) {
        if (sub.status !== 'canceled') {
          await stripe.subscriptions.cancel(sub.id);
        }
      }

      // Create new monthly subscription
      const subscription = await stripe.subscriptions.create({
        customer: profile.stripe_customer_id,
        items: [{ price: price.id }],
        default_payment_method: paymentMethods.data[0].id,
        metadata: {
          user_id: user.id,
          plan_id: planId
        }
      });

      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        throw new Error(`Assinatura criada com status: ${subscription.status}. Verifique seu cartão.`);
      }
    } catch (err: any) {
      console.error("[Billing] Subscription failed:", err.message);
      throw new Error(`Falha ao assinar plano: ${err.message}`);
    }
  } else {
    // If returning to the free Standard plan, cancel any active paid subscriptions
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all'
      });
      
      for (const sub of subscriptions.data) {
        if (sub.status !== 'canceled') {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
    } catch (err: any) {
      console.error("[Billing] Failed to cancel subscriptions on downgrade:", err.message);
    }
  }

  // 2. If payment succeeded (or plan is free), update the database
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ 
      plan_id: planId,
      fee_percentage: plan.fee
    })
    .eq("id", user.id);

  if (error) throw error;

  revalidatePath("/cobrancas");
  return { success: true };
}

/**
 * Gets billing info for the current user
 */
export async function getBillingInfo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: unbilledSales } = await supabase
    .from("sales")
    .select("platform_fee")
    .eq("user_id", user.id)
    .eq("is_fee_billed", false)
    .eq("status", "succeeded");

  const totalUnbilled = unbilledSales?.reduce((acc, s) => acc + (Number(s.platform_fee) || 0), 0) || 0;

  let cardDetails = null;
  if (profile?.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
      } as any);

      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: 'card',
      });

      if (paymentMethods.data.length > 0) {
        const card = paymentMethods.data[0].card;
        cardDetails = {
          brand: card?.brand || "credit_card",
          last4: card?.last4 || "••••",
          expMonth: card?.exp_month,
          expYear: card?.exp_year,
        };
      }
    } catch (err: any) {
      console.error("[getBillingInfo] Error fetching customer card details:", err.message);
    }
  }

  // Fetch user billing history records (all users for admin, user-specific for sellers)
  let billingHistory = [];
  if (profile?.is_admin) {
    try {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: allHistory, error: historyErr } = await supabaseAdmin
        .from("billing_history")
        .select("*, profiles(email)")
        .order("created_at", { ascending: false });

      if (historyErr) throw historyErr;
      billingHistory = allHistory || [];
    } catch (err: any) {
      console.error("[getBillingInfo] Error fetching admin billing history:", err.message);
    }
  } else {
    const { data: userHistory } = await supabase
      .from("billing_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      
    billingHistory = userHistory || [];
  }

  return {
    profile,
    totalUnbilled: profile?.is_admin ? 0 : totalUnbilled,
    plans: BILLING_PLANS,
    cardDetails: profile?.is_admin ? null : cardDetails,
    billingHistory
  };
}
