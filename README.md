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

## Pembayaran (PayPal)

Halaman `/upgrade` punya tombol **PayPal** untuk aktivasi premium otomatis
(selain jalur kode aktivasi manual):

```
app/api/paypal/create-order   buat order PayPal (Orders v2)
app/api/paypal/capture-order  capture + verifikasi ke API PayPal → aktifkan premium
lib/paypal.ts                 helper OAuth + create/capture order (server-only)
components/PaypalCheckout.tsx tombol PayPal di client (load SDK resmi)
docs/sql/0002_paypal_payments.sql  tabel payments + fungsi grant_paid_premium
```

- Pembayaran diverifikasi di server (capture ke API PayPal), lalu premium
  diaktifkan lewat fungsi DB `grant_paid_premium` yang **hanya** bisa dipanggil
  service-role — pengguna tidak bisa mengaktifkan premium gratis.
- Idempoten terhadap `capture id` (tabel `payments`), jadi tidak ada double-credit.
- PayPal tidak mendukung IDR, jadi premium ditagih dalam USD (atur lewat env).
- Env yang dibutuhkan: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (lihat `.env.example`).

## Roadmap (belum diimplementasikan)

- Langganan berulang otomatis (PayPal Subscriptions)
- Mode multi-halaman (beberapa foto sekaligus)

---

> Catatan: demo lama FraudGuard yang sebelumnya ada di repo ini dipindah ke `docs/fraudguard-demo.md` (dokumentasi) dan `fraudguard_demo.html` (aplikasinya) — tidak terkait aplikasi Belajarin.
