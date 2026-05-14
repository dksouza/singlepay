import { createClient } from "./lib/supabase/server";

async function main() {
  const supabase = await createClient();
  const { data: sales, error } = await supabase.from("sales").select("*").limit(1);
  if (error) {
    console.error("Error fetching sales:", error);
  } else {
    console.log("Sales column names:", Object.keys(sales[0] || {}));
  }
}

main();
