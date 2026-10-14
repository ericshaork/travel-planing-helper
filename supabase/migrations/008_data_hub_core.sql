-- Wanderly v2.0 Phase 1.5 data hub core schema.
-- This migration creates the database foundation for trusted destination,
-- administrative area, travel region, place detail, source, route cache,
-- and AI plan evidence records.
--
-- Important boundaries:
-- - admin_areas stores real administrative boundaries only.
-- - travel_regions stores Wanderly curated travel hotspot areas only.
-- - places stores concrete POIs / restaurants / hotels / transport points.
-- - UI code must not depend on raw provider responses.
-- - Service role / backend jobs are responsible for writes; public clients get read-only access to public data tables.

create extension if not exists pgcrypto;

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  country_code text,
  level text not null,
  parent_id uuid references public.destinations (id) on delete set null,
  center_lat double precision,
  center_lng double precision,
  bounds jsonb,
  available boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_level_check check (level in ('global', 'country', 'province', 'state', 'city', 'district', 'region', 'custom')),
  constraint destinations_country_code_format_check check (country_code is null or country_code = upper(country_code))
);

comment on table public.destinations is 'Country, city, district, and custom destination entry records for Wanderly Map Studio and data hub.';
comment on column public.destinations.bounds is 'Provider-normalized viewport or bounding box JSON. Keep raw provider responses out of UI contracts.';

create table if not exists public.admin_areas (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations (id) on delete set null,
  name text not null,
  adcode text,
  level text not null,
  parent_adcode text,
  polygon jsonb,
  center_lat double precision,
  center_lng double precision,
  source_provider text,
  source_external_id text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_areas_level_check check (level in ('country', 'province', 'state', 'city', 'district', 'county', 'town', 'custom'))
);

comment on table public.admin_areas is 'Real administrative reference areas. Do not store Wanderly travel hotspot polygons here.';
comment on column public.admin_areas.polygon is 'Administrative boundary polygon or multipolygon JSON from a real boundary provider such as AMap DistrictSearch or OSM.';

create table if not exists public.travel_regions (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations (id) on delete cascade,
  name text not null,
  description text,
  polygon jsonb,
  center_lat double precision,
  center_lng double precision,
  tags text[] not null default '{}'::text[],
  suggested_duration_minutes integer,
  priority integer not null default 0,
  source_type text not null default 'curated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_regions_suggested_duration_positive check (suggested_duration_minutes is null or suggested_duration_minutes > 0),
  constraint travel_regions_source_type_check check (source_type in ('curated', 'imported', 'provider', 'user', 'ai_assisted'))
);

comment on table public.travel_regions is 'Wanderly curated travel hotspot regions. These are not administrative areas.';

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations (id) on delete set null,
  region_id uuid references public.travel_regions (id) on delete set null,
  name text not null,
  name_en text,
  lat double precision,
  lng double precision,
  address text,
  category text,
  tags text[] not null default '{}'::text[],
  source_provider text,
  source_external_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_status_check check (status in ('active', 'inactive', 'unresolved', 'duplicate', 'archived'))
);

comment on table public.places is 'Canonical points of interest, restaurants, hotels, transport points, and other concrete map places.';

create table if not exists public.place_details (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  intro text,
  opening_hours jsonb,
  ticket_info jsonb,
  phone text,
  website text,
  recommended_duration_minutes integer,
  crowd_level text,
  best_time_to_visit text,
  tips text,
  image_urls jsonb not null default '[]'::jsonb,
  source_summary jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_details_place_id_unique unique (place_id),
  constraint place_details_recommended_duration_positive check (recommended_duration_minutes is null or recommended_duration_minutes > 0)
);

comment on table public.place_details is 'Normalized place details shown to users. Missing facts should stay null or empty instead of being invented by AI.';
comment on column public.place_details.source_summary is 'Field-level provider summary for display. Detailed raw snapshots belong in place_sources.';

