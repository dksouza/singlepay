import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = 'experimental-edge';

/**
 * API route to sync orderbump sales for a PaymentIntent.
 * Called from the public checkout page when payment succeeds.
 * Uses service role to bypass RLS (falls back to anon key).
 * 
 * Receives full bump data from client (already loaded at intent time)
 * to avoid RLS issues when re-querying orderbumps table.
 */
export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    console.log("[ORDERBUMP-API] Raw body:", rawText);
    
    const body = JSON.parse(rawText);
    const { paymentIntentId, status, bumpsData, customerData } = body;

    console.log("[ORDERBUMP-API] Parsed - PI:", paymentIntentId, "Status:", status, "Bumps count:", bumpsData?.length);

    if (!paymentIntentId || !status) {
      console.error("[ORDERBUMP-API] Missing required fields!");
      return NextResponse.json({ error: "Missing paymentIntentId or status" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Find the main sale for this PI
    const { data: mainSale, error: mainSaleError } = await supabase
      .from("sales")
      .select("*")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .or("is_orderbump.is.null,is_orderbump.eq.false")
      .limit(1)
      .single();

    if (mainSaleError || !mainSale) {
      console.error("[ORDERBUMP-API] Main sale not found:", mainSaleError);
      return NextResponse.json({ error: "Main sale not found", details: mainSaleError }, { status: 404 });
    }

    console.log("[ORDERBUMP-API] Main sale found:", mainSale.id);

    // 2. Delete any existing orderbump sales for this PI
    await supabase
      .from("sales")
      .delete()
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("is_orderbump", true);

    // 3. If no bumps data, we're done
    if (!bumpsData || bumpsData.length === 0) {
      console.log("[ORDERBUMP-API] No bumps to create, done.");
      return NextResponse.json({ success: true, bumpsCreated: 0 });
    }

    // 4. Create orderbump sale records using data sent from client
    const bumpSales = bumpsData.map((bump: any) => ({
      user_id: mainSale.user_id,
      product_id: bump.product_id,
      offer_id: bump.offer_id || null,
      stripe_payment_intent_id: paymentIntentId,
      amount: bump.amount,
      currency: bump.currency || mainSale.currency,
      status: status,
      is_orderbump: true,
      customer_name: customerData?.name || mainSale.customer_name || null,
      customer_email: customerData?.email || mainSale.customer_email || null,
      customer_phone: customerData?.phone || mainSale.customer_phone || null,
      stripe_customer_id: customerData?.stripe_customer_id || mainSale.stripe_customer_id || null,
      stripe_payment_method_id: customerData?.stripe_payment_method_id || mainSale.stripe_payment_method_id || null,
    }));

    console.log("[ORDERBUMP-API] Inserting bump sales:", JSON.stringify(bumpSales, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from("sales")
      .insert(bumpSales)
      .select();

    if (insertError) {
      console.error("[ORDERBUMP-API] INSERT ERROR:", insertError);
      return NextResponse.json({ error: "Failed to insert orderbump sales", details: insertError }, { status: 500 });
    }

    console.log("[ORDERBUMP-API] SUCCESS! Inserted", insertedData?.length, "orderbump sale(s)");

    return NextResponse.json({
      success: true,
      bumpsCreated: insertedData?.length || 0,
      bumpSaleIds: insertedData?.map((s: any) => s.id) || []
    });

  } catch (error: any) {
    console.error("[ORDERBUMP-API] Unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
