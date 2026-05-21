import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
  const { data, error } = await supabase.from("profiles").select("email, next_billing_date, billing_failed_attempts").limit(5);
  console.log("Profiles:", data, error);
}
main();
