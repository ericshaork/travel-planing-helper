create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  travel_preferences_json jsonb not null default '{
    "budget": "moderate",
    "pace": "balanced",
    "interests": [],
    "companions": "solo",
    "wakeUpPreference": "normal",
    "transportPreference": "public_transport"
  }'::jsonb,
  workspace_preferences_json jsonb not null default '{
    "defaultMode": "read",
    "mapLayout": "balanced",
    "mapOverlay": "expanded"
  }'::jsonb,
  ai_preferences_json jsonb not null default '{
    "detailLevel": "standard",
    "useLongTermPreferences": true,
    "preferHiddenGems": false,
    "preferLessWalking": false,
    "preferConvenientTransport": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_settings_user_id_idx
  on public.user_settings (user_id);

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
before update on public.user_settings
for each row
execute function public.update_updated_at_column();

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
on public.user_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
on public.user_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own"
on public.user_settings
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
  set
    email = excluded.email,
    updated_at = now();

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
