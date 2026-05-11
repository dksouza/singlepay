"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleUpsellStatus(id: string, currentStatus: boolean, productId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("upsell_strategies")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) {
    console.error("Error toggling upsell status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/produtos/${productId}`);
  return { success: true };
}
