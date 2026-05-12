import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { updateSaleStatus } from "../../../../actions/paymentActions";

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // 1. Initialize Supabase with Service Role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // 2. Get user's Stripe configuration
  const { data: stripeConfig, error: configError } = await supabase
    .from("stripe_configs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (configError || !stripeConfig || !stripeConfig.secret_key) {
    console.error(`[WEBHOOK] Stripe config not found for user ${userId}:`, configError);
    return NextResponse.json({ error: "User config not found" }, { status: 404 });
  }

  const stripe = new Stripe(stripeConfig.secret_key.trim(), {
    apiVersion: '2023-10-16' as any,
  });

  let event: Stripe.Event;

  try {
    // 3. Verify signature (if webhook_secret is configured)
    if (stripeConfig.webhook_secret) {
      event = stripe.webhooks.constructEvent(body, sig, stripeConfig.webhook_secret.trim());
    } else {
      console.warn(`[WEBHOOK] Warning: Processing unverified webhook for user ${userId} (No webhook_secret set)`);
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[WEBHOOK] Received event: ${event.type} for user ${userId}`);

  // 4. Handle events
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[WEBHOOK] PaymentIntent Succeeded: ${pi.id}`);
        
        await updateSaleStatus(pi.id, "succeeded", {
          stripe_customer_id: pi.customer as string,
          stripe_payment_method_id: pi.payment_method as string,
        });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[WEBHOOK] Checkout Session Completed: ${session.id}`);

        if (session.payment_intent) {
          await updateSaleStatus(session.payment_intent as string, "succeeded", {
            stripe_customer_id: session.customer as string,
            email: session.customer_details?.email || undefined,
            name: session.customer_details?.name || undefined,
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[WEBHOOK] PaymentIntent Failed: ${pi.id}`);
        await updateSaleStatus(pi.id, "refused");
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`[WEBHOOK] Error processing event: ${err.message}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Next.js config for raw body (if needed in some versions, but req.text() usually works in App Router)
export const dynamic = 'force-dynamic';
