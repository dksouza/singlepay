"use server";

import { createClient } from "../../lib/supabase/server";

export async function getDashboardData(period: string = "total") {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
  }

  const { data: sales, error: salesError } = await query;

  if (salesError) {
    console.error("Error fetching sales for dashboard:", salesError);
  }

  // 2. Fetch Products Count
  const { count: productsCount, error: productsError } = await supabase
    .from("products")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id);

  // 3. Fetch Checkouts Count
  const { count: checkoutsCount, error: checkoutsError } = await supabase
    .from("checkouts")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id);

  const successfulSales = sales?.filter(s => s.status === 'succeeded') || [];
  const pendingSales = sales?.filter(s => s.status === 'pending') || [];

  // Group successful sales by currency
  const totalsByCurrency = successfulSales.reduce((acc, s) => {
    const curr = (s.currency || "BRL").toUpperCase();
    acc[curr] = (acc[curr] || 0) + Number(s.amount);
    return acc;
  }, {} as Record<string, number>);

  // Group pending sales by currency
  const pendingByCurrency = pendingSales.reduce((acc, s) => {
    const curr = (s.currency || "BRL").toUpperCase();
    acc[curr] = (acc[curr] || 0) + Number(s.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalSalesCount = successfulSales.length;
  const abandonedCount = pendingSales.length;

  const totalSalesValueBRL = totalsByCurrency["BRL"] || 0;
  const totalSalesValueUSD = totalsByCurrency["USD"] || 0;
  const pendingSalesValueBRL = pendingByCurrency["BRL"] || 0;
  const pendingSalesValueUSD = pendingByCurrency["USD"] || 0;

  const averageTicket = totalSalesCount > 0 ? (totalSalesValueBRL + (totalSalesValueUSD * 5)) / totalSalesCount : 0; // Rough conversion for ticket average if mixed

  // 4. Prepare Chart Data (Sales by period)
  // We'll return the last 7 days or similar based on period
  const chartData = successfulSales.reduce((acc, s) => {
    const date = new Date(s.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.value += Number(s.amount);
    } else {
      acc.push({ date, value: Number(s.amount) });
    }
    return acc;
  }, [] as { date: string, value: number }[]).slice(-10); // Last 10 points

  return {
    totalSalesValueBRL,
    totalSalesValueUSD,
    pendingSalesValueBRL,
    pendingSalesValueUSD,
    totalSalesCount,
    productsCount: productsCount || 0,
    checkoutsCount: checkoutsCount || 0,
    abandonedCount,
    averageTicket,
    chartData: chartData.sort((a, b) => a.date.localeCompare(b.date))
  };
}
