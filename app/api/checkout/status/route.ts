import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id");

  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment_id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    
    // We search the sales table for this payment intent
    const { data: sale, error } = await supabase
      .from("sales")
      .select("status")
      .eq("stripe_payment_intent_id", paymentId)
      .limit(1)
      .single();

    if (error || !sale) {
      return NextResponse.json({ status: "pending" }); // If not found, assume still processing
    }

    return NextResponse.json({ status: sale.status });

  } catch (error: any) {
    console.error("[STATUS-API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
