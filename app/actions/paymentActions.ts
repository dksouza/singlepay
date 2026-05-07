"use server";

import { createClient } from "../../lib/supabase/server";
import Stripe from "stripe";
import { cookies } from "next/headers";

export async function createPaymentIntent(hash: string) {
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
    console.error("Checkout not found:", checkoutError);
    return { error: "Checkout não encontrado" };
  }

  // 2. Get user's stripe configuration
  const { data: stripeConfig, error: configError } = await supabase
    .from("stripe_configs")
    .select("*")
    .eq("user_id", checkout.user_id)
    .single();

  if (configError || !stripeConfig || !stripeConfig.secret_key) {
    console.error("Stripe config not found for user:", checkout.user_id);
    return { error: "Este vendedor ainda não configurou o gateway de pagamento." };
  }

  return {
    publishableKey: stripeConfig.publishable_key,
    product: checkout.products,
    checkout: checkout
  };
}

export async function updateSaleStatus(paymentIntentId: string, status: string, customerData?: { email?: string, name?: string, phone?: string }) {
  const supabase = await createClient();

  const updateData: any = { status };
  if (customerData?.email) updateData.customer_email = customerData.email;
  if (customerData?.name) updateData.customer_name = customerData.name;
  if (customerData?.phone) updateData.customer_phone = customerData.phone;

  const { error } = await supabase
    .from("sales")
    .update(updateData)
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error) {
    console.error("Error updating sale status:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

