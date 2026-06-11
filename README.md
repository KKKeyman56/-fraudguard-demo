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

- **Model:** `claude-opus-4-8` dengan adaptive thinking dan structured outputs (`zodOutputFormat`), sehingga respons AI dijamin valid terhadap schema.
- **Vision:** foto dikirim sebagai blok image base64 (JPEG/PNG/GIF/WebP, maks 20 MB).

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi ANTHROPIC_API_KEY
npm run dev
```

Buka http://localhost:3000.

## Deploy

Siap di-deploy ke Vercel. Set environment variable `ANTHROPIC_API_KEY` di project settings. Route `analyze` butuh `maxDuration` tinggi (sudah diset 120 detik) karena analisis bisa memakan waktu.

## Roadmap (belum diimplementasikan)

- Auth + riwayat panduan per user (Supabase)
- Kuota gratis + langganan (billing)
- Mode multi-halaman (beberapa foto sekaligus)

---

> Catatan: demo lama FraudGuard yang sebelumnya ada di repo ini dipindah ke `docs/fraudguard-demo.md` (dokumentasi) dan `fraudguard_demo.html` (aplikasinya) — tidak terkait aplikasi Belajarin.
