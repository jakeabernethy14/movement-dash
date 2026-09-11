-- ============================================================
-- The Movement Coaching -- Migration 006
-- Run this AFTER migration_005.sql.
-- Adds everything needed for the new Progress tab: progress photos,
-- and sleep/energy/stress tracking on daily logs.
-- ============================================================

-- ------------------------------------------------------------
-- DAILY LOGS: sleep / energy / stress (used for Progress averages)
-- ------------------------------------------------------------
alter table public.daily_logs add column if not exists sleep_hours numeric;
alter table public.daily_logs add column if not exists energy_level int; -- 1-5
alter table public.daily_logs add column if not exists stress_level int; -- 1-5

-- ------------------------------------------------------------
-- PROGRESS PHOTOS
-- ------------------------------------------------------------
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid references public.profiles(id) on delete set null,
  photo_url text not null,
  taken_date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

drop policy if exists "progress_photos_select" on public.progress_photos;
create policy "progress_photos_select" on public.progress_photos
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

drop policy if exists "progress_photos_write_client" on public.progress_photos;
create policy "progress_photos_write_client" on public.progress_photos
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create or replace function public.set_progress_photo_pt()
returns trigger language plpgsql as $$
begin
  if new.pt_id is null then
    select pt_id into new.pt_id from public.pt_clients where client_id = new.client_id limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_progress_photo_pt on public.progress_photos;
create trigger trg_set_progress_photo_pt
  before insert on public.progress_photos
  for each row execute function public.set_progress_photo_pt();

-- Private storage bucket (NOT public, unlike avatars -- these are personal photos).
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Folder convention: {client_id}/{filename}. The client who owns the folder can
-- read/write it; their PT (and the owner) can also read it via the DB-backed check.
drop policy if exists "progress_photo_owner_all" on storage.objects;
create policy "progress_photo_owner_all" on storage.objects
  for all using (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "progress_photo_pt_read" on storage.objects;
create policy "progress_photo_pt_read" on storage.objects
  for select using (
    bucket_id = 'progress-photos' and (
      exists (
        select 1 from public.pt_clients
        where pt_id = auth.uid() and client_id::text = (storage.foldername(name))[1]
      )
      or public.has_role('owner')
    )
  );

-- ============================================================
-- Done.
-- ============================================================
