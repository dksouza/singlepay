import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import CheckoutPageClient from "./CheckoutPageClient";


interface PageProps {
  params: Promise<{ hash: string }>;
}

/**
 * PUBLIC CHECKOUT PAGE
 * 
 * Performance Optimized: This server component only fetches critical database data.
 * The Stripe PaymentIntent/Subscription creation is deferred to the client side via API
 * to ensure an ultra-fast TTFB (Time to First Byte).
 */
export default async function PublicCheckoutPage({ params }: PageProps) {
  const { hash } = await params;
  const supabase = await createClient();

  // ── 1. Fetch DB data in PARALLEL for maximum speed ──
  // We fetch checkout/offer and then use that result for the next set of parallel calls.
  
  // First, find the entity (checkout or offer)
  const { data: checkout, error: checkoutError } = await supabase
    .from("checkouts")
    .select("*, products (*)")
    .eq("hash", hash)
    .single();

  let finalProduct = checkout?.products;
  let finalCheckout = checkout;
  let userId = checkout?.user_id;
  let isOffer = false;

  if (checkoutError || !checkout) {
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("*, products (*)")
      .eq("hash", hash)
      .single();

    if (offerError || !offer) {
      notFound();
    }

    if (offer.is_active === false) {
      return renderError("Oferta desativada no momento");
    }

    isOffer = true;
    userId = offer.user_id;
    finalCheckout = {
      ...offer,
      title: offer.name,
      payment_type: "single",
    };
    finalProduct = {
      ...offer.products,
      price: offer.price,
      currency: offer.currency,
    };
  } else {
    if (checkout.is_active === false) {
      return renderError("Checkout desativado no momento");
    }
  }

  // Second, fetch Stripe config and Orderbumps in parallel
  const [stripeConfigResult, orderbumpsResult] = await Promise.all([
    supabase
      .from("stripe_configs")
      .select("publishable_key, has_active_setup:secret_key")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("orderbumps")
      .select(`
        *,
        bump_product:products!bump_product_id(*),
        bump_offer:offers!bump_offer_id(*)
      `)
      .eq("product_id", finalProduct.id)
      .neq("is_active", false)
      .order("order_index", { ascending: true }),
  ]);

  const stripeConfig = stripeConfigResult.data;
  const orderbumps = orderbumpsResult.data || [];

  if (!stripeConfig?.publishable_key) {
    return renderError("Este vendedor ainda não configurou o gateway de pagamento.");
  }

  // ── 2. Render Page — Stripe logic is now handled by the Client Component ──
  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', position: 'relative' }}>
      <CheckoutPageClient
        hash={hash}
        initialProduct={finalProduct}
        initialCheckout={finalCheckout}
        publishableKey={stripeConfig.publishable_key}
        orderbumps={orderbumps}
      />
    </div>
  );
}

function renderError(message: string) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 999999
    }}>
      <div style={{
        padding: '40px', border: '1px solid black',
        borderRadius: '12px', backgroundColor: 'white', textAlign: 'center'
      }}>
        <p style={{ color: 'black', fontSize: '18px', fontWeight: 'normal', margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
