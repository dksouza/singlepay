"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Usuário não autenticado." };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const currency = formData.get("currency") as string;
  const priceRaw = formData.get("price") as string;
  const delivery_link = formData.get("delivery_link") as string;
  const image_file = formData.get("image") as File;

  // Simple price parsing (treats input as cents and converts to decimal)
  const price = parseInt(priceRaw.replace(/\D/g, "")) / 100;

  let image_url = "";

  // Handle image upload to Supabase Storage if provided
  if (image_file && image_file instanceof File && image_file.size > 0) {
    try {
      const fileExt = image_file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await image_file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`[STORAGE] Iniciando upload: ${filePath}, tipo: ${image_file.type}`);

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, buffer, {
          contentType: image_file.type,
          upsert: true
        });

      if (uploadError) {
        console.error("[STORAGE] Erro no upload:", uploadError);
        return { error: `Erro no upload da imagem: ${uploadError.message}` };
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        image_url = publicUrl;
        console.log("[STORAGE] Upload sucesso:", image_url);
      }
    } catch (err: any) {
      console.error("[STORAGE] Exceção:", err);
      return { error: `Falha ao processar imagem: ${err.message}` };
    }
  }

  // Insert product into database
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        user_id: user.id,
        name,
        description,
        currency,
        price,
        delivery_link,
        image_url,
        status: "Ativo",
      },
    ])
    .select();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/produtos");
  return { success: true, data: data ? data[0] : null };
}

export async function getProducts() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data;
}

export async function deleteProduct(productId: string, imageUrl: string | null) {
  const supabase = await createClient();

  // 1. Delete from Database
  const { error: dbError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (dbError) {
    return { error: dbError.message };
  }

  // 2. Delete from Storage (if it's a real product image, not a placeholder)
  if (imageUrl && imageUrl.includes("supabase.co/storage/v1/object/public/products/")) {
    const path = imageUrl.split("/products/")[1];
    if (path) {
      const { error: storageError } = await supabase.storage
        .from("products")
        .remove([path]);
      
      if (storageError) {
        console.error("Error deleting image from storage:", storageError);
      }
    }
  }

  revalidatePath("/produtos");
  return { success: true };
}

export async function updateProduct(productId: string, formData: FormData, oldImageUrl: string | null) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado." };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const currency = formData.get("currency") as string;
  const priceRaw = formData.get("price") as string;
  const delivery_link = formData.get("delivery_link") as string;
  const image_file = formData.get("image") as File;

  const price = parseInt(priceRaw.replace(/\D/g, "")) / 100;
  let image_url = oldImageUrl;

  // Handle new image upload
  if (image_file && image_file instanceof File && image_file.size > 0) {
    try {
      // Delete old image if it exists and is not placeholder
      if (oldImageUrl && oldImageUrl.includes("supabase.co/storage/v1/object/public/products/")) {
        const oldPath = oldImageUrl.split("/products/")[1];
        if (oldPath) await supabase.storage.from("products").remove([oldPath]);
      }

      const fileExt = image_file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await image_file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`[STORAGE-UPDATE] Iniciando upload: ${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, buffer, {
          contentType: image_file.type,
          upsert: true
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);
        image_url = publicUrl;
        console.log("[STORAGE-UPDATE] Sucesso:", image_url);
      } else {
        console.error("[STORAGE-UPDATE] Erro no upload:", uploadError);
        return { error: `Erro ao atualizar imagem: ${uploadError.message}` };
      }
    } catch (err: any) {
      console.error("[STORAGE-UPDATE] Exceção:", err);
      return { error: `Falha ao processar nova imagem: ${err.message}` };
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      description,
      currency,
      price,
      delivery_link,
      image_url,
    })
    .eq("id", productId)
    .select();

  if (error) return { error: error.message };

  revalidatePath("/produtos");
  return { success: true, data: data[0] };
}
