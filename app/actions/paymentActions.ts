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

  let finalProduct = checkout?.products;
  let finalCheckout = checkout;
  let userId = checkout?.user_id;

  if (checkoutError || !checkout) {
    // 1.1 If not found in checkouts, check in offers
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(`
        *,
        products (*)
      `)
      .eq("hash", hash)
      .single();

    if (offerError || !offer) {
      console.error("Checkout/Offer not found:", checkoutError || offerError);
      return { error: "Checkout não encontrado" };
    }

    // Prepare offer-based checkout data
    userId = offer.user_id;
    finalCheckout = {
      ...offer,
      title: offer.name,
      payment_type: "single", // Offers are usually single payments for now
    };
    finalProduct = {
      ...offer.products,
      price: offer.price,
      currency: offer.currency,
    };
  }

  // 2. Get user's stripe configuration
  const { data: stripeConfig, error: configError } = await supabase
    .from("stripe_configs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (configError || !stripeConfig || !stripeConfig.secret_key) {
    console.error("Stripe config not found for user:", userId);
    return { error: "Este vendedor ainda não configurou o gateway de pagamento." };
  }

  return {
    publishableKey: stripeConfig.publishable_key,
    product: finalProduct,
    checkout: finalCheckout
  };
}

export async function updateSaleStatus(paymentIntentId: string, status: string, customerData?: { email?: string, name?: string, phone?: string, stripe_customer_id?: string, stripe_payment_method_id?: string }) {
  const supabase = await createClient();

  const updateData: any = { status };
  if (customerData?.email) updateData.customer_email = customerData.email;
  if (customerData?.name) updateData.customer_name = customerData.name;
  if (customerData?.phone) updateData.customer_phone = customerData.phone;
  if (customerData?.stripe_customer_id) updateData.stripe_customer_id = customerData.stripe_customer_id;
  if (customerData?.stripe_payment_method_id) updateData.stripe_payment_method_id = customerData.stripe_payment_method_id;

  // Ensure customer exists for one-time payments
  if (status === "pending" && customerData?.email && !updateData.stripe_customer_id) {
    const { data: sale } = await supabase
      .from("sales")
      .select("user_id, stripe_customer_id, stripe_subscription_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (sale && !sale.stripe_customer_id && !sale.stripe_subscription_id) {
      const { data: stripeConfig } = await supabase
        .from("stripe_configs")
        .select("secret_key")
        .eq("user_id", sale.user_id)
        .single();

      if (stripeConfig?.secret_key) {
        try {
          const stripe = new Stripe(stripeConfig.secret_key.trim(), {
            apiVersion: '2024-06-20',
          });

          const customer = await stripe.customers.create({
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
          });

          await stripe.paymentIntents.update(paymentIntentId, {
            customer: customer.id,
          });

          updateData.stripe_customer_id = customer.id;
        } catch (e) {
          console.error("Error creating/attaching Stripe customer:", e);
        }
      }
    }
  }

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

export async function getUpsellStrategy(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("upsell_strategies")
    .select("*")
    .eq("product_id", productId)
    .eq("type", "Upsell")
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

