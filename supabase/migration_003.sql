-- ============================================================
-- The Movement Coaching -- Migration 003
-- Run this AFTER migration_002.sql.
-- Adds: news/notice board, per-account timezone, notes deletion,
-- and a couple of small RLS additions needed for the new pages.
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES: per-account timezone
-- ------------------------------------------------------------
alter table public.profiles add column if not exists timezone text not null default 'UTC';

-- ------------------------------------------------------------
-- NOTES: allow the author to delete their own note
-- ------------------------------------------------------------
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (author_id = auth.uid() or public.has_role('owner'));

-- ------------------------------------------------------------
-- ANNOUNCEMENTS (studio-wide notice board -- owner/trainer post, everyone reads)
-- ------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_all" on public.announcements;
create policy "announcements_select_all" on public.announcements
  for select using (auth.role() = 'authenticated');

drop policy if exists "announcements_write_staff" on public.announcements;
create policy "announcements_write_staff" on public.announcements
  for insert with check (
    author_id = auth.uid() and (public.has_role('owner') or public.has_role('trainer'))
  );

drop policy if exists "announcements_delete_own_or_owner" on public.announcements;
create policy "announcements_delete_own_or_owner" on public.announcements
  for delete using (author_id = auth.uid() or public.has_role('owner'));

-- ============================================================
-- Done.
-- ============================================================
