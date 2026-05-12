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

  // Initialize Stripe (using a master key for the platform, or the user's if they are a seller?)
  // For PLATFORM billing, we should use the platform's own Stripe key.
  // Assuming process.env.STRIPE_SECRET_KEY is the platform's key.
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
    
    await supabase.from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
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
 * Updates the user's plan and fee percentage
 */
export async function updatePlan(planId: keyof typeof BILLING_PLANS) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const plan = BILLING_PLANS[planId];
  if (!plan) throw new Error("Plano inválido");

  const { error } = await supabase
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
