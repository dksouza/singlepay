import Stripe from "stripe";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load local environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("STRIPE_SECRET_KEY not found in env");
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get merchant user
  const { data: profiles, error: dbError } = await supabase
    .from("profiles")
    .select("id, email, stripe_customer_id, plan_id, fee_percentage");

  if (dbError || !profiles) {
    console.error("Error reading database profiles:", dbError);
    return;
  }

  // Let's print out all profiles
  console.log(`Found ${profiles.length} profiles in database:`);
  for (const prof of profiles) {
    console.log(`- User ID: ${prof.id}`);
    console.log(`  Email: ${prof.email}`);
    console.log(`  Stripe Customer: ${prof.stripe_customer_id}`);
    console.log(`  Plan ID: ${prof.plan_id}`);
    console.log(`  Fee: ${prof.fee_percentage}%`);

    if (prof.stripe_customer_id) {
      console.log(`  Checking subscriptions for customer ${prof.stripe_customer_id} in Stripe...`);
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      } as any);

      try {
        const list = await stripe.subscriptions.list({
          customer: prof.stripe_customer_id,
          status: "all"
        });

        console.log(`  Found ${list.data.length} subscriptions for this customer:`);
        for (const sub of list.data) {
          console.log(`  * Sub ID: ${sub.id}`);
          console.log(`    Status: ${sub.status}`);
          console.log(`    Product/Price: ${sub.items.data[0]?.price.id}`);
          console.log(`    Metadata:`, sub.metadata);
        }
      } catch (err: any) {
        console.error("  Error checking subscriptions:", err.message);
      }
    }
    console.log("-----------------------------------------");
  }
}

run();
