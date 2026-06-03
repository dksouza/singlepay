import webpush from "web-push";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:admin@singlepay.com.br",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/vendas"
) {
  // Use service role to bypass RLS and read subscriptions
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    console.log(`[PUSH] No subscriptions for user ${userId}`);
    return;
  }

  const payload = JSON.stringify({ title, body, url, tag: "sale-notification" });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_token,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log(`[PUSH] Sent notification to endpoint: ${sub.endpoint.slice(0, 40)}...`);
      } catch (err: any) {
        // 404 or 410 means the subscription is expired/invalid → remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[PUSH] Subscription expired, removing: ${sub.id}`);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`[PUSH] Failed to send notification. Status:`, err.statusCode);
          console.error(`[PUSH] Error Body:`, err.body || err);
          throw err;
        }
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[PUSH] Sent ${sent}/${subscriptions.length} notifications to user ${userId}`);
}
