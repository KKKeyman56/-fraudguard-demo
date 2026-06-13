"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "masuk" | "daftar" | "lupa";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    try {
      if (mode === "lupa") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset`,
        });
        if (error) {
          setError(terjemahkan(error.message));
          return;
        }
        setInfo(
          "Tautan reset kata sandi sudah dikirim ke email-mu. Buka email, klik tautannya, lalu buat kata sandi baru."
        );
        return;
      }

      if (mode === "daftar") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(terjemahkan(error.message));
          return;
        }
        if (!data.session) {
          setInfo("Pendaftaran berhasil! Cek email-mu dan klik tautan konfirmasi, lalu masuk di sini.");
          setMode("masuk");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(terjemahkan(error.message));
          return;
        }
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const judul = mode === "masuk" ? "Masuk" : mode === "daftar" ? "Daftar" : "Lupa Kata Sandi";
  const taglineText =
    mode === "masuk"
      ? "Masuk untuk membuat panduan belajar dan menyimpan riwayatmu."
      : mode === "daftar"
        ? "Buat akun gratis — panduan belajarmu akan tersimpan otomatis."
        : "Masukkan email akunmu. Kami kirim tautan untuk membuat kata sandi baru.";

  return (
    <main>
      <h1>{judul}</h1>
      <p className="tagline">{taglineText}</p>

      <div className="card">
        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              autoComplete="email"
            />
          </label>
          {mode !== "lupa" && (
            <label>
              Kata sandi
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete={mode === "daftar" ? "new-password" : "current-password"}
              />
            </label>
          )}
          <button type="submit" disabled={busy}>
            {busy && <span className="spinner" />}
            {mode === "masuk" ? "Masuk" : mode === "daftar" ? "Daftar" : "Kirim Tautan Reset"}
          </button>
        </form>

        {mode === "masuk" && (
          <p className="forgot-link">
            <button className="linklike" onClick={() => switchMode("lupa")}>
              Lupa kata sandi?
            </button>
          </p>
        )}

        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}

        <p className="switch-mode">
          {mode === "masuk" ? (
            <>
              Belum punya akun?{" "}
              <button className="linklike" onClick={() => switchMode("daftar")}>
                Daftar
              </button>
            </>
          ) : mode === "daftar" ? (
            <>
              Sudah punya akun?{" "}
              <button className="linklike" onClick={() => switchMode("masuk")}>
                Masuk
              </button>
            </>
          ) : (
            <>
              Ingat kata sandimu?{" "}
              <button className="linklike" onClick={() => switchMode("masuk")}>
                Kembali ke Masuk
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

function terjemahkan(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email atau kata sandi salah.";
  if (/email not confirmed/i.test(msg)) return "Email belum dikonfirmasi. Cek kotak masuk email-mu.";
  if (/already registered/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/rate limit/i.test(msg)) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  return msg;
}
