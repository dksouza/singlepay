"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return { success: "Verifique seu e-mail para confirmar o cadastro!" };
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
    .select("status, is_admin")
    .eq("id", user.id)
    .single();

  return {
    status: profile?.status || 'pending',
    isAdmin: profile?.is_admin || false
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
