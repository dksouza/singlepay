import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function getEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from("offers").select("*").limit(5);
  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log("Data sample:", JSON.stringify(data, null, 2));
  }
}

checkColumns();
