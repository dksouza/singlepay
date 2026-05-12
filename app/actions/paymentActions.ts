"use server";

import { createClient } from "../../lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { sendToUtmify, formatUtmifyDate, UtmifyPayload } from "../../lib/integrations/utmify";
import { calculatePlatformFee } from "../../lib/billing";

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

    // Check if offer is active
    if (offer.is_active === false) {
      return { error: "OFFER_DISABLED" };
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
  } else {
    // Check if checkout is active
    if (checkout.is_active === false) {
      return { error: "CHECKOUT_DISABLED" };
    }
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

export async function updateSaleStatus(
  paymentIntentId: string,
  status: string,
  customerData?: { email?: string, name?: string, phone?: string, stripe_customer_id?: string, stripe_payment_method_id?: string },
  trackingData?: any,
  selectedBumpIds?: string[]
) {
  // Usar service role para ignorar RLS em checkouts públicos
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const updateData: any = { status };
  if (customerData?.email) updateData.customer_email = customerData.email;
  if (customerData?.name) updateData.customer_name = customerData.name;
  if (customerData?.phone) updateData.customer_phone = customerData.phone;
  if (customerData?.stripe_customer_id) updateData.stripe_customer_id = customerData.stripe_customer_id;
  if (customerData?.stripe_payment_method_id) updateData.stripe_payment_method_id = customerData.stripe_payment_method_id;

  // Save tracking data if provided (usually during pending status update)
  if (trackingData) {
    if (trackingData.src) updateData.src = trackingData.src;
    if (trackingData.sck) updateData.sck = trackingData.sck;
    if (trackingData.utm_source) updateData.utm_source = trackingData.utm_source;
    if (trackingData.utm_medium) updateData.utm_medium = trackingData.utm_medium;
    if (trackingData.utm_campaign) updateData.utm_campaign = trackingData.utm_campaign;
    if (trackingData.utm_content) updateData.utm_content = trackingData.utm_content;
    if (trackingData.utm_term) updateData.utm_term = trackingData.utm_term;
    if (trackingData.ip) updateData.customer_ip = trackingData.ip;
  }

  // 1. Update existing records for this PI
  const { error: updateError } = await supabase
    .from("sales")
    .update(updateData)
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (updateError) {
    console.error("Error updating sale status:", updateError);
    return { success: false, error: updateError.message };
  }

  // 2. Handle Orderbumps creation/sync
  if (selectedBumpIds !== undefined) {
    console.log("[ORDERBUMP] Processing orderbumps for PI:", paymentIntentId, "status:", status, "bumpIds:", selectedBumpIds);

    // 2.1 Get main sale info (handle both null and false for is_orderbump)
    const { data: mainSale, error: mainSaleError } = await supabase
      .from("sales")
      .select("*")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .or("is_orderbump.is.null,is_orderbump.eq.false")
      .maybeSingle();

    console.log("[ORDERBUMP] Main sale found:", mainSale ? mainSale.id : "NOT FOUND", "Error:", mainSaleError);

    if (mainSale) {
      // 2.2 Delete old bump sales for this PI to stay in sync
      const { error: deleteError } = await supabase
        .from("sales")
        .delete()
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("is_orderbump", true);

      if (deleteError) console.error("[ORDERBUMP] Error deleting old bumps:", deleteError);

      // 2.3 Create new bump sales (with current status — pending or succeeded)
      if (selectedBumpIds.length > 0) {
        const { data: bumps, error: bumpsError } = await supabase
          .from("orderbumps")
          .select(`
            *,
            bump_offer:offers!bump_offer_id(*),
            bump_product:products!bump_product_id(*)
          `)
          .in("id", selectedBumpIds);

        console.log("[ORDERBUMP] Fetched bumps:", bumps?.length || 0, "Error:", bumpsError);

        if (bumps && bumps.length > 0) {
          const bumpSales = await Promise.all(bumps.map(async (bump) => {
            const amount = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
            const platformFee = await calculatePlatformFee(mainSale.user_id, amount);
            
            return {
              user_id: mainSale.user_id,
              product_id: bump.bump_product_id,
              offer_id: bump.bump_offer_id || null,
              stripe_payment_intent_id: paymentIntentId,
              amount: amount,
              currency: (bump.bump_offer ? bump.bump_offer.currency : bump.bump_product.currency) || mainSale.currency,
              platform_fee: platformFee,
              status: status,
              is_orderbump: true,
              customer_name: customerData?.name || mainSale.customer_name || null,
              customer_email: customerData?.email || mainSale.customer_email || null,
              customer_phone: customerData?.phone || mainSale.customer_phone || null,
              stripe_customer_id: customerData?.stripe_customer_id || mainSale.stripe_customer_id || null,
              stripe_payment_method_id: customerData?.stripe_payment_method_id || mainSale.stripe_payment_method_id || null,
            };
          }));

          console.log("[ORDERBUMP] Inserting bump sales:", JSON.stringify(bumpSales, null, 2));

          const { error: insertError } = await supabase.from("sales").insert(bumpSales);
          if (insertError) {
            console.error("[ORDERBUMP] INSERT ERROR:", insertError);
          } else {
            console.log("[ORDERBUMP] Successfully inserted", bumpSales.length, "bump sale(s)");
          }
        }
      } else {
        console.log("[ORDERBUMP] No bumps selected, cleaned up old ones");
      }
    } else {
      console.error("[ORDERBUMP] CRITICAL: Main sale not found for PI:", paymentIntentId);
    }
  }

  // 3. Ensure customer exists for Stripe
  if (status === "pending" && customerData?.email && !updateData.stripe_customer_id) {
    const { data: sale } = await supabase
      .from("sales")
      .select("user_id, stripe_customer_id, stripe_subscription_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .or("is_orderbump.is.null,is_orderbump.eq.false")
      .maybeSingle();

    if (sale && !sale.stripe_customer_id && !sale.stripe_subscription_id) {
      const { data: stripeConfig } = await supabase
        .from("stripe_configs")
        .select("secret_key")
        .eq("user_id", sale.user_id)
        .single();

      if (stripeConfig?.secret_key) {
        try {
          const stripe = new Stripe(stripeConfig.secret_key.trim(), { });

          const customer = await stripe.customers.create({
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
          });

          await stripe.paymentIntents.update(paymentIntentId, {
            customer: customer.id,
            setup_future_usage: 'off_session',
          });

          // Update all sales with the new customer ID
          await supabase.from("sales")
            .update({ stripe_customer_id: customer.id })
            .eq("stripe_payment_intent_id", paymentIntentId);

          updateData.stripe_customer_id = customer.id;
        } catch (e) {
          console.error("Error creating/attaching Stripe customer:", e);
        }
      }
    }
  }

  // --- UTMIFY INTEGRATION ---
  if (status === "succeeded") {
    try {
      // Get ALL sales for this PI to handle Orderbumps
      const { data: sales } = await supabase
        .from("sales")
        .select(`
          *,
          products (*),
          checkouts (*)
        `)
        .eq("stripe_payment_intent_id", paymentIntentId);

      if (sales && sales.length > 0) {
        const mainSale = sales.find(s => !s.is_orderbump) || sales[0];

        const { data: utmifyConfig } = await supabase
          .from("utmify_configs")
          .select("api_token")
          .eq("user_id", mainSale.user_id)
          .single();

        if (utmifyConfig?.api_token) {
          const utmifyProducts = sales.map(s => ({
            id: s.products?.id || "",
            name: s.products?.name || "Produto",
            planId: s.checkouts?.id || null,
            planName: s.checkouts?.title || null,
            quantity: 1,
            priceInCents: Math.round((s.amount || 0) * 100)
          }));

          const totalAmount = sales.reduce((acc, s) => acc + (s.amount || 0), 0);

          // Use provided trackingData OR fallback to data saved in the DB (for webhooks)
          const finalTracking = {
            src: trackingData?.src || mainSale.src,
            sck: trackingData?.sck || mainSale.sck,
            utm_source: trackingData?.utm_source || mainSale.utm_source,
            utm_campaign: trackingData?.utm_campaign || mainSale.utm_campaign,
            utm_medium: trackingData?.utm_medium || mainSale.utm_medium,
            utm_content: trackingData?.utm_content || mainSale.utm_content,
            utm_term: trackingData?.utm_term || mainSale.utm_term,
            ip: trackingData?.ip || mainSale.customer_ip
          };

          const payload: UtmifyPayload = {
            orderId: mainSale.id,
            platform: "SinglePay",
            paymentMethod: "credit_card",
            status: "paid",
            createdAt: formatUtmifyDate(new Date(mainSale.created_at)),
            approvedDate: formatUtmifyDate(new Date()),
            refundedAt: null,
            customer: {
              name: mainSale.customer_name || "Cliente",
              email: mainSale.customer_email || "",
              phone: mainSale.customer_phone || null,
              document: null,
              ip: finalTracking.ip || null
            },
            products: utmifyProducts,
            trackingParameters: {
              src: finalTracking.src || null,
              sck: finalTracking.sck || null,
              utm_source: finalTracking.utm_source || null,
              utm_campaign: finalTracking.utm_campaign || null,
              utm_medium: finalTracking.utm_medium || null,
              utm_content: finalTracking.utm_content || null,
              utm_term: finalTracking.utm_term || null
            },
            commission: {
              totalPriceInCents: Math.round(totalAmount * 100),
              gatewayFeeInCents: 0,
              userCommissionInCents: Math.round(totalAmount * 100),
              currency: mainSale.products?.currency || "BRL"
            }
          };

          await sendToUtmify(payload, utmifyConfig.api_token);
        }
      }
    } catch (e) {
      console.error("Failed to process Utmify integration:", e);
    }
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
    .eq("is_active", true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

