import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { paymentIntentId, selectedBumpIds, hash } = await req.json();
    console.log("[UPDATE-PI] Attempt:", { paymentIntentId, selectedBumpIds, hash });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Get checkout/offer to calculate base price and detect payment type
    const { data: checkout } = await supabase
      .from("checkouts")
      .select("*, products(*)")
      .eq("hash", hash)
      .single();

    let basePrice = 0;
    let userId = "";
    let currency = "brl";
    let isSubscription = false;

    if (checkout) {
      basePrice = checkout.products.price;
      userId = checkout.user_id;
      currency = checkout.products.currency;
      isSubscription = checkout.payment_type === "subscription";
    } else {
      const { data: offer } = await supabase
        .from("offers")
        .select("*, products(*)")
        .eq("hash", hash)
        .single();

      if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
      basePrice = offer.price;
      userId = offer.user_id;
      currency = offer.currency;
    }

    // 2. Get orderbumps to calculate total
    let totalPrice = basePrice;
    let bumpsTotalPrice = 0;

    if (selectedBumpIds && selectedBumpIds.length > 0) {
      const { data: bumps } = await supabase
        .from("orderbumps")
        .select(`
          *,
          bump_offer:offers!bump_offer_id(*),
          bump_product:products!bump_product_id(*)
        `)
        .in("id", selectedBumpIds);

      if (bumps) {
        bumps.forEach(bump => {
          const bumpPrice = bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price;
          totalPrice += bumpPrice;
          bumpsTotalPrice += bumpPrice;
        });
      }
    }

    console.log("[UPDATE-PI] Total:", totalPrice, "Bumps:", bumpsTotalPrice, "Subscription:", isSubscription);

    // 3. Get Stripe config
    const { data: stripeConfig } = await supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!stripeConfig) return NextResponse.json({ error: "Config not found" }, { status: 400 });

    const stripe = new Stripe(stripeConfig.secret_key, {});

    // 4. Update Stripe
    if (isSubscription) {
      // For subscriptions: we DON'T update the PI amount here.
      // The subscription PI is locked by the invoice. Instead, orderbumps will be
      // charged separately after the subscription payment succeeds (via /api/checkout/charge-bumps).
      // We just track the total for the UI display.
      console.log("[UPDATE-PI] Subscription — skipping Stripe PI update (orderbumps charged separately)");
    } else {
      // For standalone PIs — update the amount to include orderbumps
      await stripe.paymentIntents.update(paymentIntentId, {
        amount: Math.round(totalPrice * 100),
      });
      console.log("[UPDATE-PI] Updated PI amount to:", totalPrice);
    }

    return NextResponse.json({ success: true, totalPrice });

  } catch (error: any) {
    console.error("[UPDATE-PI] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
