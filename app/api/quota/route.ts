import { NextResponse } from "next/server";
import { getQuotaUsage } from "@/lib/quota";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const quota = await getQuotaUsage(supabase, user.id);
  return NextResponse.json(quota);
}
