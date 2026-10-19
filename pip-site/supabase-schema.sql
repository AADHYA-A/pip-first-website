-- Pip's First Website: backend schema.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- 1. Guestbook wall -----------------------------------------------------------
create table if not exists public.guestbook (
  id         bigint generated always as identity primary key,
  name       text    not null check (char_length(name)    between 1 and 24),
  message    text    not null check (char_length(message) between 1 and 120),
  hidden     boolean not null default false,   -- moderation: set true in the Table Editor to hide an entry
  created_at timestamptz not null default now()
);

-- 2. Shared "dreams delivered" counter (a single row) --------------------------
create table if not exists public.stats (
  id               int primary key check (id = 1),
  dreams_delivered bigint not null default 1204
);
insert into public.stats (id) values (1) on conflict do nothing;

-- 3a. Table privileges. Newer Supabase projects do NOT grant these automatically, so
--     they are explicit. Visitors may read the wall and write ONLY name + message
--     (they can never set `hidden` or fake `created_at`), and may read the counter.
grant usage on schema public to anon;
grant select on public.guestbook to anon;
grant insert (name, message) on public.guestbook to anon;
grant select on public.stats to anon;

-- 3b. Row Level Security: the public (anon) key can only do what is listed here --
alter table public.guestbook enable row level security;
alter table public.stats     enable row level security;

drop policy if exists "read visible wishes"  on public.guestbook;
drop policy if exists "sign the wall"        on public.guestbook;
drop policy if exists "read stats"           on public.stats;

create policy "read visible wishes" on public.guestbook for select to anon using (hidden = false);
create policy "sign the wall"       on public.guestbook for insert to anon with check (hidden = false);
create policy "read stats"          on public.stats     for select to anon using (true);
-- No update or delete policies exist, so visitors can never edit or remove anything.

-- 4. The counter can only ever go up by one, through this function -------------
-- Throttled to one increment per second site-wide so the number can't be run up by a script.
alter table public.stats add column if not exists last_bump timestamptz not null default 'epoch';

create or replace function public.increment_dreams()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  update public.stats
     set dreams_delivered = dreams_delivered + 1, last_bump = now()
   where id = 1 and last_bump < now() - interval '1 second'
   returning dreams_delivered into n;
  if n is null then                      -- throttled: just report the current number
    select dreams_delivered into n from public.stats where id = 1;
  end if;
  return n;
end;
$$;
revoke all on function public.increment_dreams() from public;
grant execute on function public.increment_dreams() to anon;

-- 5. Flood guard: at most 5 new wishes per 10 seconds across the whole site -----
create or replace function public.guestbook_flood_guard()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.guestbook where created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'slow down, Pip is overwhelmed';
  end if;
  return new;
end;
$$;
drop trigger if exists guestbook_flood on public.guestbook;
create trigger guestbook_flood before insert on public.guestbook
  for each row execute function public.guestbook_flood_guard();
