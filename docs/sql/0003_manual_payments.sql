-- Pembayaran transfer bank manual + konfirmasi lewat bot Telegram.
--
-- Alur: user upload bukti transfer di website → baris 'pending' dibuat →
-- bot Telegram mengirim notif ke admin dengan tombol Setujui/Tolak →
-- saat disetujui, premium diaktifkan lewat grant_paid_premium (provider
-- 'manual_transfer'), idempoten dan menumpuk seperti redeem kode.

create table if not exists public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  user_email text,
  amount integer not null,
  sender_name text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  duration_days integer not null default 30,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_note text
);

alter table public.manual_payments enable row level security;

-- Pengguna boleh melihat status pesanannya sendiri. Tidak ada policy
-- insert/update → hanya service_role (dari route server) yang menulis.
drop policy if exists "manual_payments_select_own" on public.manual_payments;
create policy "manual_payments_select_own" on public.manual_payments
  for select using ((select auth.uid()) = user_id);

create index if not exists manual_payments_user_idx
  on public.manual_payments (user_id, created_at desc);
