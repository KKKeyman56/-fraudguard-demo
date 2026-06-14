import { createClient } from "@supabase/supabase-js";

// Klien Supabase dengan service-role key — MELEWATI RLS. Hanya boleh dipakai
// dari kode server yang sudah memverifikasi sumber kepercayaannya sendiri
// (mis. setelah pembayaran PayPal dikonfirmasi ke API PayPal). JANGAN pernah
// diekspos ke browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
