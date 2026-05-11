"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveUtmifyConfig(apiToken: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("utmify_configs")
    .upsert({
      user_id: user.id,
      api_token: apiToken.trim(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Erro ao salvar config Utmify:", error);
    return { error: error.message };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

export async function getUtmifyConfig() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("utmify_configs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching utmify config:", error);
    return null;
  }

  return data;
}
