
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testUpdatePi() {
  const paymentIntentId = "pi_TEST_" + Date.now();
  const hash = "uCAGRfya";

  console.log("Testing Update PI with:", { paymentIntentId, hash });

  // 1. Get checkout/offer
  const { data: checkout } = await supabase
    .from("checkouts")
    .select("*, products(*)")
    .eq("hash", hash)
    .single();

  if (!checkout) {
      console.log("Checkout not found");
      return;
  }

  const userId = checkout.user_id;
  const currency = checkout.products.currency;

  // 2. Get bumps for this product
  const { data: bumps } = await supabase
    .from("orderbumps")
    .select(`
      *,
      bump_offer:offers!bump_offer_id(*),
      bump_product:products!bump_product_id(*)
    `)
    .eq("product_id", checkout.product_id);

  console.log("Bumps found for product:", bumps?.length || 0);

  if (bumps && bumps.length > 0) {
      const selectedBumpIds = [bumps[0].id];
      console.log("Using first bump ID:", selectedBumpIds);

      const bumpSales = bumps.slice(0, 1).map(bump => ({
        user_id: userId,
        product_id: bump.bump_product_id,
        offer_id: bump.bump_offer_id || null,
        stripe_payment_intent_id: paymentIntentId,
        amount: bump.bump_offer ? bump.bump_offer.price : bump.bump_product.price,
        currency: (bump.bump_offer ? bump.bump_offer.currency : bump.bump_product.currency) || currency,
        status: "pending",
        is_orderbump: true
      }));

      console.log("Attempting to insert bump sales:", JSON.stringify(bumpSales, null, 2));
      const { data, error: insertError } = await supabase.from("sales").insert(bumpSales).select();
      if (insertError) {
          console.error("INSERT ERROR:", JSON.stringify(insertError, null, 2));
      } else {
          console.log("INSERT SUCCESS:", JSON.stringify(data, null, 2));
      }
  } else {
      console.log("No bumps found for this product in DB.");
  }
}

testUpdatePi();
