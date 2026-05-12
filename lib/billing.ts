import { createClient } from "./supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Calculates the platform fee for a given user and amount.
 * Admin accounts are exempt (0% fee).
 */
export async function calculatePlatformFee(userId: string, amount: number) {
  // Use service role to ensure we can read the profile even in public contexts
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, fee_percentage")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("[BILLING] Error fetching profile for fee calculation:", error);
    return 0;
  }

  // Admins don't pay fees
  if (profile.is_admin) {
    return 0;
  }

  const feePercentage = profile.fee_percentage || 4.9;
  return Number((amount * (Number(feePercentage) / 100)).toFixed(2));
}

/**
 * Plan definitions and their corresponding fees
 */
export const BILLING_PLANS = {
  standard: {
    name: "Standard",
    price: 0,
    fee: 4.9,
    description: "Plano básico com taxa padrão"
  },
  pro: {
    name: "Pro",
    price: 147.90,
    fee: 3.9,
    description: "Taxa reduzida para quem está crescendo"
  },
  elite: {
    name: "Elite",
    price: 479.90,
    fee: 2.9,
    description: "A menor taxa para grandes operações"
  }
};
