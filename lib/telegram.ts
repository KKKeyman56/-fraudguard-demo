// Helper bot Telegram (server-only). Token & chat admin dari env.
//
// Bot dipakai untuk: (1) mengirim notif bukti transfer ke admin dengan tombol
// Setujui/Tolak, (2) menerima callback tombol lewat webhook.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

export function telegramConfigured(): boolean {
  return !!(TOKEN && TELEGRAM_ADMIN_CHAT_ID);
}

function api(method: string) {
  return `https://api.telegram.org/bot${TOKEN}/${method}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Kirim foto bukti transfer ke admin + tombol Setujui/Tolak.
export async function sendProofToAdmin(opts: {
  id: string;
  email: string | null;
  amount: number;
  senderName: string;
  proof: File;
}): Promise<void> {
  const caption =
    `🧾 <b>Pembayaran baru</b>\n` +
    `Email: <code>${escapeHtml(opts.email ?? "-")}</code>\n` +
    `Nama pengirim: <b>${escapeHtml(opts.senderName)}</b>\n` +
    `Nominal: <b>Rp ${opts.amount.toLocaleString("id-ID")}</b>\n` +
    `ID: <code>${opts.id}</code>`;

  const form = new FormData();
  form.append("chat_id", TELEGRAM_ADMIN_CHAT_ID);
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  form.append(
    "reply_markup",
    JSON.stringify({
      inline_keyboard: [
        [
          { text: "✅ Setujui", callback_data: `approve:${opts.id}` },
          { text: "❌ Tolak", callback_data: `reject:${opts.id}` },
        ],
      ],
    })
  );
  form.append("photo", opts.proof, opts.proof.name || "bukti.jpg");

  const res = await fetch(api("sendPhoto"), { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Telegram sendPhoto gagal: ${res.status} ${await res.text()}`);
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await fetch(api("answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch(() => {});
}

// Ganti caption & hapus tombol setelah diputuskan.
export async function settleMessage(
  chatId: number | string,
  messageId: number,
  caption: string
): Promise<void> {
  await fetch(api("editMessageCaption"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    }),
  }).catch(() => {});
}

export { escapeHtml };
