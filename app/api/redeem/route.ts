import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Masukkan kode aktivasi." }, { status: 400 });
  }

  const { data: premiumUntil, error } = await supabase.rpc("redeem_activation_code", {
    p_code: code,
  });

  if (error) {
    if (/INVALID_CODE/.test(error.message)) {
      return NextResponse.json(
        { error: "Kode tidak valid atau sudah pernah dipakai." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menukarkan kode. Coba lagi sebentar lagi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ premium_until: premiumUntil });
}
