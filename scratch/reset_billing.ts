import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
  const { data, error } = await supabase.from("profiles").update({ next_billing_date: new Date().toISOString() }).neq("email", "admin@admin.com");
  console.log("Reset next_billing_date to today for all users.");
}
main();
