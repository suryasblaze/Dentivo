-- =========================================================================
-- Short bill links — run once in Supabase (SQL Editor).
--
-- One row per bill sent. The id is the whole link: /b/x7k2p9mn3qr4
-- (14 random characters — the id is the only thing protecting the row, so
--  it is long enough that guessing one is not worth attempting.)
-- Anyone holding a link can read that one row, which is the point; nobody
-- can list the table, change a bill or read anything else.
-- =========================================================================

create table if not exists public.bills (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '90 days'
);

alter table public.bills enable row level security;

-- the clinic app (anon key) may add a bill
drop policy if exists bills_insert on public.bills;
create policy bills_insert on public.bills
  for insert to anon
  with check (true);

-- the patient may read only the one bill whose id is in their link,
-- and only while it has not expired
drop policy if exists bills_select on public.bills;
create policy bills_select on public.bills
  for select to anon
  using (expires_at > now());

-- no updates and no deletes for anyone holding the anon key
revoke update, delete on public.bills from anon;

create index if not exists bills_expires_idx on public.bills (expires_at);

-- Old bills are patient data, so clear them out. With pg_cron enabled:
--   select cron.schedule('purge-bills', '0 3 * * *',
--     $$delete from public.bills where expires_at < now()$$);
-- Otherwise run this by hand, or from a scheduled job:
--   delete from public.bills where expires_at < now();
