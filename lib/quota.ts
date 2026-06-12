import type { SupabaseClient } from "@supabase/supabase-js";

// Jatah gratis per hari. Override lewat env DAILY_QUOTA (server-only).
export const DAILY_QUOTA = Math.max(1, Number(process.env.DAILY_QUOTA ?? "3") || 3);

// Kuota di-reset tengah malam WIB (UTC+7), zona waktu mayoritas pengguna.
export function startOfTodayWibIso(): string {
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
  wibNow.setUTCHours(0, 0, 0, 0);
  return new Date(wibNow.getTime() - WIB_OFFSET_MS).toISOString();
}

export async function getQuotaUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ limit: number; used: number; remaining: number }> {
  const { count, error } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfTodayWibIso());

  if (error) throw new Error(`Gagal membaca kuota: ${error.message}`);

  const used = count ?? 0;
  return { limit: DAILY_QUOTA, used, remaining: Math.max(0, DAILY_QUOTA - used) };
}
