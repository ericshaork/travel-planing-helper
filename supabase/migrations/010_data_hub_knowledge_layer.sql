-- Wanderly v2.0.5 Step1 knowledge layer.
-- This migration adds provider ingest/staging and normalized fact/event/weather/traffic
-- carrying tables. It does not modify the existing core Data Hub tables.

create extension if not exists pgcrypto;

create table if not exists public.provider_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  run_type text not null,
  target_type text,
  target_id uuid,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint provider_ingest_runs_run_type_check check (run_type in ('manual', 'scheduled', 'enrich', 'backfill', 'health_check')),
  constraint provider_ingest_runs_target_type_check check (target_type is null or target_type in ('destination', 'admin_area', 'travel_region', 'place', 'route', 'weather', 'event', 'traffic')),
  constraint provider_ingest_runs_status_check check (status in ('pending', 'running', 'success', 'partial', 'failed', 'skipped')),
  constraint provider_ingest_runs_counts_non_negative check (
    records_seen >= 0 and records_inserted >= 0 and records_updated >= 0 and records_skipped >= 0
  )
);

comment on table public.provider_ingest_runs is 'Backend-only audit records for provider ingest, sync, enrich, backfill, and health-check jobs.';

create table if not exists public.provider_records_staging (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text,
  record_type text not null,
  source_url text,
  source_name text,
  raw_hash text not null,
  raw_snapshot jsonb not null default '{}'::jsonb,
  normalized_status text not null default 'pending',
  confidence numeric,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  ingest_run_id uuid references public.provider_ingest_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_records_staging_record_type_check check (record_type in ('destination', 'admin_area', 'travel_region', 'place', 'place_detail', 'image', 'route', 'weather', 'event', 'traffic', 'hotel')),
  constraint provider_records_staging_normalized_status_check check (normalized_status in ('pending', 'normalized', 'duplicate', 'rejected', 'failed')),
  constraint provider_records_staging_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.provider_records_staging is 'Backend-only staging records for raw or summarized provider payloads. UI must never read this table directly.';
comment on column public.provider_records_staging.raw_snapshot is 'Raw provider payload or redacted snapshot for backend normalization only; do not expose to browser clients.';

create unique index if not exists provider_records_staging_provider_type_external_id_idx
  on public.provider_records_staging (provider, record_type, external_id)
  where external_id is not null;

create unique index if not exists provider_records_staging_provider_type_raw_hash_idx
  on public.provider_records_staging (provider, record_type, raw_hash);

create index if not exists provider_records_staging_ingest_run_id_idx
  on public.provider_records_staging (ingest_run_id);

create index if not exists provider_records_staging_normalized_status_idx
  on public.provider_records_staging (normalized_status);

create table if not exists public.place_external_ids (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  provider text not null,
  external_id text not null,
  external_url text,
  provider_place_type text,
  match_method text not null,
  confidence numeric not null default 0.5,
  verified_status text not null default 'unverified',
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_external_ids_match_method_check check (match_method in ('exact_provider', 'name_address', 'name_coordinate', 'wikidata_qid', 'manual', 'imported')),
  constraint place_external_ids_verified_status_check check (verified_status in ('unverified', 'verified', 'conflicted', 'rejected')),
  constraint place_external_ids_confidence_range check (confidence >= 0 and confidence <= 1)
);

comment on table public.place_external_ids is 'Cross-provider external IDs for the same canonical Wanderly place.';

create unique index if not exists place_external_ids_provider_external_id_idx
  on public.place_external_ids (provider, external_id);

create unique index if not exists place_external_ids_place_provider_external_id_idx
  on public.place_external_ids (place_id, provider, external_id);

create index if not exists place_external_ids_place_id_idx
  on public.place_external_ids (place_id);

create table if not exists public.place_facts (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  fact_type text not null,
  value_json jsonb not null,
  value_text text,
  language text,
  source_provider text not null,
  source_external_id text,
  source_url text,
  source_name text,
  confidence numeric not null default 0.5,
  verification_status text not null default 'unverified',
  fetched_at timestamptz not null default now(),
  last_verified_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_facts_fact_type_check check (fact_type in ('intro', 'opening_hours', 'ticket_info', 'recommended_duration', 'best_time_to_visit', 'crowd_level', 'accessibility', 'phone', 'website', 'image', 'booking_url', 'official_notice', 'tags', 'suitability')),
  constraint place_facts_verification_status_check check (verification_status in ('unverified', 'verified', 'stale', 'conflicted', 'rejected')),
  constraint place_facts_confidence_range check (confidence >= 0 and confidence <= 1)
);

comment on table public.place_facts is 'Field-level place facts with source, confidence, freshness, and verification state. Do not store raw provider payloads here.';

create index if not exists place_facts_place_id_idx
  on public.place_facts (place_id);

create index if not exists place_facts_fact_type_idx
  on public.place_facts (fact_type);

create index if not exists place_facts_source_provider_idx
  on public.place_facts (source_provider);

create index if not exists place_facts_expires_at_idx
  on public.place_facts (expires_at);

create index if not exists place_facts_verification_status_idx
  on public.place_facts (verification_status);

create table if not exists public.event_records (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text,
  title text not null,
  description text,
  event_type text,
  destination_id uuid references public.destinations (id) on delete set null,
  admin_area_id uuid references public.admin_areas (id) on delete set null,
  place_id uuid references public.places (id) on delete set null,
  venue_name text,
  address text,
  latitude numeric,
  longitude numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  ticket_url text,
  official_url text,
  image_url text,
  price_text text,
  source_url text,
  source_name text,
  confidence numeric default 0.5,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_records_event_type_check check (event_type is null or event_type in ('exhibition', 'performance', 'concert', 'festival', 'sports', 'lecture', 'workshop', 'market', 'other')),
  constraint event_records_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.event_records is 'Events, exhibitions, performances, and sports records. Events are temporal records and must not be mixed into places.';

create index if not exists event_records_provider_external_id_idx
  on public.event_records (provider, external_id);

create index if not exists event_records_destination_id_idx
  on public.event_records (destination_id);

create index if not exists event_records_admin_area_id_idx
  on public.event_records (admin_area_id);

create index if not exists event_records_place_id_idx
  on public.event_records (place_id);

create index if not exists event_records_starts_at_idx
  on public.event_records (starts_at);

create index if not exists event_records_ends_at_idx
  on public.event_records (ends_at);

create index if not exists event_records_event_type_idx
  on public.event_records (event_type);

create table if not exists public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  destination_id uuid references public.destinations (id) on delete set null,
  admin_area_id uuid references public.admin_areas (id) on delete set null,
  place_id uuid references public.places (id) on delete set null,
  latitude numeric,
  longitude numeric,
  snapshot_type text not null,
  observed_at timestamptz,
  forecast_start_at timestamptz,
  forecast_end_at timestamptz,
  temperature_c numeric,
  feels_like_c numeric,
  condition_text text,
  precipitation_probability numeric,
  wind_text text,
  humidity numeric,
  aqi numeric,
  uv_index numeric,
  warning_level text,
  warning_title text,
  value_json jsonb not null default '{}'::jsonb,
  source_url text,
  source_name text,
  confidence numeric default 0.5,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint weather_snapshots_snapshot_type_check check (snapshot_type in ('current', 'forecast', 'warning', 'air_quality', 'uv')),
  constraint weather_snapshots_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint weather_snapshots_precip_probability_range check (precipitation_probability is null or (precipitation_probability >= 0 and precipitation_probability <= 1)),
  constraint weather_snapshots_humidity_range check (humidity is null or (humidity >= 0 and humidity <= 100))
);

comment on table public.weather_snapshots is 'Weather, alert, air-quality, and UV temporal context. Do not mix these records into static place details.';

create index if not exists weather_snapshots_provider_idx
  on public.weather_snapshots (provider);

create index if not exists weather_snapshots_destination_id_idx
  on public.weather_snapshots (destination_id);

create index if not exists weather_snapshots_admin_area_id_idx
  on public.weather_snapshots (admin_area_id);

create index if not exists weather_snapshots_place_id_idx
  on public.weather_snapshots (place_id);

create index if not exists weather_snapshots_snapshot_type_idx
  on public.weather_snapshots (snapshot_type);

create index if not exists weather_snapshots_observed_at_idx
  on public.weather_snapshots (observed_at);

create index if not exists weather_snapshots_forecast_start_at_idx
  on public.weather_snapshots (forecast_start_at);

create index if not exists weather_snapshots_expires_at_idx
  on public.weather_snapshots (expires_at);

create table if not exists public.traffic_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  destination_id uuid references public.destinations (id) on delete set null,
  admin_area_id uuid references public.admin_areas (id) on delete set null,
  place_id uuid references public.places (id) on delete set null,
  route_cache_id uuid references public.route_cache (id) on delete set null,
  latitude numeric,
  longitude numeric,
  traffic_type text not null,
  status text,
  summary text,
  delay_minutes numeric,
  value_json jsonb not null default '{}'::jsonb,
  source_url text,
  source_name text,
  confidence numeric default 0.5,
  observed_at timestamptz,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint traffic_snapshots_traffic_type_check check (traffic_type in ('road', 'transit', 'walking', 'driving', 'parking', 'disruption')),
  constraint traffic_snapshots_status_check check (status is null or status in ('smooth', 'moderate', 'congested', 'severe', 'disrupted', 'unknown')),
  constraint traffic_snapshots_delay_non_negative check (delay_minutes is null or delay_minutes >= 0),
  constraint traffic_snapshots_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.traffic_snapshots is 'Temporal traffic, road, parking, and transit disruption snapshots. Keep server-readable until product and freshness semantics are finalized.';

create index if not exists traffic_snapshots_provider_idx
  on public.traffic_snapshots (provider);

create index if not exists traffic_snapshots_destination_id_idx
  on public.traffic_snapshots (destination_id);

create index if not exists traffic_snapshots_admin_area_id_idx
  on public.traffic_snapshots (admin_area_id);

create index if not exists traffic_snapshots_place_id_idx
  on public.traffic_snapshots (place_id);

create index if not exists traffic_snapshots_route_cache_id_idx
  on public.traffic_snapshots (route_cache_id);

create index if not exists traffic_snapshots_traffic_type_idx
  on public.traffic_snapshots (traffic_type);

create index if not exists traffic_snapshots_observed_at_idx
  on public.traffic_snapshots (observed_at);

create index if not exists traffic_snapshots_expires_at_idx
  on public.traffic_snapshots (expires_at);

drop trigger if exists provider_records_staging_updated_at on public.provider_records_staging;
create trigger provider_records_staging_updated_at
before update on public.provider_records_staging
for each row
execute function public.update_updated_at_column();

drop trigger if exists place_external_ids_updated_at on public.place_external_ids;
create trigger place_external_ids_updated_at
before update on public.place_external_ids
for each row
execute function public.update_updated_at_column();

drop trigger if exists place_facts_updated_at on public.place_facts;
create trigger place_facts_updated_at
before update on public.place_facts
for each row
execute function public.update_updated_at_column();

drop trigger if exists event_records_updated_at on public.event_records;
create trigger event_records_updated_at
before update on public.event_records
for each row
execute function public.update_updated_at_column();

alter table public.provider_ingest_runs enable row level security;
alter table public.provider_records_staging enable row level security;
alter table public.place_external_ids enable row level security;
alter table public.place_facts enable row level security;
alter table public.event_records enable row level security;
alter table public.weather_snapshots enable row level security;
alter table public.traffic_snapshots enable row level security;

-- Backend-only tables. No anon/authenticated policies are created here.
-- Writes must be performed by service role or trusted backend jobs.

drop policy if exists "place_external_ids_select_public" on public.place_external_ids;
create policy "place_external_ids_select_public"
on public.place_external_ids
for select
to anon, authenticated
using (true);

drop policy if exists "place_facts_select_public" on public.place_facts;
create policy "place_facts_select_public"
on public.place_facts
for select
to anon, authenticated
using (true);

drop policy if exists "event_records_select_public" on public.event_records;
create policy "event_records_select_public"
on public.event_records
for select
to anon, authenticated
using (true);

drop policy if exists "weather_snapshots_select_public" on public.weather_snapshots;
create policy "weather_snapshots_select_public"
on public.weather_snapshots
for select
to anon, authenticated
using (true);

-- traffic_snapshots remain service-role/backend readable only in this migration.
