"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveStripeConfig(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const secret_key = (formData.get("secret_key") as string || "").trim();
  const publishable_key = (formData.get("publishable_key") as string || "").trim();
  const webhook_secret = (formData.get("webhook_secret") as string || "").trim();

  const { error } = await supabase
    .from("stripe_configs")
    .upsert({
      user_id: user.id,
      secret_key,
      publishable_key,
      webhook_secret: webhook_secret || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Erro ao salvar config Stripe:", error);
    return { error: error.message };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

export async function getStripeConfig() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("stripe_configs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is 'no rows returned'
    console.error("Error fetching stripe config:", error);
    return null;
  }

  return data;
}
