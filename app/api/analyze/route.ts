import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { StudyGuideSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// Groq rutin memensiunkan model (Maverick dihentikan Feb 2026). Kandidat dicoba
// berurutan; yang pertama berhasil di-cache supaya request berikutnya langsung pakai.
// Env GROQ_MODEL (kalau diset) selalu dicoba paling dulu.
const VISION_MODEL_CANDIDATES = [
  ...(process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : []),
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

let cachedModel: string | null = null;

function isModelGone(err: unknown): boolean {
  return (
    err instanceof Groq.APIError &&
    (err.status === 404 ||
      /model_not_found|model_decommissioned|does not exist/i.test(err.message))
  );
}

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

// Groq menolak request dengan gambar base64 > ~4 MB; base64 menggembungkan ~4/3,
// jadi batas file mentah aman di ~3 MB. Browser sudah mengompres sebelum upload.
const MAX_FILE_BYTES = 3 * 1024 * 1024;

const SYSTEM_PROMPT = `Kamu adalah tutor pribadi untuk pelajar Indonesia. Pengguna mengirim foto soal/tugas sekolah mereka.

Tugasmu: membuat panduan belajar yang membuat siswa MAMPU mengerjakan soalnya sendiri — bukan mengerjakan soal untuk mereka.

Aturan penting:
- Transkripsikan soal yang terbaca dari foto.
- Jelaskan konsep yang dibutuhkan dengan bahasa sederhana sesuai jenjang siswa.
- Untuk soal asli dari foto: berikan langkah-langkah cara mengerjakan, tetapi JANGAN sebutkan jawaban akhirnya. Akhiri dengan petunjuk agar siswa bisa mengecek sendiri apakah jawabannya masuk akal.
- Buat contoh soal serupa (angka/konteks berbeda) dan bahas contoh itu sampai tuntas sebagai model.
- Tambahkan beberapa soal latihan mandiri dengan kunci jawaban singkat.
- Gunakan Bahasa Indonesia, kecuali soalnya pelajaran bahasa asing (ikuti konteks soal).
- Tulis rumus matematika sebagai teks biasa (gunakan / untuk pembagian dan ^ untuk pangkat), tanpa LaTeX, karena hasil akan dirender ke PDF teks.

Balas HANYA dengan satu objek JSON valid (tanpa markdown, tanpa teks lain) yang mengikuti JSON Schema berikut:
${JSON.stringify(z.toJSONSchema(StudyGuideSchema))}`;

type ChatMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

async function generateGuide(client: Groq, messages: ChatMessage[]) {
  // Model ter-cache dicoba dulu; kalau ternyata sudah dipensiunkan Groq,
  // jatuh kembali ke daftar kandidat lengkap.
  const candidates = cachedModel
    ? [cachedModel, ...VISION_MODEL_CANDIDATES.filter((m) => m !== cachedModel)]
    : VISION_MODEL_CANDIDATES;
  let lastErr: unknown;
  for (const model of candidates) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
        max_completion_tokens: 8000,
        temperature: 0.3,
      });
      cachedModel = model;
      return completion.choices[0]?.message?.content ?? "";
    } catch (err) {
      if (isModelGone(err)) {
        if (cachedModel === model) cachedModel = null;
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY belum diset di environment server." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
  }
  if (!SUPPORTED_TYPES.includes(file.type as SupportedType)) {
    return NextResponse.json(
      { error: `Format ${file.type || "tidak dikenal"} tidak didukung. Gunakan JPEG, PNG, GIF, atau WebP.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Ukuran gambar maksimal 3 MB. Coba foto ulang atau perkecil gambarnya." },
      { status: 400 }
    );
  }

  const catatan = formData.get("catatan");
  const imageData = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Groq();
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${file.type};base64,${imageData}` },
        },
        {
          type: "text",
          text:
            "Ini foto tugas sekolahku. Buatkan panduan belajar sesuai instruksi." +
            (typeof catatan === "string" && catatan.trim()
              ? `\n\nCatatan tambahan dari siswa: ${catatan.trim()}`
              : ""),
        },
      ],
    },
  ];

  try {
    let raw = await generateGuide(client, messages);
    let parsed = StudyGuideSchema.safeParse(tryParseJson(raw));

    // Model open-source sesekali meleset dari schema — beri satu kesempatan perbaikan.
    if (!parsed.success) {
      raw = await generateGuide(client, [
        ...messages,
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `JSON sebelumnya tidak valid terhadap schema (${parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}). Kirim ulang JSON lengkap yang diperbaiki, tanpa teks lain.`,
        },
      ]);
      parsed = StudyGuideSchema.safeParse(tryParseJson(raw));
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: "AI tidak dapat memproses gambar ini. Coba foto yang lebih jelas." },
        { status: 422 }
      );
    }

    // Simpan ke riwayat. Kegagalan simpan tidak menggagalkan respons —
    // panduan tetap dikirim ke user.
    const { error: insertError } = await supabase.from("guides").insert({
      user_id: user.id,
      judul: parsed.data.judul,
      mata_pelajaran: parsed.data.mata_pelajaran,
      payload: parsed.data,
    });
    if (insertError) {
      console.error("Gagal menyimpan riwayat:", insertError.message);
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    if (err instanceof Groq.APIError) {
      if (err.status === 429) {
        return NextResponse.json(
          { error: "Kuota AI sedang penuh (rate limit Groq). Coba lagi sebentar lagi." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Gagal menganalisis: ${err.message}` },
        { status: 502 }
      );
    }
    throw err;
  }
}

function tryParseJson(text: string): unknown {
  // Beberapa model membungkus JSON dengan pagar kode meski sudah dilarang.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
