import { z } from "zod";

// Struktur panduan belajar yang dihasilkan AI dari foto soal.
// Sengaja TIDAK memuat jawaban final soal asli — hanya konsep, langkah,
// contoh serupa yang dibahas tuntas, dan latihan dengan kunci untuk self-check.
export const StudyGuideSchema = z.object({
  judul: z.string().describe("Judul singkat panduan belajar, mis. 'Persamaan Linear Satu Variabel'"),
  mata_pelajaran: z.string().describe("Mata pelajaran yang terdeteksi, mis. Matematika, Fisika, Bahasa Inggris"),
  perkiraan_tingkat: z.string().describe("Perkiraan jenjang, mis. 'SMP kelas 8'"),
  soal_terdeteksi: z
    .array(z.string())
    .describe("Transkripsi setiap soal yang terbaca dari foto, apa adanya"),
  konsep_kunci: z
    .array(
      z.object({
        nama: z.string(),
        penjelasan: z.string().describe("Penjelasan konsep dengan bahasa sederhana, sertakan rumus bila relevan"),
      })
    )
    .describe("Konsep yang harus dipahami untuk bisa mengerjakan soal-soal ini"),
  panduan_pengerjaan: z
    .array(
      z.object({
        soal: z.string().describe("Soal dari foto yang dipandu"),
        langkah: z
          .array(z.string())
          .describe("Langkah-langkah cara mengerjakan, TANPA menyebutkan hasil akhirnya"),
        petunjuk: z.string().describe("Hint untuk mengecek apakah jawaban siswa masuk akal"),
      })
    )
    .describe("Panduan langkah demi langkah untuk setiap soal asli, tanpa jawaban final"),
  contoh_serupa: z
    .array(
      z.object({
        soal: z.string().describe("Soal baru yang mirip tapi angka/konteksnya berbeda"),
        pembahasan: z.array(z.string()).describe("Pembahasan lengkap langkah demi langkah"),
        jawaban: z.string().describe("Jawaban akhir contoh ini"),
      })
    )
    .describe("Contoh soal serupa yang dibahas tuntas sebagai model pengerjaan"),
  latihan_mandiri: z
    .array(
      z.object({
        soal: z.string(),
        kunci: z.string().describe("Kunci jawaban singkat untuk self-check"),
      })
    )
    .describe("Soal latihan tambahan untuk menguji pemahaman"),
  tips: z.array(z.string()).describe("Tips belajar atau kesalahan umum yang perlu dihindari"),
});

export type StudyGuide = z.infer<typeof StudyGuideSchema>;
