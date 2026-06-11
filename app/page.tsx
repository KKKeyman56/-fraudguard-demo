"use client";

import { useRef, useState } from "react";
import type { StudyGuide } from "@/lib/schema";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setGuide(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setGuide(null);
    try {
      const form = new FormData();
      form.append("image", file);
      if (catatan.trim()) form.append("catatan", catatan);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      setGuide(data as StudyGuide);
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!guide) return;
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
    <main>
      <h1>Belajarin</h1>
      <p className="tagline">
        Foto soal tugasmu — AI membuatkan panduan belajar: konsep, langkah pengerjaan, contoh
        serupa, dan latihan. Kamu yang mengerjakan, kami yang menemani paham.
      </p>

      <div className="card">
        <div
          className="dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0]);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau foto soal" />
          ) : (
            <p>
              Klik atau seret foto soal ke sini
              <br />
              <span className="guide-meta">(JPEG / PNG / WebP, maks 20 MB)</span>
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <textarea
          rows={2}
          placeholder="Catatan tambahan (opsional), mis. 'aku bingung di bagian pecahan'"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />

        <button onClick={analyze} disabled={!file || loading}>
          {loading && <span className="spinner" />}
          {loading ? "Menganalisis... (bisa 1-2 menit)" : "Buatkan Panduan Belajar"}
        </button>

        {error && <div className="error">{error}</div>}
      </div>

      {guide && (
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
        </div>
      )}
    </main>
  );
}
