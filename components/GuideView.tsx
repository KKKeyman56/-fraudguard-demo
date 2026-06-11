"use client";

import { useState } from "react";
import type { StudyGuide } from "@/lib/schema";

export default function GuideView({ guide }: { guide: StudyGuide }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guide),
      });
      if (!res.ok) {
        setError("Gagal membuat PDF. Coba lagi.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${guide.judul}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card">
      <h2>{guide.judul}</h2>
      <p className="guide-meta">
        {guide.mata_pelajaran} · {guide.perkiraan_tingkat}
      </p>

      <h3 className="section-title">Soal yang Terdeteksi</h3>
      <ol>
        {guide.soal_terdeteksi.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      <h3 className="section-title">Konsep Kunci</h3>
      {guide.konsep_kunci.map((k, i) => (
        <p key={i}>
          <strong>{k.nama}.</strong> {k.penjelasan}
        </p>
      ))}

      <h3 className="section-title">Panduan Pengerjaan</h3>
      {guide.panduan_pengerjaan.map((p, i) => (
        <div key={i}>
          <p>
            <strong>Soal:</strong> {p.soal}
          </p>
          <ol>
            {p.langkah.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ol>
          <p className="hint">Cek jawabanmu: {p.petunjuk}</p>
        </div>
      ))}

      <h3 className="section-title">Contoh Serupa (dibahas tuntas)</h3>
      {guide.contoh_serupa.map((c, i) => (
        <div key={i}>
          <p>
            <strong>Contoh {i + 1}:</strong> {c.soal}
          </p>
          <ol>
            {c.pembahasan.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ol>
          <p>
            <strong>Jawaban:</strong> {c.jawaban}
          </p>
        </div>
      ))}

      <h3 className="section-title">Latihan Mandiri</h3>
      <ol>
        {guide.latihan_mandiri.map((l, i) => (
          <li key={i}>{l.soal}</li>
        ))}
      </ol>

      <h3 className="section-title">Tips</h3>
      <ul>
        {guide.tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>

      <button onClick={downloadPdf} disabled={downloading}>
        {downloading && <span className="spinner" />}
        {downloading ? "Menyiapkan PDF..." : "Unduh sebagai PDF"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
