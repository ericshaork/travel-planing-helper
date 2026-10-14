-- Wanderly Phase 1.5.1 Administrative Geography Foundation.
-- This migration creates the canonical administrative geography table used by
-- future map boundary imports. It does not import official boundary data.

create extension if not exists postgis;

create table if not exists public.admin_regions (
  id uuid primary key default gen_random_uuid(),
  adcode text not null unique,
  name text not null,
  level text not null,
  admin_type text,
  parent_adcode text,
  province_adcode text,
  prefecture_adcode text,
  center_lng double precision,
  center_lat double precision,
  label_lng double precision,
  label_lat double precision,
  boundary geometry(MultiPolygon, 4326),
  bbox_min_lng double precision,
  bbox_min_lat double precision,
  bbox_max_lng double precision,
  bbox_max_lat double precision,
  source text,
  source_id text,
  source_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_regions_level_check check (
    level in ('country', 'province', 'prefecture', 'county')
  ),
  constraint admin_regions_parent_adcode_fkey
    foreign key (parent_adcode)
    references public.admin_regions (adcode)
    on update cascade
    on delete restrict
);

comment on table public.admin_regions is 'Canonical administrative geography table for China country/province/prefecture/county regions and their EPSG:4326 MultiPolygon boundaries.';
comment on column public.admin_regions.level is 'Coarse hierarchy used by Map Studio: country, province, prefecture, or county. It intentionally does not encode legal administrative type.';
comment on column public.admin_regions.admin_type is 'Specific administrative type such as province, autonomous_region, municipality, special_administrative_region, prefecture_city, autonomous_prefecture, league, district, county, county_level_city, or province_direct_administered.';
comment on column public.admin_regions.boundary is 'Administrative boundary stored as PostGIS geometry(MultiPolygon, 4326).';
comment on column public.admin_regions.parent_adcode is 'Immediate known parent adcode. For municipalities, county-level children may point directly to the municipality.';
comment on column public.admin_regions.province_adcode is 'Province-level ancestor adcode for filtering and cache grouping.';
comment on column public.admin_regions.prefecture_adcode is 'Prefecture-level ancestor adcode when one exists; may be null for municipalities or province-administered county-level units.';

create index if not exists admin_regions_level_idx
  on public.admin_regions (level);

create index if not exists admin_regions_parent_adcode_idx
  on public.admin_regions (parent_adcode);

create index if not exists admin_regions_province_adcode_idx
  on public.admin_regions (province_adcode);

create index if not exists admin_regions_prefecture_adcode_idx
  on public.admin_regions (prefecture_adcode);

create index if not exists admin_regions_boundary_gist_idx
  on public.admin_regions
  using gist (boundary);

drop trigger if exists admin_regions_updated_at on public.admin_regions;
create trigger admin_regions_updated_at
before update on public.admin_regions
for each row
execute function public.update_updated_at_column();
