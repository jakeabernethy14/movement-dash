-- ============================================================
-- The Movement Coaching -- Migration 004
-- Run this AFTER migration_003.sql.
-- Adds: weight tracking on daily logs, public training plan library,
-- an owner-is-always-a-trainer safety trigger, and a couple of
-- small policy additions.
-- ============================================================

-- ------------------------------------------------------------
-- DAILY LOGS: track body weight per day too
-- ------------------------------------------------------------
alter table public.daily_logs add column if not exists weight_kg numeric;
-- (daily_logs already allows the client to insert/update/delete their own rows via
--  the existing "daily_logs_write_client" policy, so editing a past day's entry
--  from the app just needs a UI that lets you pick which date you're editing.)

-- ------------------------------------------------------------
-- TRAINING PLANS: optional public library
-- ------------------------------------------------------------
alter table public.training_plans add column if not exists is_public boolean not null default false;

drop policy if exists "training_plans_select_public" on public.training_plans;
create policy "training_plans_select_public" on public.training_plans
  for select using (is_public = true);
-- (this is IN ADDITION to the existing "training_plans_select" policy which lets
--  a PT see their own private plans -- Postgres OR's multiple permissive policies
--  together, so both keep working.)

-- ------------------------------------------------------------
-- OWNER ACCOUNTS ARE ALWAYS ALSO TRAINERS
-- Whenever someone is granted the 'owner' role (via SQL, or a future admin UI),
-- automatically grant them 'trainer' too, so they always have full PT capability.
-- ------------------------------------------------------------
create or replace function public.ensure_owner_is_trainer()
returns trigger language plpgsql as $$
begin
  if new.type = 'owner' then
    insert into public.account_types (profile_id, type)
    values (new.profile_id, 'trainer')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_owner_is_trainer on public.account_types;
create trigger trg_ensure_owner_is_trainer
  after insert on public.account_types
  for each row execute function public.ensure_owner_is_trainer();

-- Backfill: make sure any existing owner-only accounts also get trainer now.
insert into public.account_types (profile_id, type)
select profile_id, 'trainer' from public.account_types
where type = 'owner'
on conflict do nothing;

-- ============================================================
-- Done.
-- ============================================================
