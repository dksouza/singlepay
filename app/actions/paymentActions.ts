"use server";

import { createClient } from "../../lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { sendToUtmify, formatUtmifyDate, UtmifyPayload } from "../../lib/integrations/utmify";
import { sendToAppSell, AppSellPayload } from "../../lib/integrations/appsell";
import { calculatePlatformFee } from "../../lib/billing";
import { sendOrderConfirmationEmail } from "../../lib/mail";
import { triggerWebhooks } from "../../lib/webhook-service";

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
    if (trackingData.lang) updateData.customer_lang = trackingData.lang;

    // Try to get IP from trackingData, else from headers
    let ip = trackingData.ip;
    if (!ip) {
      try {
        const { headers } = await import("next/headers");
        const headerList = await headers();
        ip = headerList.get("x-forwarded-for")?.split(",")[0];
      } catch (e) { }
    }
    if (ip) updateData.customer_ip = ip;
  }

  // 1. Update existing records for this PI
  // We use .neq("status", "succeeded") to ensure we only process the "transition" once
  const { data: updatedSales, error: updateError } = await supabase
    .from("sales")
    .update(updateData)
    .eq("stripe_payment_intent_id", paymentIntentId)
    .neq("status", "succeeded")
    .select("*, products(*)");

  if (updateError) {
    console.error("Error updating sale status:", updateError);
    return { success: false, error: updateError.message };
  }

  // --- WEBHOOK TRIGGER ---
  if (updatedSales && updatedSales.length > 0) {
    const mainSale = updatedSales.find(s => !s.is_orderbump) || updatedSales[0];

    // Determine the event name based on status and method
    let eventName = "";
    const isPix = mainSale.payment_method === "pix" || paymentIntentId.startsWith("pix_");

    if (status === "succeeded") eventName = isPix ? "pix.paid" : "card.paid";
    else if (status === "pending") eventName = isPix ? "pix.generated" : "card.pending";
    else if (status === "refused") eventName = isPix ? "pix.failed" : "card.failed";
    else if (status === "refunded") eventName = isPix ? "pix.refunded" : "card.refunded";
    else if (status === "chargedback") eventName = "card.chargedback";

    if (eventName) {
      console.log(`[WEBHOOK] Triggering event ${eventName} for sale ${mainSale.id}`);
      // Trigger webhooks in background
      triggerWebhooks(mainSale.id, eventName).catch(err =>
        console.error("[WEBHOOK] Critical failure in triggerWebhooks:", err)
      );
    }
  }

  // 2. Trigger Localized Email via Resend on Success
  // ONLY if we actually updated rows (meaning it wasn't 'succeeded' before)
  if (status === "succeeded" && updatedSales && updatedSales.length > 0) {
    const mainSale = updatedSales.find(s => !s.is_orderbump) || updatedSales[0];
    console.log(`[MAIL] Venda ${paymentIntentId} aprovada pela primeira vez. Enviando e-mail...`);

    try {
      await sendOrderConfirmationEmail(mainSale, mainSale.products, mainSale.customer_lang || 'pt');
    } catch (mailErr) {
      console.error("[MAIL] Failed to trigger email:", mailErr);
    }
  } else if (status === "succeeded") {
    console.log(`[MAIL] Venda ${paymentIntentId} já estava aprovada. E-mail ignorado.`);
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
          const stripe = new Stripe(stripeConfig.secret_key.trim(), {});

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

  // --- EXTERNAL INTEGRATIONS (UTMIFY & APPSELL) ---
  const integrationSupportedStatuses = ["pending", "succeeded", "refused", "refunded", "chargedback"];
  if (integrationSupportedStatuses.includes(status)) {
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
        const integrationResult: any = { success: true };

        // 1. UTMIFY INTEGRATION
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

          const utmifyStatusMap: Record<string, 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback'> = {
            "pending": "waiting_payment",
            "succeeded": "paid",
            "refused": "refused",
            "refunded": "refunded",
            "chargedback": "chargedback"
          };

          const utmifyPayload: UtmifyPayload = {
            orderId: mainSale.id,
            platform: "SinglePay",
            paymentMethod: "credit_card",
            status: utmifyStatusMap[status] || "paid",
            createdAt: formatUtmifyDate(new Date(mainSale.created_at)),
            approvedDate: status === "succeeded" ? formatUtmifyDate(new Date()) : null,
            refundedAt: status === "refunded" ? formatUtmifyDate(new Date()) : null,
            customer: {
              name: mainSale.customer_name || "Cliente",
              email: mainSale.customer_email || "",
              phone: mainSale.customer_phone || null,
              document: null,
              ip: finalTracking.ip || "0.0.0.0"
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

          const result = await sendToUtmify(utmifyPayload, utmifyConfig.api_token);

          if (result.success) {
            console.log(`[UTMIFY] Sent event ${status} for PI ${paymentIntentId}`);
            integrationResult.utmify_sent = true;
            integrationResult.utmify_status = status;
            integrationResult.utmify_response = result.data;
          } else {
            console.error(`[UTMIFY] Failed to send event ${status}:`, result.error);
            integrationResult.utmify_sent = false;
            integrationResult.utmify_error = result.error;
          }
        } else {
          integrationResult.utmify_sent = false;
          integrationResult.utmify_reason = "No Utmify API token found";
        }

        // 2. APPSELL INTEGRATION
        const appsellSupportedStatuses = ["succeeded", "refunded", "chargedback"];
        if (appsellSupportedStatuses.includes(status)) {
          const { data: appsellConfig } = await supabase
            .from("appsell_configs")
            .select("api_token")
            .eq("user_id", mainSale.user_id)
            .single();

          if (appsellConfig?.api_token) {
            // Provision or Refund access for each sale item (including Orderbumps if applicable)
            const appsellPromises = sales.map(async (sale) => {
              const appsellStatus = status === "succeeded" ? "approved" : "refund";

              const appsellPayload: AppSellPayload = {
                email: sale.customer_email || mainSale.customer_email || "",
                product_id: sale.products?.id || sale.product_id,
                status: appsellStatus
              };

              if (appsellStatus === "approved") {
                appsellPayload.name = sale.customer_name || mainSale.customer_name || "Cliente";
                appsellPayload.phone = sale.customer_phone || mainSale.customer_phone || null;
                appsellPayload.send_email = true;
              }

              return sendToAppSell(appsellPayload, appsellConfig.api_token);
            });

            const appsellResults = await Promise.all(appsellPromises);
            const allSuccessful = appsellResults.every(r => r.success);

            if (allSuccessful) {
              console.log(`[APPSELL] Sent access manage for ${sales.length} sale(s) on event ${status}`);
              integrationResult.appsell_sent = true;
              integrationResult.appsell_status = status;
              integrationResult.appsell_responses = appsellResults.map(r => r.data);
            } else {
              console.error(`[APPSELL] Some integrations failed:`, appsellResults);
              integrationResult.appsell_sent = false;
              integrationResult.appsell_errors = appsellResults.filter(r => !r.success).map(r => r.error);
            }
          } else {
            integrationResult.appsell_sent = false;
            integrationResult.appsell_reason = "No AppSell API token found";
          }
        }

        return integrationResult;
      }
      return { success: true, utmify_sent: false, reason: "No sales found for this PI" };
    } catch (e) {
      console.error("Failed to process integrations:", e);
      return { success: false, error: "Integrations execution failed" };
    }
  }

  return { success: true, utmify_sent: false, reason: "Status not supported for integrations" };
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

