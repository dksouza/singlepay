import { getBillingInfo } from "../actions/billingActions";
import BillingClient from "./BillingClient";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const billingData = await getBillingInfo();

  if (!billingData) {
    return <div>Erro ao carregar informações de cobrança.</div>;
  }

  return <BillingClient initialData={billingData} />;
}
