import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
  const { data, error } = await supabase.from("sales").select("user_id, platform_fee, is_fee_billed, status");
  console.log("Sales data:", data, error);
}
main();
