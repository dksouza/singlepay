import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
} as any);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role for batch processing
);

export async function GET(req: Request) {
  // 1. Basic security check (use a secret token in query param or header)
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // 2. Find users who are due for billing
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, plan_id, email")
      .lte("next_billing_date", now)
      .not("stripe_customer_id", "is", null)
      .not("is_admin", "eq", true); // Don't bill admins

    if (profileError) throw profileError;

    const results = [];

    for (const profile of profiles) {
      // 3. Sum unbilled fees for this user
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id, platform_fee")
        .eq("user_id", profile.id)
        .eq("is_fee_billed", false)
        .eq("status", "succeeded");

      if (salesError) continue;

      const totalFee = sales.reduce((acc, s) => acc + (Number(s.platform_fee) || 0), 0);

      if (totalFee <= 0) {
        // No fees to bill, just update the date for the next cycle
        await supabase.from("profiles")
          .update({ next_billing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() })
          .eq("id", profile.id);
        results.push({ email: profile.email, status: "no_fees_date_updated" });
        continue;
      }

      try {
        // 4. Charge the card on Stripe
        // We use off_session because the user is not present
        const paymentMethods = await stripe.paymentMethods.list({
          customer: profile.stripe_customer_id!,
          type: 'card',
        });

        if (paymentMethods.data.length === 0) {
          throw new Error("Nenhum método de pagamento encontrado");
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalFee * 100),
          currency: 'brl',
          customer: profile.stripe_customer_id!,
          payment_method: paymentMethods.data[0].id,
          off_session: true,
          confirm: true,
          description: `Taxas de plataforma SinglePay - Ciclo 15 dias`,
          metadata: { user_id: profile.id }
        });

        // 5. If success, update sales and profile
        if (paymentIntent.status === 'succeeded') {
          const saleIds = sales.map(s => s.id);
          
          await supabase.from("sales")
            .update({ is_fee_billed: true })
            .in("id", saleIds);

          await supabase.from("profiles")
            .update({ next_billing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() })
            .eq("id", profile.id);

          results.push({ email: profile.email, status: "success", amount: totalFee });
        }
      } catch (stripeError: any) {
        console.error(`[CRON] Error charging user ${profile.email}:`, stripeError.message);
        results.push({ email: profile.email, status: "failed", error: stripeError.message });
      }
    }

    return NextResponse.json({ processed: results.length, results });

  } catch (error: any) {
    console.error("[CRON] Fatal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
