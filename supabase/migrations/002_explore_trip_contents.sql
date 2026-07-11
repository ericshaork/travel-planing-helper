create table if not exists public.explore_trip_contents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  city text not null,
  country text,
  region text,
  trip_type text not null,
  theme text,
  days integer not null,
  tags text[] not null default '{}',
  status text not null default 'draft',
  review_status text not null default 'pending',
  image_prompt text,
  cover_image_url text,
  source_pipeline text not null default 'travel-content-pipeline',
  source_batch_id text,
  source_content_key text,
  source_file_path text,
  itinerary_days_json jsonb not null,
  poi_highlights_json jsonb not null default '[]'::jsonb,
  food_highlights_json jsonb not null default '[]'::jsonb,
  raw_content_json jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint explore_trip_contents_days_positive check (days > 0),
  constraint explore_trip_contents_status_check check (
    status in ('draft', 'review', 'published', 'archived')
  ),
  constraint explore_trip_contents_review_status_check check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  constraint explore_trip_contents_source_pipeline_check check (
    source_pipeline in ('travel-content-pipeline')
  )
);

create index if not exists explore_trip_contents_city_idx
  on public.explore_trip_contents (city);

create index if not exists explore_trip_contents_trip_type_idx
  on public.explore_trip_contents (trip_type);

create index if not exists explore_trip_contents_status_idx
  on public.explore_trip_contents (status);

create index if not exists explore_trip_contents_published_at_desc_idx
  on public.explore_trip_contents (published_at desc nulls last);

create index if not exists explore_trip_contents_source_batch_id_idx
  on public.explore_trip_contents (source_batch_id);

create index if not exists explore_trip_contents_tags_gin_idx
  on public.explore_trip_contents
  using gin (tags);

drop trigger if exists explore_trip_contents_updated_at on public.explore_trip_contents;
create trigger explore_trip_contents_updated_at
before update on public.explore_trip_contents
for each row
execute function public.update_updated_at_column();

alter table public.explore_trip_contents enable row level security;

drop policy if exists "explore_trip_contents_select_published" on public.explore_trip_contents;
create policy "explore_trip_contents_select_published"
on public.explore_trip_contents
for select
to anon, authenticated
using (status = 'published');
