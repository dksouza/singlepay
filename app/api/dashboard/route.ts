import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "total";

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify if seller has a valid card
  let hasValidCard = false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, is_admin, billing_failed_attempts")
    .eq("id", user.id)
    .single();

  if (profile?.is_admin) {
    hasValidCard = true;
  } else if (profile?.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2023-10-16",
      } as any);
      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
      });
      hasValidCard = paymentMethods.data.length > 0;
    } catch (err) {
      console.error("[Dashboard] Error fetching seller card:", err);
    }
  }

  console.log(`[Dashboard API] User ID: ${user.id} | is_admin: ${profile?.is_admin} | stripe_customer_id: ${profile?.stripe_customer_id} | hasValidCard: ${hasValidCard}`);

  let query = supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id);

  // Time filtering logic
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    query = query.gte("created_at", today.toISOString());
  } else if (period === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    query = query.gte("created_at", yesterday.toISOString()).lt("created_at", today.toISOString());
  } else if (period === "7days") {
    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 7);
    query = query.gte("created_at", last7.toISOString());
  } else if (period === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.gte("created_at", monthStart.toISOString());
  } else if (period === "year") {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    query = query.gte("created_at", yearStart.toISOString());
  } else if (period.startsWith("custom_")) {
    const parts = period.split("_");
    if (parts.length === 3) {
      const startDate = new Date(parts[1] + "T00:00:00").toISOString();
      const endDate = new Date(parts[2] + "T23:59:59").toISOString();
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }
  }

  const { data: sales, error: salesError } = await query;

  if (salesError) {
    console.error("Error fetching sales for dashboard API:", salesError);
  }

  // 2. Fetch Products Count
  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id);

  // 3. Fetch Checkouts Count
  const { count: checkoutsCount } = await supabase
    .from("checkouts")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id);

  const successfulSales = sales?.filter(s => s.status === 'succeeded') || [];
  const pendingSales = sales?.filter(s => s.status === 'pending') || [];

  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove dots (thousands) and replace comma with dot (decimal)
    const normalized = val.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  };

  // Group successful sales by currency
  const totalsByCurrency = successfulSales.reduce((acc, s) => {
    const curr = (s.currency || "BRL").toUpperCase();
    acc[curr] = (acc[curr] || 0) + parseAmount(s.amount);
    return acc;
  }, {} as Record<string, number>);

  // Group pending sales by currency
  const pendingByCurrency = pendingSales.reduce((acc, s) => {
    const curr = (s.currency || "BRL").toUpperCase();
    acc[curr] = (acc[curr] || 0) + parseAmount(s.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalSalesCount = successfulSales.length;
  const abandonedCount = pendingSales.length;

  const totalSalesValueBRL = totalsByCurrency["BRL"] || 0;
  const totalSalesValueUSD = totalsByCurrency["USD"] || 0;
  const totalSalesValueEUR = totalsByCurrency["EUR"] || 0;
  const pendingSalesValueBRL = pendingByCurrency["BRL"] || 0;
  const pendingSalesValueUSD = pendingByCurrency["USD"] || 0;
  const pendingSalesValueEUR = pendingByCurrency["EUR"] || 0;

  const averageTicket = totalSalesCount > 0 ? (totalSalesValueBRL + (totalSalesValueUSD * 5) + (totalSalesValueEUR * 5.5)) / totalSalesCount : 0;

  // 4. Prepare Chart Data grouped by currency
  const chartDataMap = successfulSales.reduce((acc, s) => {
    const date = new Date(s.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
    const currency = (s.currency || "BRL").toUpperCase();
    const amount = parseAmount(s.amount);

    if (!acc[date]) {
      acc[date] = { date, BRL: 0, USD: 0, EUR: 0 };
    }

    if (currency === "BRL") acc[date].BRL += amount;
    else if (currency === "USD") acc[date].USD += amount;
    else if (currency === "EUR") acc[date].EUR += amount;

    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(chartDataMap).sort((a: any, b: any) => {
    // Basic date sort (DD/MM)
    const [dayA, monthA] = a.date.split('/').map(Number);
    const [dayB, monthB] = b.date.split('/').map(Number);
    if (monthA !== monthB) return monthA - monthB;
    return dayA - dayB;
  }).slice(-15);

  return NextResponse.json({
    totalSalesValueBRL,
    totalSalesValueUSD,
    totalSalesValueEUR,
    pendingSalesValueBRL,
    pendingSalesValueUSD,
    pendingSalesValueEUR,
    totalSalesCount,
    productsCount: productsCount || 0,
    checkoutsCount: checkoutsCount || 0,
    abandonedCount,
    averageTicket,
    chartData,
    hasValidCard,
    isBlockedByBilling: (profile?.billing_failed_attempts || 0) >= 3,
    billingFailedAttempts: profile?.billing_failed_attempts || 0
  });
}
