import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

/**
 * API route to charge orderbumps separately for subscription checkouts.
 * After the subscription payment succeeds, this endpoint creates a separate
 * PaymentIntent for the orderbump total and charges it using the same
 * customer and payment method from the subscription.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentIntentId, bumpsData, customerData } = body;

    console.log("[CHARGE-BUMPS] Request:", { paymentIntentId, bumpsCount: bumpsData?.length });

    if (!paymentIntentId || !bumpsData || bumpsData.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Get the main sale to find customer_id and payment_method
    const { data: mainSale } = await supabase
      .from("sales")
      .select("*")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .or("is_orderbump.is.null,is_orderbump.eq.false")
      .limit(1)
      .single();

    if (!mainSale) {
      console.error("[CHARGE-BUMPS] Main sale not found for PI:", paymentIntentId);
      return NextResponse.json({ error: "Main sale not found" }, { status: 404 });
    }

    const customerId = mainSale.stripe_customer_id || customerData?.stripe_customer_id;
    const paymentMethodId = mainSale.stripe_payment_method_id || customerData?.stripe_payment_method_id;

    if (!customerId || !paymentMethodId) {
      console.error("[CHARGE-BUMPS] Missing customer or payment method:", { customerId, paymentMethodId });
      return NextResponse.json({ error: "Missing customer or payment method for bump charge" }, { status: 400 });
    }

    // 2. Get Stripe config
    const { data: stripeConfig } = await supabase
      .from("stripe_configs")
      .select("secret_key")
      .eq("user_id", mainSale.user_id)
      .single();

    if (!stripeConfig?.secret_key) {
      return NextResponse.json({ error: "Stripe config not found" }, { status: 400 });
    }

    const stripe = new Stripe(stripeConfig.secret_key, { apiVersion: '2024-06-20' });

    // 3. Calculate total bump amount
    const totalBumpAmount = bumpsData.reduce((sum: number, bump: any) => sum + bump.amount, 0);
    const bumpDescriptions = bumpsData.map((b: any) => b.product_id).join(", ");

    console.log("[CHARGE-BUMPS] Charging", totalBumpAmount, "for", bumpsData.length, "orderbump(s)");

    // 4. Create and confirm a separate PaymentIntent for orderbumps
    const bumpPI = await stripe.paymentIntents.create({
      amount: Math.round(totalBumpAmount * 100),
      currency: bumpsData[0]?.currency?.toLowerCase() || mainSale.currency?.toLowerCase() || "brl",
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Orderbump(s) - ${bumpsData.length} item(s)`,
      metadata: {
        is_orderbump_charge: 'true',
        original_pi: paymentIntentId,
        user_id: mainSale.user_id,
      }
    });

    console.log("[CHARGE-BUMPS] Bump PI created:", bumpPI.id, "Status:", bumpPI.status);

    // 5. Update orderbump sales in DB with the new PI ID
    // First, update existing bump sales to use the new bump PI
    for (const bump of bumpsData) {
      await supabase
        .from("sales")
        .update({
          stripe_payment_intent_id: bumpPI.id,
          status: bumpPI.status === 'succeeded' ? 'succeeded' : 'pending',
        })
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("product_id", bump.product_id)
        .eq("is_orderbump", true);
    }

    console.log("[CHARGE-BUMPS] SUCCESS! Bumps charged via PI:", bumpPI.id);

    return NextResponse.json({
      success: true,
      bumpPaymentIntentId: bumpPI.id,
      status: bumpPI.status,
      amount: totalBumpAmount,
    });

  } catch (error: any) {
    console.error("[CHARGE-BUMPS] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
