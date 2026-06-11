import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RiwayatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: guides, error } = await supabase
    .from("guides")
    .select("id, judul, mata_pelajaran, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main>
      <h1>Riwayat Panduan</h1>
      <p className="tagline">Semua panduan belajar yang pernah kamu buat.</p>

      {error && <div className="error">Gagal memuat riwayat: {error.message}</div>}

      {guides && guides.length === 0 && (
        <div className="card">
          Belum ada panduan tersimpan. <Link href="/">Buat yang pertama</Link> — panduan baru
          otomatis tersimpan di sini.
        </div>
      )}

      {guides?.map((g) => (
        <Link key={g.id} href={`/riwayat/${g.id}`} className="history-item">
          <strong>{g.judul}</strong>
          <span className="guide-meta">
            {g.mata_pelajaran} ·{" "}
            {new Date(g.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </Link>
      ))}
    </main>
  );
}
