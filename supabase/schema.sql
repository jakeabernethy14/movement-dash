-- ============================================================
-- The Movement Coaching — Supabase Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES  (1 row per auth.users row)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  disabled boolean not null default false,   -- owner can disable a PT account
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACCOUNT TYPES  (many-to-many: a profile can be owner + trainer, etc.)
-- ============================================================
create type public.account_type as enum ('owner', 'trainer', 'client');

create table if not exists public.account_types (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type public.account_type not null,
  created_at timestamptz not null default now(),
  unique (profile_id, type)
);

-- Helper: does the current user have a given account type?
create or replace function public.has_role(p_role public.account_type)
returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.account_types
    where profile_id = auth.uid() and type = p_role
  );
$$;

-- ============================================================
-- PT <-> CLIENT relationship (a client belongs to exactly one PT at a time)
-- ============================================================
create table if not exists public.pt_clients (
  id uuid primary key default gen_random_uuid(),
  pt_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  description text default '',
  expiration date,
  status text not null default 'active', -- active | paused | expired
  created_at timestamptz not null default now(),
  unique (client_id) -- one active PT per client
);

create or replace function public.my_pt_id(p_client uuid)
returns uuid language sql stable security definer as $$
  select pt_id from public.pt_clients where client_id = p_client limit 1;
$$;

-- ============================================================
-- REGISTER TOKENS  (required to sign up)
-- ============================================================
create table if not exists public.register_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  role public.account_type not null default 'client',   -- role granted on redemption
  pt_id uuid references public.profiles(id) on delete set null, -- auto-assign client to this PT
  created_by uuid references public.profiles(id),
  max_uses integer not null default 1,
  use_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRAINING PLANS (library, created by PTs, reusable)
-- ============================================================
create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  pt_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  content jsonb not null default '[]', -- array of {day, exercises:[{name,sets,reps,weight,notes}]}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assign a plan (or ad-hoc plan) to a client for a date range
create table if not exists public.assigned_programs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.training_plans(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  start_date date not null default current_date,
  end_date date,
  notes text default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- SCHEDULE / CALENDAR EVENTS (daily training plan entries, per client)
-- ============================================================
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  event_date date not null,
  start_time time,
  end_time time,
  event_type text not null default 'training', -- training | checkup | rest | note
  created_at timestamptz not null default now()
);

