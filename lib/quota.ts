import type { SupabaseClient } from "@supabase/supabase-js";

// Jatah per hari. Override lewat env (server-only).
export const DAILY_QUOTA = Math.max(1, Number(process.env.DAILY_QUOTA ?? "3") || 3);
export const PREMIUM_DAILY_QUOTA = Math.max(
  1,
  Number(process.env.PREMIUM_DAILY_QUOTA ?? "30") || 30
);

export type QuotaInfo = {
  limit: number;
  used: number;
  remaining: number;
  isPremium: boolean;
  premiumUntil: string | null;
};

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
): Promise<QuotaInfo> {
  const [{ data: premium }, { count, error }] = await Promise.all([
    supabase
      .from("premium_status")
      .select("premium_until")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfTodayWibIso()),
  ]);

  if (error) throw new Error(`Gagal membaca kuota: ${error.message}`);

  const isPremium = !!premium && new Date(premium.premium_until) > new Date();
  const limit = isPremium ? PREMIUM_DAILY_QUOTA : DAILY_QUOTA;
  const used = count ?? 0;

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    isPremium,
    premiumUntil: isPremium ? premium.premium_until : null,
  };
}
