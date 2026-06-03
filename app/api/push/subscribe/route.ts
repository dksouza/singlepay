import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth_token: keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("[PUSH] Failed to save subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
