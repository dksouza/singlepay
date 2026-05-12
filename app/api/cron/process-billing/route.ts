import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Force this route to be dynamic so it's not pre-rendered during build
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Initialize Stripe and Supabase INSIDE the handler to avoid build-time errors 
  // when environment variables are missing.
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("[CRON] Missing environment variables for billing process.");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  } as any);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Basic security check
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
      .not("is_admin", "eq", true);

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
        await supabase.from("profiles")
          .update({ next_billing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() })
          .eq("id", profile.id);
        results.push({ email: profile.email, status: "no_fees_date_updated" });
        continue;
      }

      try {
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
