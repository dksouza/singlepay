import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://dikcphkrkjxspvpwxhwg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpa2NwaGtya2p4c3B2cHd4aHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjQ2MDcsImV4cCI6MjA5MzY0MDYwN30.Eh6P5QD1bnZ7mE5iBL6VVxVOEABI-M4HQdE13ZFPEhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: checkout, error } = await supabase
    .from("checkouts")
    .select("*, products (*)")
    .eq("hash", "xH55LWzw")
    .single();
  console.log(JSON.stringify(checkout, null, 2));
}
test();