create table if not exists public.place_sources (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  field_name text not null,
  provider text not null,
  source_url text,
  raw_external_id text,
  confidence numeric,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  raw_snapshot jsonb,
  constraint place_sources_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.place_sources is 'Field-level source records used to prevent AI from turning unknown facts into unsupported claims.';

create table if not exists public.route_cache (
  id uuid primary key default gen_random_uuid(),
  origin_place_id uuid references public.places (id) on delete cascade,
  destination_place_id uuid references public.places (id) on delete cascade,
  mode text not null,
  distance_meters integer,
  duration_seconds integer,
  provider text,
  raw_json jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint route_cache_mode_check check (mode in ('walking', 'driving', 'transit', 'cycling', 'taxi', 'mixed')),
  constraint route_cache_distance_non_negative check (distance_meters is null or distance_meters >= 0),
  constraint route_cache_duration_non_negative check (duration_seconds is null or duration_seconds >= 0)
);

comment on table public.route_cache is 'Cached route estimates between canonical places. Use provider and fetched_at to judge freshness.';

create table if not exists public.ai_plan_evidence (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid,
  place_id uuid references public.places (id) on delete set null,
  source_type text,
  source_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.ai_plan_evidence is 'Evidence records for future AI planning explanations. Public read/write is intentionally not enabled in this migration.';

create index if not exists destinations_parent_id_idx
  on public.destinations (parent_id);

create index if not exists destinations_country_code_level_idx
  on public.destinations (country_code, level);

create index if not exists admin_areas_destination_id_level_idx
  on public.admin_areas (destination_id, level);

create index if not exists admin_areas_adcode_idx
  on public.admin_areas (adcode);

create index if not exists travel_regions_destination_id_idx
  on public.travel_regions (destination_id);

create index if not exists places_destination_id_idx
  on public.places (destination_id);

create index if not exists places_region_id_idx
  on public.places (region_id);

create index if not exists places_category_idx
  on public.places (category);

create unique index if not exists places_source_provider_external_id_idx
  on public.places (source_provider, source_external_id);

create index if not exists place_details_place_id_idx
  on public.place_details (place_id);

create index if not exists place_sources_place_id_idx
  on public.place_sources (place_id);

create index if not exists place_sources_field_name_idx
  on public.place_sources (field_name);

create unique index if not exists route_cache_origin_destination_mode_idx
  on public.route_cache (origin_place_id, destination_place_id, mode);

drop trigger if exists destinations_updated_at on public.destinations;
create trigger destinations_updated_at
before update on public.destinations
for each row
execute function public.update_updated_at_column();

drop trigger if exists admin_areas_updated_at on public.admin_areas;
create trigger admin_areas_updated_at
before update on public.admin_areas
for each row
execute function public.update_updated_at_column();

drop trigger if exists travel_regions_updated_at on public.travel_regions;
create trigger travel_regions_updated_at
before update on public.travel_regions
for each row
execute function public.update_updated_at_column();

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at
before update on public.places
for each row
execute function public.update_updated_at_column();

drop trigger if exists place_details_updated_at on public.place_details;
create trigger place_details_updated_at
before update on public.place_details
for each row
execute function public.update_updated_at_column();

alter table public.destinations enable row level security;
alter table public.admin_areas enable row level security;
alter table public.travel_regions enable row level security;
alter table public.places enable row level security;
alter table public.place_details enable row level security;
alter table public.place_sources enable row level security;
alter table public.route_cache enable row level security;
alter table public.ai_plan_evidence enable row level security;

-- Public data tables are read-only for browser clients. Writes, updates, and deletes
-- are intentionally left without anon/authenticated policies so only service role
-- or trusted backend jobs can maintain the data hub.
drop policy if exists "destinations_select_public" on public.destinations;
create policy "destinations_select_public"
on public.destinations
for select
to anon, authenticated
using (true);

drop policy if exists "admin_areas_select_public" on public.admin_areas;
create policy "admin_areas_select_public"
on public.admin_areas
for select
to anon, authenticated
using (true);

drop policy if exists "travel_regions_select_public" on public.travel_regions;
create policy "travel_regions_select_public"
on public.travel_regions
for select
to anon, authenticated
using (true);

drop policy if exists "places_select_public" on public.places;
create policy "places_select_public"
on public.places
for select
to anon, authenticated
using (true);

drop policy if exists "place_details_select_public" on public.place_details;
create policy "place_details_select_public"
on public.place_details
for select
to anon, authenticated
using (true);

drop policy if exists "place_sources_select_public" on public.place_sources;
create policy "place_sources_select_public"
on public.place_sources
for select
to anon, authenticated
using (true);

drop policy if exists "route_cache_select_public" on public.route_cache;
create policy "route_cache_select_public"
on public.route_cache
for select
to anon, authenticated
using (true);

-- ai_plan_evidence may contain trip-specific reasoning and is not exposed publicly here.
-- Add scoped user policies later when trip ownership relationships are finalized.
