import { NextResponse } from "next/server";
import { updateSaleStatus } from "../../../actions/paymentActions";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("CajuPay-Signature") || "";

    // For production, we should validate the HMAC signature here
    // using crypto.createHmac('sha256', cajupayConfig.webhook_secret)
    
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { type, data } = payload;

    // The payment id can be the checkout_session_id (for cards/wallets) or the pix id
    const paymentId = data?.checkout_session_id || data?.id;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    const customerData = {
      name: data?.payer?.name || "Cliente CajuPay",
      email: data?.payer?.email || "",
      phone: data?.payer?.phone || "",
    };

    if (type === "checkout.payment.paid" || type === "pix.payment.paid") {
      await updateSaleStatus(paymentId, "succeeded", customerData, {});
      
      // Attempt to sync bumps if they share the same gateway_id
      // (Our backend updateSaleStatus currently updates ALL sales matching the stripe_payment_intent_id)
      
    } else if (type === "checkout.payment.refused" || type === "pix.payment.expired") {
      await updateSaleStatus(paymentId, "refused", customerData, {});
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[CAJUPAY WEBHOOK ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
