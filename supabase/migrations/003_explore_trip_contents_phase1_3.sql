alter table public.explore_trip_contents
  add column if not exists external_id text,
  add column if not exists city_code text,
  add column if not exists pace text,
  add column if not exists budget_level text,
  add column if not exists budget_note text,
  add column if not exists highlights_json jsonb not null default '[]'::jsonb;

update public.explore_trip_contents
set external_id = coalesce(external_id, source_content_key, slug)
where external_id is null;

update public.explore_trip_contents
set city_code = coalesce(
  city_code,
  nullif(regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g'), ''),
  'unknown'
)
where city_code is null;

update public.explore_trip_contents
set status = 'reviewing'
where status = 'review';

alter table public.explore_trip_contents
  alter column external_id set not null,
  alter column city_code set not null;

create unique index if not exists explore_trip_contents_external_id_uidx
  on public.explore_trip_contents (external_id);

create index if not exists explore_trip_contents_city_code_idx
  on public.explore_trip_contents (city_code);

create index if not exists explore_trip_contents_days_idx
  on public.explore_trip_contents (days);

alter table public.explore_trip_contents
  drop constraint if exists explore_trip_contents_status_check;

alter table public.explore_trip_contents
  add constraint explore_trip_contents_status_check check (
    status in ('draft', 'reviewing', 'published', 'archived')
  );
