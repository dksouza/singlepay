import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Usando o cliente padrão do Supabase para garantir que a rota seja pública
    // e não sofra redirecionamentos do auth-helper
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch strategy with related product/offer data
    const { data, error } = await supabase
      .from("upsell_strategies")
      .select(`
        *,
        upsell_product:upsell_product_id(name, description, image_url, price, currency),
        upsell_offer:upsell_offer_id(name, price, currency)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return corsResponse({ error: error.message }, 404);
    }

    if (!data) {
      return corsResponse({ error: "Strategy not found" }, 404);
    }

    return corsResponse(data);
  } catch (err: any) {
    return corsResponse({ error: err.message }, 500);
  }
}

function corsResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