-- ============================================================
-- NUTRITION INFO
-- ============================================================
create table if not exists public.nutrition_info (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid not null references public.profiles(id) on delete cascade,
  calories_target int,
  protein_target int,
  carbs_target int,
  fats_target int,
  notes text default '',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CHECK-UPS (progress tracking)
-- ============================================================
create table if not exists public.checkups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid not null references public.profiles(id) on delete cascade,
  checkup_date date not null default current_date,
  weight_kg numeric,
  body_fat_pct numeric,
  measurements jsonb default '{}', -- {waist, chest, arms, legs, ...}
  notes text default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- GOALS
-- ============================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  target_date date,
  status text not null default 'in_progress', -- in_progress | achieved | abandoned
  progress int not null default 0, -- 0-100
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- NOTES (PT notes on client, or client's own notes to self/PT)
-- ============================================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  visibility text not null default 'shared', -- 'pt_only' | 'shared'
  created_at timestamptz not null default now()
);

-- ============================================================
-- MESSAGES (simple client <-> PT thread)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- APP SETTINGS (single row, owner-controlled)
-- ============================================================
create table if not exists public.app_settings (
  id int primary key default 1,
  allow_registration boolean not null default true,
  require_email_verification boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.account_types enable row level security;
alter table public.pt_clients enable row level security;
alter table public.register_tokens enable row level security;
alter table public.training_plans enable row level security;
alter table public.assigned_programs enable row level security;
alter table public.schedule_events enable row level security;
alter table public.nutrition_info enable row level security;
alter table public.checkups enable row level security;
alter table public.goals enable row level security;
alter table public.notes enable row level security;
alter table public.messages enable row level security;
alter table public.app_settings enable row level security;

-- PROFILES: everyone signed in can read profiles that are relevant to them.
-- Simplify: any authenticated user can read all profiles (needed for PT names on client dashboards etc).
-- Writes restricted to self, or owner.
create policy "profiles_select_all_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_owner" on public.profiles
  for update using (public.has_role('owner'));

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ACCOUNT TYPES: readable by all authenticated (needed to know who's a PT etc); only owner can write.
create policy "account_types_select" on public.account_types
  for select using (auth.role() = 'authenticated');

create policy "account_types_owner_write" on public.account_types
  for all using (public.has_role('owner')) with check (public.has_role('owner'));

-- allow the signup flow (via token redemption function) to insert - handled by security definer function below.

-- PT_CLIENTS: PT sees their own rows; client sees their own row; owner sees all.
create policy "pt_clients_select" on public.pt_clients
  for select using (
    pt_id = auth.uid() or client_id = auth.uid() or public.has_role('owner')
  );

create policy "pt_clients_write_pt_or_owner" on public.pt_clients
  for all using (pt_id = auth.uid() or public.has_role('owner'))
  with check (pt_id = auth.uid() or public.has_role('owner'));

-- REGISTER TOKENS: only trainers/owner can create/view; token redemption happens via edge function/service role ideally,
-- but we also allow anon read of a single token by value for validation at signup (limited columns via view - see below).
create policy "register_tokens_select_staff" on public.register_tokens
  for select using (public.has_role('owner') or public.has_role('trainer'));

create policy "register_tokens_write_staff" on public.register_tokens
  for all using (public.has_role('owner') or public.has_role('trainer'))
  with check (public.has_role('owner') or public.has_role('trainer'));

-- TRAINING PLANS: PT manages own plans; owner sees all; clients don't need direct access (they see assigned_programs).
create policy "training_plans_select" on public.training_plans
  for select using (pt_id = auth.uid() or public.has_role('owner'));

create policy "training_plans_write" on public.training_plans
  for all using (pt_id = auth.uid() or public.has_role('owner'))
  with check (pt_id = auth.uid() or public.has_role('owner'));

-- ASSIGNED PROGRAMS: client sees own; PT of that client can manage.
create policy "assigned_programs_select" on public.assigned_programs
  for select using (
    client_id = auth.uid() or assigned_by = auth.uid() or public.has_role('owner')
  );

create policy "assigned_programs_write" on public.assigned_programs
  for all using (assigned_by = auth.uid() or public.has_role('owner'))
  with check (assigned_by = auth.uid() or public.has_role('owner'));

-- SCHEDULE EVENTS
create policy "schedule_select" on public.schedule_events
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

create policy "schedule_write" on public.schedule_events
  for all using (pt_id = auth.uid() or public.has_role('owner'))
  with check (pt_id = auth.uid() or public.has_role('owner'));

-- NUTRITION
create policy "nutrition_select" on public.nutrition_info
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

create policy "nutrition_write" on public.nutrition_info
  for all using (pt_id = auth.uid() or public.has_role('owner'))
  with check (pt_id = auth.uid() or public.has_role('owner'));

-- CHECKUPS
create policy "checkups_select" on public.checkups
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

create policy "checkups_write_pt" on public.checkups
  for insert with check (pt_id = auth.uid() or public.has_role('owner'));

create policy "checkups_update_pt" on public.checkups
  for update using (pt_id = auth.uid() or public.has_role('owner'));

-- GOALS
create policy "goals_select" on public.goals
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

create policy "goals_write_pt" on public.goals
  for all using (pt_id = auth.uid() or public.has_role('owner'))
  with check (pt_id = auth.uid() or public.has_role('owner'));

-- NOTES: PT full access to notes on their clients. Client can insert/view notes where visibility = shared,
-- and can create their own notes (author_id = self).
create policy "notes_select" on public.notes
  for select using (
    pt_id = auth.uid()
    or public.has_role('owner')
    or (client_id = auth.uid() and (visibility = 'shared' or author_id = auth.uid()))
  );

create policy "notes_insert" on public.notes
  for insert with check (
    author_id = auth.uid() and (pt_id = auth.uid() or client_id = auth.uid() or public.has_role('owner'))
  );

create policy "notes_update_own" on public.notes
  for update using (author_id = auth.uid() or public.has_role('owner'));

-- MESSAGES: only sender or recipient can see.
create policy "messages_select" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "messages_insert" on public.messages
  for insert with check (sender_id = auth.uid());

create policy "messages_update_read" on public.messages
  for update using (recipient_id = auth.uid());

-- APP SETTINGS: everyone (even anon) can read (need allow_registration flag on the login/register page);
-- only owner can write.
create policy "settings_select_anyone" on public.app_settings
  for select using (true);

create policy "settings_write_owner" on public.app_settings
  for update using (public.has_role('owner'));

-- ============================================================
-- TOKEN REDEMPTION (security definer so an unauthenticated-but-just-signed-up
-- user can redeem a token right after auth.signUp)
-- ============================================================
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

  if tok.role = 'client' and tok.pt_id is not null then
    insert into public.pt_clients (pt_id, client_id)
    values (tok.pt_id, p_profile_id)
    on conflict (client_id) do nothing;
  end if;

  update public.register_tokens set use_count = use_count + 1 where id = tok.id;
end;
$$;

grant execute on function public.redeem_register_token(text, uuid, text, text) to anon, authenticated;
grant execute on function public.has_role(public.account_type) to anon, authenticated;
