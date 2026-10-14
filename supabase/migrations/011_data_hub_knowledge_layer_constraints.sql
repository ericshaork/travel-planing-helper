-- Wanderly v2.0.5 Step1.1 knowledge layer hardening.
-- Tightens frontend visibility and adds dedupe/freshness constraints without
-- changing the table shape created by 010_data_hub_knowledge_layer.sql.

drop policy if exists "place_external_ids_select_public" on public.place_external_ids;

-- provider_records_staging, provider_ingest_runs, and traffic_snapshots remain
-- backend/service-role only because they may include raw payloads, job metadata,
-- or freshness semantics that are not product-ready.

create unique index if not exists event_records_provider_external_id_unique_idx
  on public.event_records (provider, external_id)
  where external_id is not null;

create unique index if not exists place_facts_dedupe_idx
  on public.place_facts (
    place_id,
    fact_type,
    source_provider,
    coalesce(source_external_id, ''),
    coalesce(language, '')
  );

alter table public.event_records
  add constraint event_records_latitude_range_check
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.event_records
  add constraint event_records_longitude_range_check
  check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.event_records
  add constraint event_records_time_order_check
  check (starts_at is null or ends_at is null or ends_at >= starts_at);

alter table public.event_records
  add constraint event_records_expires_after_fetched_check
  check (expires_at is null or expires_at >= fetched_at);

alter table public.weather_snapshots
  add constraint weather_snapshots_latitude_range_check
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.weather_snapshots
  add constraint weather_snapshots_longitude_range_check
  check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.weather_snapshots
  add constraint weather_snapshots_forecast_time_order_check
  check (
    forecast_start_at is null
    or forecast_end_at is null
    or forecast_end_at >= forecast_start_at
  );

alter table public.weather_snapshots
  add constraint weather_snapshots_expires_after_fetched_check
  check (expires_at is null or expires_at >= fetched_at);

alter table public.traffic_snapshots
  add constraint traffic_snapshots_latitude_range_check
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.traffic_snapshots
  add constraint traffic_snapshots_longitude_range_check
  check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.traffic_snapshots
  add constraint traffic_snapshots_expires_after_fetched_check
  check (expires_at is null or expires_at >= fetched_at);

alter table public.provider_ingest_runs
  add constraint provider_ingest_runs_time_order_check
  check (started_at is null or finished_at is null or finished_at >= started_at);

alter table public.provider_records_staging
  add constraint provider_records_staging_expires_after_fetched_check
  check (expires_at is null or expires_at >= fetched_at);

alter table public.place_facts
  add constraint place_facts_expires_after_fetched_check
  check (expires_at is null or expires_at >= fetched_at);
