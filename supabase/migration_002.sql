-- ============================================================
-- The Movement Coaching -- Migration 002
-- Run this AFTER schema.sql, in the Supabase SQL Editor.
-- Adds: username login, account access expiry (freeze not delete),
-- PT personal calendar events, session responses, daily logs,
-- profile picture/bio, PT/owner editing of client accounts,
-- and a safe token-validation RPC (fixes the "used token still
-- created an account" bug).
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES: username, bio, access expiry
-- ------------------------------------------------------------
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists access_expires_at timestamptz;

-- Resolve "email or username" at login time. Callable by anon (pre-auth).
create or replace function public.email_for_login(p_identifier text)
returns text
language plpgsql security definer as $$
declare
  found_email text;
begin
  if p_identifier ilike '%@%' then
    return p_identifier; -- looks like an email already
  end if;

  select email into found_email from public.profiles where username = p_identifier limit 1;
  return found_email; -- null if no such username
end;
$$;
grant execute on function public.email_for_login(text) to anon, authenticated;

-- Let a PT update their own clients' profile (name/username/access_expires_at/disabled).
-- (Password/email changes for other users still require the service-role admin API route.)
drop policy if exists "profiles_update_pt_of_client" on public.profiles;
create policy "profiles_update_pt_of_client" on public.profiles
  for update using (
    exists (
      select 1 from public.pt_clients
      where pt_id = auth.uid() and client_id = profiles.id
    )
  );

-- ------------------------------------------------------------
-- REGISTER TOKENS: grant an access duration on redemption
-- ------------------------------------------------------------
alter table public.register_tokens add column if not exists access_days integer;
-- access_days = number of days of account access granted when a CLIENT redeems this
-- token (null = unlimited). Ignored for trainer/owner tokens.

-- Read-only, anon-callable validity check -- lets the register page confirm a token
-- BEFORE creating the auth user, instead of finding out only after signup.
create or replace function public.validate_register_token(p_token text)
returns boolean
language sql security definer as $$
  select exists (
    select 1 from public.register_tokens
    where token = p_token
      and (expires_at is null or expires_at > now())
      and use_count < max_uses
  );
$$;
grant execute on function public.validate_register_token(text) to anon, authenticated;

-- Updated redemption function: also grants access_expires_at based on the token.
create or replace function public.redeem_register_token(p_token text, p_profile_id uuid, p_full_name text, p_email text)
returns void
language plpgsql security definer as $$
declare
  tok public.register_tokens;
begin
  select * into tok from public.register_tokens where token = p_token
    and (expires_at is null or expires_at > now())
    and use_count < max_uses
  limit 1;

  if tok is null then
    raise exception 'INVALID_OR_EXPIRED_TOKEN';
  end if;

  insert into public.profiles (id, full_name, email)
  values (p_profile_id, p_full_name, p_email)
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.account_types (profile_id, type)
  values (p_profile_id, tok.role)
  on conflict do nothing;

  if tok.role = 'client' then
    if tok.pt_id is not null then
      insert into public.pt_clients (pt_id, client_id)
      values (tok.pt_id, p_profile_id)
      on conflict (client_id) do nothing;
    end if;
    if tok.access_days is not null then
      update public.profiles
      set access_expires_at = now() + (tok.access_days || ' days')::interval
      where id = p_profile_id;
    end if;
  end if;

  update public.register_tokens set use_count = use_count + 1 where id = tok.id;
end;
$$;

-- ------------------------------------------------------------
-- SCHEDULE EVENTS: allow PT-only personal events (client_id nullable),
-- and let clients log a result/note against their own session.
-- ------------------------------------------------------------
alter table public.schedule_events alter column client_id drop not null;
alter table public.schedule_events add column if not exists event_scope text not null default 'client'; -- 'client' | 'personal'
alter table public.schedule_events add column if not exists client_response text;
alter table public.schedule_events add column if not exists client_completed boolean not null default false;
alter table public.schedule_events add column if not exists responded_at timestamptz;

drop policy if exists "schedule_client_update_response" on public.schedule_events;
create policy "schedule_client_update_response" on public.schedule_events
  for update using (client_id = auth.uid());

-- ------------------------------------------------------------
-- DAILY LOGS (calories/macros/training notes per day, client-filled)
-- ------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid references public.profiles(id) on delete set null,
  log_date date not null default current_date,
  calories int,
  protein int,
  carbs int,
  fats int,
  training_notes text default '',
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, log_date)
);

alter table public.daily_logs enable row level security;

drop policy if exists "daily_logs_select" on public.daily_logs;
create policy "daily_logs_select" on public.daily_logs
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

drop policy if exists "daily_logs_write_client" on public.daily_logs;
create policy "daily_logs_write_client" on public.daily_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- auto-fill pt_id from the client's current PT so trainers can see logs without the client needing to know it
create or replace function public.set_daily_log_pt()
returns trigger language plpgsql as $$
begin
  if new.pt_id is null then
    select pt_id into new.pt_id from public.pt_clients where client_id = new.client_id limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_daily_log_pt on public.daily_logs;
create trigger trg_set_daily_log_pt
  before insert on public.daily_logs
  for each row execute function public.set_daily_log_pt();

-- ------------------------------------------------------------
-- STORAGE: avatars bucket + policies
-- Run "create bucket" from the Dashboard (Storage -> New bucket -> "avatars",
-- Public bucket = ON) OR run the insert below. Either way, run the policies.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar_owner_write" on storage.objects;
create policy "avatar_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_owner_update" on storage.objects;
create policy "avatar_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_owner_delete" on storage.objects;
create policy "avatar_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Done. Next steps (see README "Migration 002" section):
--  1. Create a public Storage bucket named "avatars" for profile pictures.
--  2. Add SUPABASE_SERVICE_ROLE_KEY as a SERVER-ONLY env var (never NEXT_PUBLIC_)
--     for the /api/admin/update-user route to be able to reset passwords etc.
-- ============================================================
