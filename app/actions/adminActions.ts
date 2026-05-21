"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

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

export async function getUserDetailsForAdmin(userId: string) {
  const supabase = await createClient();
  
  // Verify if current user is admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Não autorizado" };

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", currentUser.id)
    .single();

  if (!adminProfile?.is_admin) return { error: "Acesso restrito" };

  const { data: userProfile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !userProfile) return { error: "Usuário não encontrado" };

  let hasCard = false;
  let cardLast4 = null;
  let cardBrand = null;

  if (userProfile.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2023-10-16",
      } as any);
      const paymentMethods = await stripe.paymentMethods.list({
        customer: userProfile.stripe_customer_id,
        type: "card",
      });
      if (paymentMethods.data.length > 0) {
        hasCard = true;
        cardLast4 = paymentMethods.data[0].card?.last4;
        cardBrand = paymentMethods.data[0].card?.brand;
      }
    } catch (err) {
      console.error("Error fetching card info for admin:", err);
    }
  }

  // Calculate unbilled platform fees
  const { data: unbilledSales } = await supabase
    .from("sales")
    .select("platform_fee")
    .eq("user_id", userId)
    .eq("is_fee_billed", false)
    .eq("status", "succeeded");

  const pendingFees = unbilledSales?.reduce((acc, s) => acc + (Number(s.platform_fee) || 0), 0) || 0;

  // Check if there are failed charges in history
  const { data: failedCharges } = await supabase
    .from("billing_history")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1);

  const isInadimplente = failedCharges && failedCharges.length > 0;

  return {
    success: true,
    details: {
      profile: userProfile,
      hasCard,
      cardLast4,
      cardBrand,
      pendingFees,
      isInadimplente
    }
  };
}

export async function updateUserFee(userId: string, feePercentage: number) {
  const supabase = await createClient();
  
  // Verify if current user is admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Não autorizado" };

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", currentUser.id)
    .single();

  if (!adminProfile?.is_admin) return { error: "Acesso restrito" };

  const { error } = await supabase
    .from("profiles")
    .update({ fee_percentage: feePercentage })
    .eq("id", userId);

  if (error) return { error: error.message };
  
  return { success: true };
}
