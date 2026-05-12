"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateShortHash } from "@/lib/utils";

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

  // 1. Insert product into database
  const { data: productData, error: productError } = await supabase
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
    .select()
    .single();

  if (productError || !productData) {
    return { error: productError?.message || "Erro ao criar produto" };
  }

  const productId = productData.id;

  // 2. Automatically create "Checkout Principal"
  const checkoutHash = generateShortHash(8);
  const { error: checkoutError } = await supabase
    .from("checkouts")
    .insert([
      {
        user_id: user.id,
        product_id: productId,
        title: "Checkout Principal",
        payment_type: "single",
        hash: checkoutHash,
        is_active: true,
      },
    ]);

  if (checkoutError) {
    console.error("[AUTO-CHECKOUT] Erro ao criar checkout automático:", checkoutError);
  }

  // 3. Automatically create "Oferta Principal"
  const offerHash = generateShortHash(8);
  const { error: offerError } = await supabase
    .from("offers")
    .insert([
      {
        user_id: user.id,
        product_id: productId,
        name: "Oferta Principal",
        price: price,
        currency: currency,
        hash: offerHash,
        is_active: true,
      },
    ]);

  if (offerError) {
    console.error("[AUTO-OFFER] Erro ao criar oferta automática:", offerError);
  }

  revalidatePath("/produtos");
  return { success: true, data: productData };
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

export async function getProductById(productId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return data;
}

export async function deleteProduct(productId: string, imageUrl: string | null) {
  const supabase = await createClient();

  // 0. Check for REAL sales first
  const { count: salesCount } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  if (salesCount && salesCount > 0) {
    return { error: "Este produto não pode ser excluído porque já possui vendas registradas." };
  }

  // 1. Manually cascade delete associated entities
  try {
    // a. Find all offers for this product
    const { data: productOffers } = await supabase
      .from("offers")
      .select("id")
      .eq("product_id", productId);
    
    const offerIds = productOffers?.map(o => o.id) || [];

    // b. Delete Orderbumps where this product IS the main product OR its offers are used as bumps
    await supabase.from("orderbumps").delete().eq("product_id", productId);
    await supabase.from("orderbumps").delete().eq("bump_product_id", productId);
    if (offerIds.length > 0) {
      await supabase.from("orderbumps").delete().in("bump_offer_id", offerIds);
    }
    
    // c. Delete Checkouts
    await supabase.from("checkouts").delete().eq("product_id", productId);
    
    // d. Delete Offers
    await supabase.from("offers").delete().eq("product_id", productId);

    // e. Delete Upsell Strategies where this product is the main product OR the upsell target
    await supabase.from("upsell_strategies").delete().eq("product_id", productId);
    await supabase.from("upsell_strategies").delete().eq("upsell_product_id", productId);
    if (offerIds.length > 0) {
      await supabase.from("upsell_strategies").delete().in("upsell_offer_id", offerIds);
    }

    // f. Finally delete the Product
    const { error: dbError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (dbError) {
      console.error("[DELETE-PRODUCT] Final delete error:", dbError);
      return { error: dbError.message };
    }
  } catch (err: any) {
    console.error("[DELETE-PRODUCT] Cleanup exception:", err);
    return { error: "Erro interno ao realizar limpeza de dados vinculados ao produto." };
  }

  // 2. Delete from Storage
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
