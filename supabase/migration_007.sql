-- ============================================================
-- The Movement Coaching -- Migration 007
-- Run this AFTER migration_006.sql.
-- Tracks who redeemed each registration token, so the token lists can show it.
-- ============================================================

alter table public.register_tokens add column if not exists redeemed_by uuid[] not null default '{}';

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

  update public.register_tokens
  set use_count = use_count + 1,
      redeemed_by = array_append(redeemed_by, p_profile_id)
  where id = tok.id;
end;
$$;

-- ============================================================
-- Done.
-- ============================================================
