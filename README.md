# Belajarin — Foto Soal, Paham Caranya

SaaS asisten belajar berbasis AI. Pelajar memfoto soal/tugas sekolah, AI (Claude vision) menganalisis dan menghasilkan **panduan belajar** dalam bentuk PDF — bukan jawaban siap kumpul.

Setiap panduan berisi:

1. **Transkripsi soal** yang terdeteksi dari foto
2. **Konsep kunci** yang dijelaskan dengan bahasa sederhana
3. **Langkah pengerjaan** untuk soal asli — tanpa jawaban akhir, dengan petunjuk self-check
4. **Contoh soal serupa** (angka berbeda) yang dibahas tuntas sebagai model
5. **Latihan mandiri** + kunci jawaban singkat
6. **Tips** dan kesalahan umum

## Arsitektur

```
app/page.tsx              UI upload foto + preview hasil (client component)
app/api/analyze/route.ts  Foto → Claude (vision + structured output) → JSON StudyGuide
app/api/pdf/route.ts      JSON StudyGuide → PDF (@react-pdf/renderer)
lib/schema.ts             Zod schema StudyGuide (dipakai API + structured output)
lib/pdf.tsx               Template dokumen PDF
```

- **Model:** Llama 4 Maverick via **Groq** (`meta-llama/llama-4-maverick-17b-128e-instruct`, bisa diganti lewat env `GROQ_MODEL`). Output JSON divalidasi dengan Zod; kalau meleset dari schema, ada satu kali retry otomatis dengan feedback error.
- **Vision:** foto dikirim sebagai data-URL base64. Browser mengompres foto dulu (maks 1568px, JPEG 85%) karena Groq membatasi gambar base64 ±4 MB.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi GROQ_API_KEY (gratis di console.groq.com/keys)
npm run dev
```

Buka http://localhost:3000.

## Deploy

Siap di-deploy ke Vercel. Set environment variable `GROQ_API_KEY` di project settings. Route `analyze` butuh `maxDuration` tinggi (sudah diset 120 detik) karena analisis bisa memakan waktu.

## Pembayaran (transfer bank + konfirmasi Telegram)

Halaman `/upgrade` memakai transfer bank manual dengan konfirmasi lewat bot
Telegram (selain jalur kode aktivasi):

```
components/BankTransfer.tsx        form: info rekening + upload bukti transfer
app/api/payment/submit             simpan pesanan 'pending' + kirim bukti ke admin via Telegram
app/api/telegram/webhook           terima tombol Setujui/Tolak → aktifkan premium
lib/telegram.ts                    helper bot Telegram (server-only)
docs/sql/0003_manual_payments.sql  tabel manual_payments (alur approval)
docs/sql/0002_paypal_payments.sql  tabel payments + fungsi grant_paid_premium (dipakai ulang)
```

Alur:

1. User transfer ke rekening, lalu unggah bukti + nama pengirim di website.
2. Server menyimpan pesanan berstatus `pending` dan mengirim foto bukti ke admin
   lewat bot Telegram dengan tombol **✅ Setujui / ❌ Tolak**.
3. Admin menekan **Setujui** → webhook memverifikasi pengirimnya admin (cek chat id
   + secret token), lalu mengaktifkan premium lewat `grant_paid_premium`
   (idempoten, menumpuk seperti redeem kode).

### Menyiapkan bot Telegram

1. Buat bot di [@BotFather](https://t.me/BotFather) → dapat `TELEGRAM_BOT_TOKEN`.
2. Ambil chat id admin dari [@userinfobot](https://t.me/userinfobot) →
   `TELEGRAM_ADMIN_CHAT_ID`.
3. Buat `TELEGRAM_WEBHOOK_SECRET` bebas (mis. `openssl rand -hex 16`).
4. Daftarkan webhook (sekali, setelah deploy):

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<domain>/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

Env yang dibutuhkan: `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, plus info rekening
`NEXT_PUBLIC_BANK_*` (lihat `.env.example`).

## Roadmap (belum diimplementasikan)

- Auto-match nominal unik supaya konfirmasi makin cepat
- Mode multi-halaman (beberapa foto sekaligus)

---

> Catatan: demo lama FraudGuard yang sebelumnya ada di repo ini dipindah ke `docs/fraudguard-demo.md` (dokumentasi) dan `fraudguard_demo.html` (aplikasinya) — tidak terkait aplikasi Belajarin.
