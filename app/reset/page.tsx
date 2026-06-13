"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPage() {
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Tautan kedaluwarsa/sudah dipakai mengirim error di hash URL.
    if (typeof window !== "undefined" && window.location.hash.includes("error")) {
      setError(
        "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman 'Lupa kata sandi'."
      );
      setReady(true);
      return;
    }

    // Browser client otomatis menukar kode di URL jadi sesi pemulihan.
    supabase.auth.getSession().then(({ data }) => {
      setCanReset(!!data.session);
      if (!data.session) {
        setError(
          "Sesi pemulihan tidak ditemukan. Buka tautan reset langsung dari email-mu, atau minta tautan baru."
        );
      }
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setCanReset(true);
        setError(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(
          /same as the old|should be different/i.test(error.message)
            ? "Kata sandi baru harus berbeda dari yang lama."
            : error.message
        );
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Buat Kata Sandi Baru</h1>

      {!ready ? (
        <div className="card">
          <span className="spinner" /> Memeriksa tautan...
        </div>
      ) : done ? (
        <div className="card">
          <div className="info">
            ✅ Kata sandi berhasil diubah! Mengarahkan ke halaman utama...
          </div>
        </div>
      ) : canReset ? (
        <div className="card">
          <form onSubmit={submit} className="auth-form">
            <label>
              Kata sandi baru
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
            </label>
            <label>
              Ulangi kata sandi baru
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ketik ulang"
                autoComplete="new-password"
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy && <span className="spinner" />}
              Simpan Kata Sandi
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
      ) : (
        <div className="card">
          {error && <div className="error">{error}</div>}
          <p className="switch-mode">
            <Link href="/login">Kembali ke halaman Masuk</Link>
          </p>
        </div>
      )}
    </main>
  );
}
