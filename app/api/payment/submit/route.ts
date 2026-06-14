import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProofToAdmin, telegramConfigured } from "@/lib/telegram";

export const runtime = "nodejs";

const PRICE_IDR = Math.max(
  1000,
  Number(process.env.PREMIUM_PRICE_IDR ?? "25000") || 25000
);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Form tidak valid." }, { status: 400 });
  }

  const senderName = String(form.get("sender_name") ?? "").trim();
  const amount = Math.round(Number(form.get("amount") ?? PRICE_IDR) || PRICE_IDR);
  const proof = form.get("proof");

  if (!senderName) {
    return NextResponse.json(
      { error: "Isi nama pengirim transfer." },
      { status: 400 }
    );
  }
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json(
      { error: "Lampirkan bukti transfer." },
      { status: 400 }
    );
  }
  if (proof.size > MAX_PROOF_BYTES) {
    return NextResponse.json(
      { error: "Bukti transfer maksimal 5 MB." },
      { status: 413 }
    );
  }
  if (!proof.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Bukti transfer harus berupa gambar." },
      { status: 400 }
    );
  }

  // Catat pesanan sebagai 'pending'.
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("manual_payments")
    .insert({
      user_id: user.id,
      user_email: user.email,
      amount,
      sender_name: senderName,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("manual_payments insert:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pesanan. Coba lagi." },
      { status: 500 }
    );
  }

  // Kirim bukti ke admin lewat Telegram (kalau dikonfigurasi).
  if (telegramConfigured()) {
    try {
      await sendProofToAdmin({
        id: row.id,
        email: user.email ?? null,
        amount,
        senderName,
        proof,
      });
    } catch (err) {
      console.error("telegram notify:", err);
      // Pesanan tetap tersimpan; admin masih bisa cek di dashboard Supabase.
    }
  }

  return NextResponse.json({ ok: true, id: row.id });
}
