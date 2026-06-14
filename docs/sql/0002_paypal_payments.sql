-- Integrasi pembayaran PayPal untuk Belajarin Premium.
--
-- Mencatat setiap capture PayPal (idempoten) dan memberi premium yang menumpuk,
-- sama seperti redeem_activation_code. Fungsi grant_paid_premium hanya boleh
-- dipanggil oleh service_role (dari route server SETELAH pembayaran diverifikasi
-- ke API PayPal), supaya pengguna biasa tidak bisa mengaktifkan premium gratis.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  provider text not null,
  reference text not null,
  amount_value numeric not null,
  amount_currency text not null,
  duration_days int not null,
  created_at timestamptz not null default now(),
  unique (provider, reference)
);

alter table public.payments enable row level security;

-- Pengguna boleh melihat riwayat pembayarannya sendiri. Tidak ada policy
-- insert/update/delete → hanya service_role (yang melewati RLS) yang menulis.
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using ((select auth.uid()) = user_id);

create or replace function public.grant_paid_premium(
  p_user uuid,
  p_provider text,
  p_reference text,
  p_days int,
  p_amount numeric,
  p_currency text
) returns timestamptz
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_until timestamptz;
  v_rows int;
begin
  if p_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Catat pembayaran. Kalau capture yang sama datang dua kali, tidak ada baris
  -- baru yang masuk → kita tidak menambah masa premium lagi (idempoten).
  insert into payments (user_id, provider, reference, amount_value, amount_currency, duration_days)
  values (p_user, p_provider, p_reference, p_amount, p_currency, p_days)
  on conflict (provider, reference) do nothing;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select premium_until into v_until from premium_status where user_id = p_user;
    return v_until;
  end if;

  -- Perpanjangan menumpuk: kalau masih premium, durasi ditambahkan ke sisa masa aktif.
  insert into premium_status (user_id, premium_until)
  values (p_user, now() + make_interval(days => p_days))
  on conflict (user_id) do update
    set premium_until = greatest(premium_status.premium_until, now()) + make_interval(days => p_days)
  returning premium_until into v_until;

  return v_until;
end;
$function$;

-- Cabut akses dari pengguna biasa; hanya service_role yang boleh memanggil.
revoke all on function public.grant_paid_premium(uuid, text, text, int, numeric, text) from public;
revoke all on function public.grant_paid_premium(uuid, text, text, int, numeric, text) from anon;
revoke all on function public.grant_paid_premium(uuid, text, text, int, numeric, text) from authenticated;
grant execute on function public.grant_paid_premium(uuid, text, text, int, numeric, text) to service_role;
