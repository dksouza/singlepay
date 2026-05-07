import { createClient } from "./lib/supabase/server";

async function inspect() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales").select("*");
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
inspect();
