import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { error } = await supabase.rpc('run_sql', { sql_query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_valid_card BOOLEAN DEFAULT false;" });
  console.log("Error (if any):", error);
}
run();
