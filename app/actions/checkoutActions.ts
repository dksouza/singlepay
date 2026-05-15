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
  const show_banner = formData.get("show_banner") === "true";
  const banner_file = formData.get("banner") as File;

  if (!title || !product_id) {
    return { error: "Título e produto são obrigatórios" };
  }

  let banner_url = "";

  // Handle banner upload
  if (banner_file && banner_file instanceof File && banner_file.size > 0) {
    try {
      const fileExt = "webp"; // We enforce webp via client-side conversion
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const arrayBuffer = await banner_file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('products') // Using products bucket for simplicity, or create a banners bucket
        .upload(filePath, buffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);
        banner_url = publicUrl;
      }
    } catch (err) {
      console.error("[BANNER-UPLOAD] Error:", err);
    }
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
        banner_url,
        show_banner
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

  // 1. Get checkout to find banner URL
  const { data: checkout } = await supabase.from("checkouts").select("banner_url").eq("id", id).single();

  // 2. Delete checkout
  const { error } = await supabase
    .from("checkouts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir checkout:", error);
    return { error: error.message };
  }

  // 3. Delete banner from storage if exists
  if (checkout?.banner_url && checkout.banner_url.includes("/banners/")) {
    const path = checkout.banner_url.split("/products/")[1];
    if (path) await supabase.storage.from("products").remove([path]);
  }

  revalidatePath("/produtos/[id]", "page");
  return { success: true };
}

export async function updateCheckout(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const title = formData.get("title") as string;
  const product_id = formData.get("product_id") as string;
  const payment_type = formData.get("payment_type") as string;
  const show_banner = formData.get("show_banner") === "true";
  const banner_file = formData.get("banner") as File;
  const old_banner_url = formData.get("old_banner_url") as string;

  let banner_url = old_banner_url;

  // Handle new banner upload
  if (banner_file && banner_file instanceof File && banner_file.size > 0) {
    try {
      // Delete old banner
      if (old_banner_url && old_banner_url.includes("/banners/")) {
        const oldPath = old_banner_url.split("/products/")[1];
        if (oldPath) await supabase.storage.from("products").remove([oldPath]);
      }

      const fileExt = "webp";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const arrayBuffer = await banner_file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, buffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);
        banner_url = publicUrl;
      }
    } catch (err) {
      console.error("[BANNER-UPDATE] Error:", err);
    }
  }

  const { data, error } = await supabase
    .from("checkouts")
    .update({
      title,
      product_id,
      payment_type,
      back_redirect: formData.get("back_redirect") as string || null,
      banner_url,
      show_banner
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
