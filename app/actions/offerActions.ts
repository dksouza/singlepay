"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateShortHash } from "@/lib/utils";

export async function createOffer(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  const name = formData.get("name") as string;
  const product_id = formData.get("product_id") as string;
  const currency = formData.get("currency") as string;
  const priceRaw = formData.get("price") as string;

  if (!name || !product_id || !priceRaw) {
    return { error: "Todos os campos são obrigatórios." };
  }

  const price = parseInt(priceRaw.replace(/\D/g, "")) / 100;
  const hash = generateShortHash(8);

  const { data, error } = await supabase
    .from("offers")
    .insert([
      {
        user_id: user.id,
        product_id,
        name,
        price,
        currency,
        hash,
      },
    ])
    .select();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/produtos/${product_id}`);
  return { success: true, data: data ? data[0] : null };
}

export async function getOffersByProductId(productId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offers:", error);
    return [];
  }

  return data;
}

export async function updateOffer(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const product_id = formData.get("product_id") as string;
  const currency = formData.get("currency") as string;
  const priceRaw = formData.get("price") as string;

  const price = parseInt(priceRaw.replace(/\D/g, "")) / 100;

  // Ensure hash exists for older offers
  const { data: existingOffer } = await supabase
    .from("offers")
    .select("hash")
    .eq("id", id)
    .single();

  const hash = existingOffer?.hash || generateShortHash(8);

  const { data, error } = await supabase
    .from("offers")
    .update({
      name,
      price,
      currency,
      hash,
    })
    .eq("id", id)
    .select();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/produtos/${product_id}`);
  return { success: true, data: data ? data[0] : null };
}

export async function deleteOffer(id: string, productId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("offers")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/produtos/${productId}`);
  return { success: true };
}