export async function resendAccessEmail(saleId: string) {
  const supabase = await createClient();
  const { sendResendAccessEmail } = await import("../../lib/mail");

  // 1. Get sale details
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*, products(*)")
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    console.error("[MAIL] Sale not found for resend:", saleId, saleError);
    return { error: "Venda não encontrada" };
  }

  if (sale.status !== "succeeded") {
    return { error: "Apenas vendas aprovadas podem ter o acesso reenviado." };
  }

  try {
    console.log(`[MAIL] Reenviando e-mail de acesso para a venda ${saleId}...`);
    const result = await sendResendAccessEmail(sale, sale.products, sale.customer_lang || 'pt');

    if (result.success) {
      return { success: true };
    } else {
      return { error: "Erro ao enviar e-mail via provedor." };
    }
  } catch (err) {
    console.error("[MAIL] Failed to resend access email:", err);
    return { error: "Falha técnica ao reenviar e-mail." };
  }
}

export async function resendRecoveryEmail(saleId: string) {
  const supabase = await createClient();
  const { sendRecoveryEmail } = await import("../../lib/mail");

  // 1. Get sale details (need checkout hash)
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*, products(*), checkouts(*)")
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    console.error("[MAIL] Sale not found for recovery:", saleId, saleError);
    return { error: "Venda não encontrada" };
  }

  // Determine hash (prefer checkout, then maybe offer if implemented similarly)
  const hash = sale.checkouts?.hash;

  if (!hash) {
    return { error: "Não foi possível identificar o link de checkout para esta venda." };
  }

  try {
    console.log(`[MAIL] Enviando e-mail de recuperação para a venda ${saleId}...`);
    const result = await sendRecoveryEmail(sale, sale.products, hash, sale.customer_lang || 'pt');

    if (result.success) {
      return { success: true };
    } else {
      return { error: "Erro ao enviar e-mail via provedor." };
    }
  } catch (err) {
    console.error("[MAIL] Failed to send recovery email:", err);
    return { error: "Falha técnica ao enviar e-mail de recuperação." };
  }
}

