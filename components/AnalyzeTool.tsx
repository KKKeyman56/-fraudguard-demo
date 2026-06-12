"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GuideView from "@/components/GuideView";
import type { StudyGuide } from "@/lib/schema";

type Quota = {
  limit: number;
  used: number;
  remaining: number;
  isPremium?: boolean;
  premiumUntil?: string | null;
};

export default function AnalyzeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function refreshQuota() {
    try {
      const res = await fetch("/api/quota");
      if (res.ok) setQuota((await res.json()) as Quota);
    } catch {
      // Badge kuota opsional — kegagalan fetch tidak perlu mengganggu UI.
    }
  }

  useEffect(() => {
    refreshQuota();
  }, []);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setGuide(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  // Groq membatasi gambar base64 ~4 MB; foto HP modern sering 5-12 MB.
  // Kompres di browser: sisi terpanjang maks 1568px, JPEG kualitas 85%.
  async function compressImage(f: File): Promise<File> {
    try {
      const bitmap = await createImageBitmap(f);
      const maxSide = 1568;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && f.size < 2 * 1024 * 1024) return f;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
      return blob ? new File([blob], "soal.jpg", { type: "image/jpeg" }) : f;
    } catch {
      return f;
    }
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setGuide(null);
    try {
      const form = new FormData();
      form.append("image", await compressImage(file));
      if (catatan.trim()) form.append("catatan", catatan);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.quota) setQuota(data.quota as Quota);
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      setGuide(data as StudyGuide);
      refreshQuota();
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
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
              <span className="guide-meta">(JPEG / PNG / WebP — foto besar dikompres otomatis)</span>
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

        <button onClick={analyze} disabled={!file || loading || quota?.remaining === 0}>
          {loading && <span className="spinner" />}
          {loading ? "Menganalisis..." : "Buatkan Panduan Belajar"}
        </button>

        {quota &&
          (quota.isPremium ? (
            <p className="quota-badge">
              ⭐ Premium aktif
              {quota.premiumUntil &&
                ` sampai ${new Date(quota.premiumUntil).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                })}`}{" "}
              · sisa hari ini <strong>{quota.remaining}</strong> dari {quota.limit}
            </p>
          ) : quota.remaining > 0 ? (
            <p className="quota-badge">
              Sisa kuota gratis hari ini: <strong>{quota.remaining}</strong> dari {quota.limit} ·{" "}
              <Link href="/upgrade">Upgrade Premium</Link>
            </p>
          ) : (
            <p className="quota-badge quota-empty">
              Kuota gratis hari ini habis ({quota.limit}/hari). Reset jam 00.00 WIB —{" "}
              atau <Link href="/upgrade">upgrade Premium</Link> untuk 30 panduan/hari.
            </p>
          ))}

        {error && <div className="error">{error}</div>}
      </div>

      {guide && <GuideView guide={guide} />}
    </main>
  );
}
