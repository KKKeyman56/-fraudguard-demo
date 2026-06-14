"use client";

import { useState } from "react";

const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME ?? "BCA";
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER ?? "Admin Belajarin";
const PRICE_IDR = Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_IDR ?? "25000") || 25000;

export default function BankTransfer() {
  const [senderName, setSenderName] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!proof) {
      setError("Lampirkan bukti transfer dulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("sender_name", senderName);
      fd.append("amount", String(PRICE_IDR));
      fd.append("proof", proof);
      const res = await fetch("/api/payment/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim. Coba lagi.");
        return;
      }
      setSent(true);
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="info">
        ✅ Bukti transfer terkirim! Premium kamu akan aktif setelah admin
        mengonfirmasi pembayaran (biasanya beberapa menit). Coba muat ulang
        halaman ini sebentar lagi untuk cek statusnya.
      </div>
    );
  }

  return (
    <div>
      <div className="bank-box">
        <div className="bank-row">
          <span>Bank</span>
          <strong>{BANK_NAME}</strong>
        </div>
        <div className="bank-row">
          <span>No. Rekening</span>
          <strong>
            {BANK_ACCOUNT}{" "}
            <button type="button" className="linklike" onClick={copyAccount}>
              {copied ? "tersalin ✓" : "salin"}
            </button>
          </strong>
        </div>
        <div className="bank-row">
          <span>Atas Nama</span>
          <strong>{BANK_HOLDER}</strong>
        </div>
        <div className="bank-row">
          <span>Nominal</span>
          <strong>Rp {PRICE_IDR.toLocaleString("id-ID")}</strong>
        </div>
      </div>

      <form onSubmit={submit} className="auth-form">
        <label>
          Nama pengirim transfer
          <input
            type="text"
            required
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Nama di rekening pengirim"
            autoComplete="off"
          />
        </label>
        <label>
          Bukti transfer (screenshot/foto)
          <input
            type="file"
            required
            accept="image/*"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={busy || !senderName.trim() || !proof}>
          {busy && <span className="spinner" />}
          Kirim Konfirmasi Pembayaran
        </button>
      </form>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
