
import { createClient } from "../../../../lib/supabase/server";
import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { paymentIntentId, selectedBumpIds, hash } = await req.json();
    const supabase = await createClient();

    // 1. Get checkout/offer to calculate base price
    const { data: checkout } = await supabase
      .from("checkouts")
      .select("*, products(*)")
      .eq("hash", hash)
      .single();

    let basePrice = 0;
    let userId = "";
    let currency = "brl";

    if (checkout) {
      basePrice = checkout.products.price;
      userId = checkout.user_id;
      currency = checkout.products.currency;
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

    // 2. Get orderbumps to add to price
    let totalPrice = basePrice;
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
        });
      }
    }

    // 3. Update Stripe PaymentIntent
    const { data: stripeConfig } = await supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!stripeConfig) return NextResponse.json({ error: "Config not found" }, { status: 400 });

    const stripe = new Stripe(stripeConfig.secret_key, { apiVersion: '2024-06-20' });

    await stripe.paymentIntents.update(paymentIntentId, {
      amount: Math.round(totalPrice * 100),
    });

    return NextResponse.json({ success: true, totalPrice });

  } catch (error: any) {
    console.error("Error updating PI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
newClientSecret: newClientSecret,
  newSubscriptionId: activeSubId || undefined
    });

  } catch (error: any) {
  console.error("Error updating PI:", error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
}
