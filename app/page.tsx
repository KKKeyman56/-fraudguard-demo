import AnalyzeTool from "@/components/AnalyzeTool";
import Landing from "@/components/Landing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Sudah login → langsung ke alat; belum → landing page.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return <AnalyzeTool />;
  } catch {
    // Supabase belum dikonfigurasi — tampilkan landing saja.
  }
  return <Landing />;
}
