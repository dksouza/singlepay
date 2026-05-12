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

  // 1. Charge the monthly fee immediately if it's a paid plan
  if (plan.price > 0) {
    try {
      // Find the payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        throw new Error("Nenhum cartão encontrado. Por favor, vincule seu cartão novamente.");
      }

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.price * 100),
        currency: 'brl',
        customer: profile.stripe_customer_id,
        payment_method: paymentMethods.data[0].id,
        off_session: true,
        confirm: true,
        description: `Mensalidade Plano ${plan.name} - SinglePay`,
        metadata: { 
          user_id: user.id,
          plan_id: planId 
        }
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Pagamento ${paymentIntent.status}. Verifique seu cartão.`);
      }
    } catch (err: any) {
      console.error("[Billing] Payment failed:", err.message);
      throw new Error(`Falha no pagamento: ${err.message}`);
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

  return {
    profile,
    totalUnbilled,
    plans: BILLING_PLANS
  };
}
