create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  destination_city text,
  start_date date,
  end_date date,
  days integer,
  budget numeric,
  trip_request_json jsonb not null,
  trip_plan_json jsonb not null,
  enrichment_json jsonb,
  weather_summary_json jsonb,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_plans_days_positive check (days is null or days > 0),
  constraint trip_plans_budget_non_negative check (budget is null or budget >= 0)
);

create index if not exists trip_plans_user_id_idx
  on public.trip_plans (user_id);

create index if not exists trip_plans_updated_at_desc_idx
  on public.trip_plans (updated_at desc);

create index if not exists trip_plans_destination_city_idx
  on public.trip_plans (destination_city);

create index if not exists trip_plans_start_date_idx
  on public.trip_plans (start_date);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

drop trigger if exists trip_plans_updated_at on public.trip_plans;
create trigger trip_plans_updated_at
before update on public.trip_plans
for each row
execute function public.update_updated_at_column();

alter table public.profiles enable row level security;
alter table public.trip_plans enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "trip_plans_select_own" on public.trip_plans;
create policy "trip_plans_select_own"
on public.trip_plans
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "trip_plans_insert_own" on public.trip_plans;
create policy "trip_plans_insert_own"
on public.trip_plans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "trip_plans_update_own" on public.trip_plans;
create policy "trip_plans_update_own"
on public.trip_plans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "trip_plans_delete_own" on public.trip_plans;
create policy "trip_plans_delete_own"
on public.trip_plans
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
