"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span aria-hidden="true">🦉</span> Belajarin
      </Link>
      <nav>
        {!ready ? null : email ? (
          <>
            <Link href="/riwayat">Riwayat</Link>
            <span className="user-email">{email}</span>
            <button className="linklike" onClick={logout}>
              Keluar
            </button>
          </>
        ) : (
          <Link href="/login">Masuk</Link>
        )}
      </nav>
    </header>
  );
}
