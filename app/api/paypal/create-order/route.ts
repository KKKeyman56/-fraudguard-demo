import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrder, paypalConfigured } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST() {
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

  try {
    const order = await createOrder();
    return NextResponse.json({ id: order.id });
  } catch (err) {
    console.error("PayPal create-order:", err);
    return NextResponse.json(
      { error: "Gagal membuat order PayPal. Coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}
