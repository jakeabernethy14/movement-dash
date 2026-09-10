-- ============================================================
-- The Movement Coaching -- Migration 005
-- Run this AFTER migration_004.sql.
-- ============================================================

-- ------------------------------------------------------------
-- BUGFIX: nutrition_info had no unique constraint on client_id, so the app's
-- upsert(..., { onConflict: 'client_id' }) call was failing (Postgres requires
-- a matching unique/exclusion constraint for ON CONFLICT to work at all) --
-- this is why saved nutrition plans weren't showing up for the client.
-- ------------------------------------------------------------
-- If a client somehow already has more than one nutrition_info row from before
-- this fix, keep only the most recently updated one so the unique index can be created.
delete from public.nutrition_info a using public.nutrition_info b
where a.client_id = b.client_id and a.updated_at < b.updated_at;

alter table public.nutrition_info add constraint nutrition_info_client_id_key unique (client_id);

-- ------------------------------------------------------------
-- Link calendar sessions back to the plan assignment that created them, so
-- editing/deleting an assignment can also manage its generated sessions.
-- ------------------------------------------------------------
alter table public.schedule_events
  add column if not exists assigned_program_id uuid references public.assigned_programs(id) on delete cascade;

-- ------------------------------------------------------------
-- PERSONAL BESTS
-- ------------------------------------------------------------
create table if not exists public.personal_bests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pt_id uuid references public.profiles(id) on delete set null,
  exercise text not null,
  weight text,
  reps_or_time text,
  pb_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.personal_bests enable row level security;

drop policy if exists "pbs_select" on public.personal_bests;
create policy "pbs_select" on public.personal_bests
  for select using (client_id = auth.uid() or pt_id = auth.uid() or public.has_role('owner'));

drop policy if exists "pbs_write_client" on public.personal_bests;
create policy "pbs_write_client" on public.personal_bests
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create or replace function public.set_pb_pt()
returns trigger language plpgsql as $$
begin
  if new.pt_id is null then
    select pt_id into new.pt_id from public.pt_clients where client_id = new.client_id limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_pb_pt on public.personal_bests;
create trigger trg_set_pb_pt
  before insert on public.personal_bests
  for each row execute function public.set_pb_pt();

-- ------------------------------------------------------------
-- Checkups was missing a DELETE policy (insert/update existed, but a PT
-- could never remove a mistaken check-up entry).
-- ------------------------------------------------------------
drop policy if exists "checkups_delete_pt" on public.checkups;
create policy "checkups_delete_pt" on public.checkups
  for delete using (pt_id = auth.uid() or public.has_role('owner'));

-- ============================================================
-- Done.
-- ============================================================
