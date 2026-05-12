import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { calculatePlatformFee } from "../../../lib/billing";


export async function POST(req: Request) {
  try {
    const { strategy_id, previous_pi } = await req.json();
    console.log("Upsell Purchase Attempt:", { strategy_id, previous_pi });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!previous_pi) {
      return NextResponse.json({ error: "Contexto da transação anterior ausente (parâmetro pi)" }, { status: 400 });
    }

    // 1. Get Strategy and related info
    const { data: strategy, error: strategyError } = await supabase
      .from("upsell_strategies")
      .select(`
        *,
        upsell_offer:upsell_offer_id(*),
        upsell_product:upsell_product_id(*)
      `)
      .eq("id", strategy_id)
      .single();

    if (strategyError || !strategy) {
      console.error("Strategy fetch error:", strategyError);
      return NextResponse.json({ error: "Estratégia de Upsell não encontrada" }, { status: 404 });
    }

    // 2. Get the seller's Stripe config
    const { data: stripeConfig, error: configError } = await supabase
      .from("stripe_configs")
      .select("*")
      .eq("user_id", strategy.user_id)
      .single();

    if (configError || !stripeConfig) {
      console.error("Stripe config fetch error:", configError);
      return NextResponse.json({ error: "Configuração Stripe do vendedor não encontrada" }, { status: 400 });
    }

    const stripe = new Stripe(stripeConfig.secret_key.trim(), {});

    // 3. Retrieve the previous PaymentIntent to get customer and payment method
    console.log("Retrieving previous PI from Stripe:", previous_pi);
    const oldPi = await stripe.paymentIntents.retrieve(previous_pi);

    // Suporte para payment_method como objeto ou string
    const pmId = typeof oldPi.payment_method === 'string'
      ? oldPi.payment_method
      : (oldPi.payment_method as any)?.id;

    if (!oldPi.customer || !pmId) {
      console.error("Missing customer or PM in old PI:", { customer: oldPi.customer, pm: pmId });
      return NextResponse.json({ error: "Não foi possível recuperar o método de pagamento da transação anterior (Cliente ou Cartão ausente no Stripe)" }, { status: 400 });
    }

    // 4. Create new PaymentIntent for the upsell (One-Click)
    const offer = strategy.upsell_offer;
    const product = strategy.upsell_product;
    const amount = offer ? offer.price : product.price;
    const currency = offer ? offer.currency : product.currency;

    console.log("Creating Upsell PI for amount:", amount, currency);

    // 4.1 Fetch previous sale to get customer details
    const { data: previousSale } = await supabase
      .from("sales")
      .select("customer_name, customer_email, customer_phone")
      .eq("stripe_payment_intent_id", previous_pi)
      .maybeSingle();

    const newPi = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: oldPi.customer as string,
      payment_method: pmId,
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

    console.log("Upsell Success! New PI:", newPi.id);

    const platformFee = await calculatePlatformFee(strategy.user_id, amount);

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
      platform_fee: platformFee,
      status: "succeeded",
      is_orderbump: false
    });

    if (saleError) console.error("Error recording upsell sale:", saleError);

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
