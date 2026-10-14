-- Wanderly v2.0.5 Data Hub service-role grants.
-- This migration only grants backend/service-role access to Data Hub tables.
-- It does not expand anon/authenticated permissions and does not disable RLS.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.destinations,
  public.admin_areas,
  public.travel_regions,
  public.places,
  public.place_details,
  public.place_sources,
  public.route_cache,
  public.ai_plan_evidence,
  public.provider_ingest_runs,
  public.provider_records_staging,
  public.place_external_ids,
  public.place_facts,
  public.event_records,
  public.weather_snapshots,
  public.traffic_snapshots
to service_role;
