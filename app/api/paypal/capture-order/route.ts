import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  captureOrder,
  paypalConfigured,
  PREMIUM_DAYS,
  PREMIUM_PRICE,
  PREMIUM_CURRENCY,
} from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran PayPal belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId = typeof body?.orderID === "string" ? body.orderID.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "Order ID tidak ada." }, { status: 400 });
  }

  // Tangkap (capture) pembayaran langsung ke PayPal — ini titik kepercayaannya.
  let capture;
  try {
    capture = await captureOrder(orderId);
  } catch (err) {
    console.error("PayPal capture:", err);
    return NextResponse.json(
      { error: "Gagal memproses pembayaran. Coba lagi." },
      { status: 502 }
    );
  }

  const cap = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const amount = cap?.amount;
  const paidEnough =
    cap?.status === "COMPLETED" &&
    amount?.currency_code === PREMIUM_CURRENCY &&
    Number(amount?.value) >= Number(PREMIUM_PRICE);

  if (capture.status !== "COMPLETED" || !cap || !paidEnough) {
    return NextResponse.json(
      { error: "Pembayaran belum selesai atau nominalnya tidak sesuai." },
      { status: 402 }
    );
  }

  // Pembayaran terverifikasi → aktifkan premium lewat fungsi DB yang hanya
  // bisa dipanggil service-role (idempoten terhadap capture id yang sama).
  const admin = createAdminClient();
  const { data: premiumUntil, error } = await admin.rpc("grant_paid_premium", {
    p_user: user.id,
    p_provider: "paypal",
    p_reference: cap.id,
    p_days: PREMIUM_DAYS,
    p_amount: Number(amount!.value),
    p_currency: amount!.currency_code,
  });

  if (error) {
    console.error("grant_paid_premium:", error);
    return NextResponse.json(
      {
        error:
          "Pembayaran berhasil, tetapi premium gagal diaktifkan otomatis. Hubungi admin dengan ID transaksi: " +
          cap.id,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ premium_until: premiumUntil });
}
