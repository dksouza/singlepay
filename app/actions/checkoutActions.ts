"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateShortHash } from "../../lib/utils";

export async function createCheckout(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Usuário não autenticado" };
  }

  const title = formData.get("title") as string;
  const product_id = formData.get("product_id") as string;
  const payment_type = formData.get("payment_type") as string;

  if (!title || !product_id) {
    return { error: "Título e produto são obrigatórios" };
  }

  // Generate a unique short hash (e.g., 8 characters)
  const hash = generateShortHash(8);

  const { data, error } = await supabase
    .from("checkouts")
    .insert([
      {
        user_id: user.id,
        product_id,
        title,
        payment_type,
        hash,
        is_active: true,
        back_redirect: formData.get("back_redirect") as string || null,
      },
    ])
    .select();

  if (error) {
    console.error("Erro ao criar checkout:", error);
    return { error: error.message };
  }

  revalidatePath("/produtos/[id]", "page");
  return { success: true, data: data ? data[0] : null };
}

export async function getCheckouts() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("checkouts")
    .select(`
      *,
      products (
        name,
        price,
        currency
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching checkouts:", error);
    return [];
  }

  return data;
}

export async function getCheckoutsByProductId(productId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("checkouts")
    .select(`
      *,
      products (
        name,
        price,
        currency
      )
    `)
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching checkouts by product ID:", error);
    return [];
  }

  return data;
}

export async function deleteCheckout(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("checkouts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir checkout:", error);
    return { error: error.message };
  }

  revalidatePath("/produtos/[id]", "page");
  return { success: true };
}

export async function updateCheckout(id: string, formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const product_id = formData.get("product_id") as string;
  const payment_type = formData.get("payment_type") as string;

  const { data, error } = await supabase
    .from("checkouts")
    .update({
      title,
      product_id,
      payment_type,
      back_redirect: formData.get("back_redirect") as string || null,
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Erro ao atualizar checkout:", error);
    return { error: error.message };
  }

  revalidatePath("/produtos/[id]", "page");
  return { success: true, data: data ? data[0] : null };
}

export async function getCheckoutByHash(hash: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("checkouts")
    .select(`
      *,
      products (
        name,
        price,
        currency,
        image_url,
        description
      )
    `)
    .eq("hash", hash)
    .single();

  if (error) {
    console.error("Error fetching checkout by hash:", error);
    return null;
  }

  return data;
}


export async function toggleCheckoutStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("checkouts")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/produtos/[id]", "page");
  return { success: true };
}
