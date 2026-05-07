"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPendingUsers() {
  const supabase = await createClient();
  
  // Verify if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Acesso restrito a administradores" };

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_admin", false)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { users };
}

export async function approveUser(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", userId);

  if (error) return { error: error.message };
  
  revalidatePath("/admin/aprovacoes");
  return { success: true };
}

export async function rejectUser(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "blocked" })
    .eq("id", userId);

  if (error) return { error: error.message };
  
  revalidatePath("/admin/aprovacoes");
  return { success: true };
}
