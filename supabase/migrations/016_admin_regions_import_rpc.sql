-- Wanderly Phase 1.5.2 Administrative Geography Import Pipeline.
-- Safe server-side upsert helper for normalized admin_regions imports.

create or replace function public.upsert_admin_regions_from_geojson(regions jsonb)
returns table (
  total integer,
  upserted integer,
  missing_geometry integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(regions) <> 'array' then
    raise exception 'regions must be a JSON array';
  end if;

  insert into public.admin_regions (
    adcode,
    name,
    level,
    admin_type,
    parent_adcode,
    province_adcode,
    prefecture_adcode,
    center_lng,
    center_lat,
    label_lng,
    label_lat,
    boundary,
    bbox_min_lng,
    bbox_min_lat,
    bbox_max_lng,
    bbox_max_lat,
    source,
    source_id,
    source_updated_at,
    metadata
  )
  select
    row.adcode,
    row.name,
    row.level,
    row.admin_type,
    row.parent_adcode,
    row.province_adcode,
    row.prefecture_adcode,
    row.center_lng,
    row.center_lat,
    row.label_lng,
    row.label_lat,
    case
      when row.boundary_geojson is null then null
      else st_setsrid(st_multi(st_geomfromgeojson(row.boundary_geojson::text)), 4326)::geometry(MultiPolygon, 4326)
    end,
    row.bbox_min_lng,
    row.bbox_min_lat,
    row.bbox_max_lng,
    row.bbox_max_lat,
    row.source,
    row.source_id,
    row.source_updated_at,
    coalesce(row.metadata, '{}'::jsonb)
  from jsonb_to_recordset(regions) as row (
    adcode text,
    name text,
    level text,
    admin_type text,
    parent_adcode text,
    province_adcode text,
    prefecture_adcode text,
    center_lng double precision,
    center_lat double precision,
    label_lng double precision,
    label_lat double precision,
    boundary_geojson jsonb,
    bbox_min_lng double precision,
    bbox_min_lat double precision,
    bbox_max_lng double precision,
    bbox_max_lat double precision,
    source text,
    source_id text,
    source_updated_at timestamptz,
    metadata jsonb
  )
  on conflict (adcode) do update set
    name = excluded.name,
    level = excluded.level,
    admin_type = excluded.admin_type,
    parent_adcode = excluded.parent_adcode,
    province_adcode = excluded.province_adcode,
    prefecture_adcode = excluded.prefecture_adcode,
    center_lng = excluded.center_lng,
    center_lat = excluded.center_lat,
    label_lng = excluded.label_lng,
    label_lat = excluded.label_lat,
    boundary = excluded.boundary,
    bbox_min_lng = excluded.bbox_min_lng,
    bbox_min_lat = excluded.bbox_min_lat,
    bbox_max_lng = excluded.bbox_max_lng,
    bbox_max_lat = excluded.bbox_max_lat,
    source = excluded.source,
    source_id = excluded.source_id,
    source_updated_at = excluded.source_updated_at,
    metadata = excluded.metadata,
    updated_at = now();

  return query
  select
    jsonb_array_length(regions)::integer as total,
    jsonb_array_length(regions)::integer as upserted,
    (
      select count(*)::integer
      from jsonb_array_elements(regions) as item
      where item -> 'boundary_geojson' is null
    ) as missing_geometry;
end;
$$;

comment on function public.upsert_admin_regions_from_geojson(jsonb) is 'Upserts normalized admin_regions rows. Converts GeoJSON MultiPolygon into PostGIS geometry on the server to avoid client-side SQL string assembly.';

grant execute on function public.upsert_admin_regions_from_geojson(jsonb)
to service_role;
