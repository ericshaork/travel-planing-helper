-- Wanderly v2.0 Phase 1.5 Step6 area and destination detail layer.
-- These detail tables intentionally keep destination, real administrative areas,
-- and Wanderly travel hotspot regions separate.

create table if not exists public.destination_details (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  intro text,
  travel_summary text,
  best_season text,
  suggested_days_min integer,
  suggested_days_max integer,
  primary_themes text[] not null default '{}'::text[],
  representative_place_ids uuid[] not null default '{}'::uuid[],
  transport_summary text,
  weather_summary text,
  source_summary jsonb not null default '{}'::jsonb,
  missing_fields text[] not null default '{}'::text[],
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destination_details_destination_id_unique unique (destination_id),
  constraint destination_details_suggested_days_min_positive check (suggested_days_min is null or suggested_days_min > 0),
  constraint destination_details_suggested_days_max_positive check (suggested_days_max is null or suggested_days_max > 0),
  constraint destination_details_suggested_days_range check (suggested_days_min is null or suggested_days_max is null or suggested_days_max >= suggested_days_min)
);

comment on table public.destination_details is 'Normalized country/city/destination entry details. Do not store raw provider responses here.';
comment on column public.destination_details.source_summary is 'Display-safe provider/source summary for destination detail fields.';

create table if not exists public.admin_area_details (
  id uuid primary key default gen_random_uuid(),
  admin_area_id uuid not null references public.admin_areas (id) on delete cascade,
  intro text,
  travel_summary text,
  representative_place_ids uuid[] not null default '{}'::uuid[],
  transport_summary text,
  suitable_for text[] not null default '{}'::text[],
  source_summary jsonb not null default '{}'::jsonb,
  missing_fields text[] not null default '{}'::text[],
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_area_details_admin_area_id_unique unique (admin_area_id)
);

comment on table public.admin_area_details is 'Details for real administrative areas only. Never use this table for Wanderly travel hotspots.';

create table if not exists public.travel_region_details (
  id uuid primary key default gen_random_uuid(),
  travel_region_id uuid not null references public.travel_regions (id) on delete cascade,
  intro text,
  play_style text,
  suggested_route text,
  representative_place_ids uuid[] not null default '{}'::uuid[],
  suitable_for text[] not null default '{}'::text[],
  crowd_level text,
  source_summary jsonb not null default '{}'::jsonb,
  missing_fields text[] not null default '{}'::text[],
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_region_details_travel_region_id_unique unique (travel_region_id)
);

comment on table public.travel_region_details is 'Details for Wanderly curated travel hotspot regions. These are not administrative areas.';

create index if not exists destination_details_destination_id_idx
  on public.destination_details (destination_id);

create index if not exists admin_area_details_admin_area_id_idx
  on public.admin_area_details (admin_area_id);

create index if not exists travel_region_details_travel_region_id_idx
  on public.travel_region_details (travel_region_id);

drop trigger if exists destination_details_updated_at on public.destination_details;
create trigger destination_details_updated_at
before update on public.destination_details
for each row
execute function public.update_updated_at_column();

drop trigger if exists admin_area_details_updated_at on public.admin_area_details;
create trigger admin_area_details_updated_at
before update on public.admin_area_details
for each row
execute function public.update_updated_at_column();

drop trigger if exists travel_region_details_updated_at on public.travel_region_details;
create trigger travel_region_details_updated_at
before update on public.travel_region_details
for each row
execute function public.update_updated_at_column();

alter table public.destination_details enable row level security;
alter table public.admin_area_details enable row level security;
alter table public.travel_region_details enable row level security;

-- Read-only for browser clients. Writes remain service-role/backend only.
drop policy if exists "destination_details_select_public" on public.destination_details;
create policy "destination_details_select_public"
on public.destination_details
for select
to anon, authenticated
using (true);

drop policy if exists "admin_area_details_select_public" on public.admin_area_details;
create policy "admin_area_details_select_public"
on public.admin_area_details
for select
to anon, authenticated
using (true);

drop policy if exists "travel_region_details_select_public" on public.travel_region_details;
create policy "travel_region_details_select_public"
on public.travel_region_details
for select
to anon, authenticated
using (true);
