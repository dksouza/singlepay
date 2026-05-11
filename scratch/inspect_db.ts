
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function inspectSchema() {
  // We can't directly inspect schema without SQL, but we can try to fetch a record and see keys
  const { data, error } = await supabase.from("sales").select("*").limit(1);
  if (error) {
    console.error("Error fetching sale:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in sales table:", Object.keys(data[0]));
  } else {
    console.log("No records in sales table to inspect.");
  }
}

inspectSchema();
