import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { strategy_id, previous_pi } = await req.json();
    
    // Usando a Anon Key por enquanto (pois a Service Role não foi encontrada no .env)
    // IMPORTANTE: Adicione a SUPABASE_SERVICE_ROLE_KEY no seu .env para maior segurança e estabilidade
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!previous_pi) {
      return NextResponse.json({ error: "Missing previous transaction context (pi parameter)" }, { status: 400 });
    }

    // 1. Get Strategy and related info
    const { data: strategy } = await supabase
      .from("upsell_strategies")
      .select(`
        *,
        upsell_offer:upsell_offer_id(*),
        upsell_product:upsell_product_id(*)
      `)
      .eq("id", strategy_id)
      .single();

    if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

    // 2. Get the seller's Stripe config
    const { data: stripeConfig } = await supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", strategy.user_id)
      .single();

    if (!stripeConfig) return NextResponse.json({ error: "Seller stripe config not found" }, { status: 400 });

    const stripe = new Stripe(stripeConfig.secret_key, { apiVersion: '2024-06-20' });

    // 3. Retrieve the previous PaymentIntent to get customer and payment method
    const oldPi = await stripe.paymentIntents.retrieve(previous_pi);
    
    if (!oldPi.customer || !oldPi.payment_method) {
      return NextResponse.json({ error: "Could not retrieve payment method from previous transaction" }, { status: 400 });
    }

    // 4. Create new PaymentIntent for the upsell (One-Click)
    const offer = strategy.upsell_offer;
    const product = strategy.upsell_product;
    const amount = offer ? offer.price : product.price;
    const currency = offer ? offer.currency : product.currency;

    // 4.1 Fetch previous sale to get customer details (Name, Email, Phone)
    const { data: previousSale } = await supabase
      .from("sales")
      .select("customer_name, customer_email, customer_phone")
      .eq("stripe_payment_intent_id", previous_pi)
      .single();

    const newPi = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: oldPi.customer as string,
      payment_method: oldPi.payment_method as string,
      off_session: true,
      confirm: true,
      metadata: {
        strategy_id: strategy.id,
        parent_pi: previous_pi,
        product_id: product.id,
        is_upsell: "true",
        customer_name: previousSale?.customer_name || "",
        customer_email: previousSale?.customer_email || ""
      }
    });

    // 5. Record the sale in Supabase
    const { error: saleError } = await supabase.from("sales").insert({
      user_id: strategy.user_id,
      product_id: product.id,
      offer_id: offer?.id || null,
      stripe_payment_intent_id: newPi.id,
      stripe_customer_id: oldPi.customer as string,
      customer_name: previousSale?.customer_name || null,
      customer_email: previousSale?.customer_email || null,
      customer_phone: previousSale?.customer_phone || null,
      amount: amount,
      currency: currency,
      status: "succeeded", // Status que ativa o selo verde "APROVADO"
      is_orderbump: false
    });

    if (saleError) {
      console.error("Error recording upsell sale in database:", saleError);
    }

    return NextResponse.json({ success: true, pi: newPi.id });

  } catch (error: any) {
    console.error("Upsell purchase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
