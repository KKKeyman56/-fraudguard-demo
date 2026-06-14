"use client";

import { useCallback, useState } from "react";
import PaypalCheckout from "@/components/PaypalCheckout";

const PRICE_USD = process.env.NEXT_PUBLIC_PREMIUM_PRICE_USD ?? "1.99";

export default function UpgradePage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(null);

  const onPaid = useCallback((premiumUntil: string) => {
    setError(null);
    setUntil(premiumUntil);
  }, []);
  const onPayError = useCallback((message: string) => setError(message), []);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menukarkan kode.");
        return;
      }
      setUntil(data.premium_until as string);
      setCode("");
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Upgrade Premium</h1>
      <p className="tagline">Belajar tanpa rem — jatah panduan jauh lebih besar setiap hari.</p>

      <div className="card pricing-card">
        <h2>
          Rp 25.000 <span className="pricing-period">/ 30 hari</span>
        </h2>
        <ul>
          <li>
            <strong>30 panduan per hari</strong> (gratis: 3/hari)
          </li>
          <li>Berlaku 30 hari sejak kode diaktifkan</li>
          <li>Beli lagi kapan saja — masa aktif menumpuk, tidak hangus</li>
        </ul>

        <h3 className="section-title">Bayar dengan PayPal</h3>
        <p className="muted">
          Bayar online (${PRICE_USD}) dan premium langsung aktif otomatis —
          tanpa menunggu admin.
        </p>
        <PaypalCheckout onSuccess={onPaid} onError={onPayError} />
      </div>

      <div className="card">
        <h3 className="section-title">Atau lewat kode aktivasi</h3>
        <ol>
          <li>Hubungi admin Belajarin (lihat kontak di bio media sosial kami)</li>
          <li>Transfer Rp 25.000 sesuai instruksi admin</li>
          <li>Kamu menerima <strong>kode aktivasi</strong> (format BLJR-XXXX-XXXX)</li>
          <li>Tukarkan kodenya di bawah ini — premium langsung aktif</li>
        </ol>

        <h3 className="section-title">Tukarkan Kode Aktivasi</h3>
        <form onSubmit={redeem} className="auth-form">
          <label>
            Kode aktivasi
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BLJR-XXXX-XXXX"
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={busy || !code.trim()}>
            {busy && <span className="spinner" />}
            Aktifkan Premium
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        {until && (
          <div className="info">
            🎉 Premium aktif sampai{" "}
            <strong>
              {new Date(until).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            . Selamat belajar!
          </div>
        )}
      </div>
    </main>
  );
}
