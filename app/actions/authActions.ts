"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.singlepay.com.br'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUserStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, is_admin, stripe_customer_id, billing_failed_attempts")
    .eq("id", user.id)
    .single();

  let hasValidCard = false;
  if (profile?.is_admin) {
    hasValidCard = true;
  } else if (profile?.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2023-10-16",
      } as any);
      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
      });
      hasValidCard = paymentMethods.data.length > 0;
    } catch (err) {
      console.error("[AuthActions] Error fetching seller card:", err);
    }
  }

  return {
    status: profile?.status || 'pending',
    isAdmin: profile?.is_admin || false,
    hasValidCard,
    isBlockedByBilling: (profile?.billing_failed_attempts || 0) >= 3
  };
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const oldPassword = formData.get("old_password") as string;
  const newPassword = formData.get("new_password") as string;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Não autenticado" };

  // Verify old password by re-authenticating
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (signInError) {
    return { error: "Senha antiga incorreta." };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: "Senha alterada com sucesso!" };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const checkout_head_scripts = formData.get("checkout_head_scripts") as string;

  console.log(`[UPDATE-PROFILE] Usando UPSERT para o usuário: ${user.id}`);
  
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      checkout_head_scripts,
      email: user.email // Garante que o e-mail esteja lá caso seja um novo registro
    })
    .select();

  if (error) {
    console.error("[UPDATE-PROFILE] Erro do Supabase:", error);
    return { error: error.message };
  }

  console.log("[UPDATE-PROFILE] Sucesso ao salvar perfil.");

  revalidatePath("/configuracoes");
  return { success: "Configurações atualizadas com sucesso!" };
}
