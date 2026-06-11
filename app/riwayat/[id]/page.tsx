import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GuideView from "@/components/GuideView";
import { StudyGuideSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RiwayatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("guides")
    .select("payload, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();

  const parsed = StudyGuideSchema.safeParse(row.payload);
  if (!parsed.success) notFound();

  return (
    <main>
      <p>
        <Link href="/riwayat">← Kembali ke riwayat</Link>
      </p>
      <GuideView guide={parsed.data} />
    </main>
  );
}
