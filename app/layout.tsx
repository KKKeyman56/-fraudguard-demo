import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Belajarin — Foto Soal, Paham Caranya",
  description:
    "Foto tugas sekolahmu, AI membuatkan panduan belajar: penjelasan konsep, langkah pengerjaan, contoh serupa, dan latihan — dalam bentuk PDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
