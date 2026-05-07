import { createClient } from "./lib/supabase/server";

async function check() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stripe_configs").select("*");
  console.log(JSON.stringify(data, null, 2));
}
check();
