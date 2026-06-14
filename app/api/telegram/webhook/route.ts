import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  answerCallbackQuery,
  settleMessage,
  escapeHtml,
  TELEGRAM_ADMIN_CHAT_ID,
  TELEGRAM_WEBHOOK_SECRET,
} from "@/lib/telegram";

export const runtime = "nodejs";

// Webhook Telegram: menerima callback tombol Setujui/Tolak dari admin.
export async function POST(req: Request) {
  // Validasi bahwa request benar-benar dari Telegram (secret token kita sendiri).
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!TELEGRAM_WEBHOOK_SECRET || secret !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const cb = update?.callback_query;
  if (!cb) {
    return NextResponse.json({ ok: true });
  }

  // Hanya admin (chat yang ditentukan) yang boleh menyetujui.
  if (String(cb.from?.id) !== String(TELEGRAM_ADMIN_CHAT_ID)) {
    await answerCallbackQuery(cb.id, "Kamu tidak berwenang.");
    return NextResponse.json({ ok: true });
  }

  const data: string = cb.data ?? "";
  const [action, id] = data.split(":");
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;

  if ((action !== "approve" && action !== "reject") || !id) {
    await answerCallbackQuery(cb.id);
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  try {
    if (action === "reject") {
      const { data: row } = await admin
        .from("manual_payments")
        .update({ status: "rejected", decided_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "pending")
        .select("sender_name")
        .maybeSingle();

      await answerCallbackQuery(cb.id, row ? "Ditolak." : "Sudah diproses.");
      if (row && chatId && messageId) {
        await settleMessage(
          chatId,
          messageId,
          `❌ <b>DITOLAK</b>\nPengirim: ${escapeHtml(row.sender_name)}\nID: <code>${id}</code>`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // action === "approve"
    const { data: row } = await admin
      .from("manual_payments")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("user_id, amount, duration_days, sender_name")
      .maybeSingle();

    if (!row) {
      await answerCallbackQuery(cb.id, "Sudah diproses sebelumnya.");
      return NextResponse.json({ ok: true });
    }

    const { data: premiumUntil, error } = await admin.rpc("grant_paid_premium", {
      p_user: row.user_id,
      p_provider: "manual_transfer",
      p_reference: id,
      p_days: row.duration_days,
      p_amount: row.amount,
      p_currency: "IDR",
    });

    if (error) {
      console.error("grant_paid_premium:", error);
      await answerCallbackQuery(cb.id, "Gagal mengaktifkan premium.");
      return NextResponse.json({ ok: true });
    }

    const until = premiumUntil
      ? new Date(premiumUntil as string).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-";

    await answerCallbackQuery(cb.id, "Premium aktif ✅");
    if (chatId && messageId) {
      await settleMessage(
        chatId,
        messageId,
        `✅ <b>DISETUJUI</b>\nPengirim: ${escapeHtml(row.sender_name)}\n` +
          `Premium aktif s/d <b>${until}</b>\nID: <code>${id}</code>`
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("telegram webhook:", err);
    await answerCallbackQuery(cb.id, "Terjadi kesalahan.");
    return NextResponse.json({ ok: true });
  }
}
