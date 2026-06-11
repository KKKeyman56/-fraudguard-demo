import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { StudyGuideSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

const SYSTEM_PROMPT = `Kamu adalah tutor pribadi untuk pelajar Indonesia. Pengguna mengirim foto soal/tugas sekolah mereka.

Tugasmu: membuat panduan belajar yang membuat siswa MAMPU mengerjakan soalnya sendiri — bukan mengerjakan soal untuk mereka.

Aturan penting:
- Transkripsikan soal yang terbaca dari foto.
- Jelaskan konsep yang dibutuhkan dengan bahasa sederhana sesuai jenjang siswa.
- Untuk soal asli dari foto: berikan langkah-langkah cara mengerjakan, tetapi JANGAN sebutkan jawaban akhirnya. Akhiri dengan petunjuk agar siswa bisa mengecek sendiri apakah jawabannya masuk akal.
- Buat contoh soal serupa (angka/konteks berbeda) dan bahas contoh itu sampai tuntas sebagai model.
- Tambahkan beberapa soal latihan mandiri dengan kunci jawaban singkat.
- Gunakan Bahasa Indonesia, kecuali soalnya pelajaran bahasa asing (ikuti konteks soal).
- Tulis rumus matematika sebagai teks biasa (gunakan / untuk pembagian dan ^ untuk pangkat), tanpa LaTeX, karena hasil akan dirender ke PDF teks.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY belum diset di environment server." },
      { status: 500 }
    );
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
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 20 MB." }, { status: 400 });
  }

  const catatan = formData.get("catatan");
  const imageData = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as SupportedType,
                data: imageData,
              },
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
      ],
      output_config: { format: zodOutputFormat(StudyGuideSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json(
        { error: "AI tidak dapat memproses gambar ini. Coba foto yang lebih jelas." },
        { status: 422 }
      );
    }

    return NextResponse.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Server sedang sibuk. Coba lagi sebentar lagi." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Gagal menganalisis: ${err.message}` },
        { status: 502 }
      );
    }
    throw err;
  }
}
