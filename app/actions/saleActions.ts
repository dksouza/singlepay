"use server";

import { createClient } from "../../lib/supabase/server";

export async function getSales() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      *,
      products (
        name
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sales:", error);
    return [];
  }

  return sales;
}
