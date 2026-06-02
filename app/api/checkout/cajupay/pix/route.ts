import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { calculatePlatformFee } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { hash, selectedBumpIds, customerData, trackingData, docNumber } = await req.json();
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

    // 2. Fetch CajuPay Config & Orderbumps
    const [cajupayConfigResult, orderbumpsResult] = await Promise.all([
      supabase.from("cajupay_configs").select("*").eq("user_id", userId).single(),
      selectedBumpIds?.length > 0 
        ? supabase.from("orderbumps").select("*, bump_product:products!bump_product_id(*), bump_offer:offers!bump_offer_id(*)").in("id", selectedBumpIds)
        : Promise.resolve({ data: [] })
    ]);

    const cajupayConfig = cajupayConfigResult.data;
    const orderbumps = orderbumpsResult.data || [];

    if (!cajupayConfig?.secret_key || !cajupayConfig?.public_key) {
      return NextResponse.json({ error: "Gateway CajuPay não configurado" }, { status: 400 });
    }

    let totalPrice = finalProduct.price;
    orderbumps.forEach((bump: any) => {
      const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
      totalPrice += bumpPrice;
    });

    // 3. Create PIX Payment in CajuPay
    const idempotencyKey = `pix-${finalCheckout.id}-${Date.now()}`;
    const cajuRes = await fetch("https://api.cajupay.com.br/api/payments/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": cajupayConfig.public_key,
        "X-API-Secret": cajupayConfig.secret_key,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount_cents: Math.round(totalPrice * 100),
        currency: finalProduct.currency || "BRL",
        description: finalProduct.name || "Pedido",
        consumer: {
          name: customerData?.name || "Cliente",
          email: customerData?.email || "",
          document: docNumber || "",
        }
      }),
    });

    if (!cajuRes.ok) {
      const errorText = await cajuRes.text();
      console.error("[CAJUPAY PIX ERROR]", errorText);
      return NextResponse.json({ error: "Erro ao gerar PIX" }, { status: 500 });
    }

    const pixData = await cajuRes.json();
    const pixId = pixData.id;

    // 4. Record sales in DB as 'pending'
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const mainPlatformFee = await calculatePlatformFee(userId, finalProduct.price);

    const salesToInsert = [
      {
        user_id: userId,
        product_id: finalProduct.id,
        stripe_payment_intent_id: pixId, // We use this column to store the cajupay payment id
        amount: finalProduct.price,
        currency: finalProduct.currency,
        platform_fee: mainPlatformFee,
        status: "pending",
        is_orderbump: false,
        checkout_id: isOffer ? null : finalCheckout.id,
        offer_id: isOffer ? finalCheckout.id : null,
        payment_method: "pix",
        customer_name: customerData?.name || null,
        customer_email: customerData?.email || null,
        customer_phone: customerData?.phone || null,
        src: trackingData?.src || null,
        sck: trackingData?.sck || null,
        utm_source: trackingData?.utm_source || null,
        utm_campaign: trackingData?.utm_campaign || null,
        utm_medium: trackingData?.utm_medium || null,
        utm_content: trackingData?.utm_content || null,
        utm_term: trackingData?.utm_term || null,
        customer_lang: trackingData?.lang || null,
      }
    ];

    for (const bump of orderbumps) {
      const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
      const bumpCurrency = (bump.bump_offer ? bump.bump_offer.currency : bump.bump_product.currency) || finalProduct.currency;
      const bumpPlatformFee = await calculatePlatformFee(userId, bumpPrice);

      salesToInsert.push({
        user_id: userId,
        product_id: bump.bump_product_id,
        offer_id: bump.bump_offer_id || null,
        stripe_payment_intent_id: pixId,
        amount: bumpPrice,
        currency: bumpCurrency,
        platform_fee: bumpPlatformFee,
        status: "pending",
        is_orderbump: true,
        payment_method: "pix",
        checkout_id: isOffer ? null : finalCheckout.id,
        customer_name: customerData?.name || null,
        customer_email: customerData?.email || null,
        customer_phone: customerData?.phone || null,
        src: trackingData?.src || null,
        sck: trackingData?.sck || null,
        utm_source: trackingData?.utm_source || null,
        utm_campaign: trackingData?.utm_campaign || null,
        utm_medium: trackingData?.utm_medium || null,
        utm_content: trackingData?.utm_content || null,
        utm_term: trackingData?.utm_term || null,
        customer_lang: trackingData?.lang || null,
      });
    }

    await supabaseAdmin.from("sales").delete().eq("stripe_payment_intent_id", pixId);
    const { error: insertError } = await supabaseAdmin.from("sales").insert(salesToInsert);

    if (insertError) {
      console.error("[CAJUPAY DB ERROR]", insertError);
    }

    return NextResponse.json(pixData);

  } catch (error: any) {
    console.error("[PIX-API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
