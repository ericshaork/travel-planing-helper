alter table public.trip_plans
  add column if not exists source_type text not null default 'ai_generated',
  add column if not exists status text not null default 'saved',
  add column if not exists trip_preferences_json jsonb not null default '{}'::jsonb,
  add column if not exists local_draft_id text,
  add column if not exists last_opened_at timestamptz;

alter table public.trip_plans
  drop constraint if exists trip_plans_source_type_check;

alter table public.trip_plans
  add constraint trip_plans_source_type_check
  check (source_type in ('ai_generated', 'blank_manual', 'explore_import'));

alter table public.trip_plans
  drop constraint if exists trip_plans_status_check;

alter table public.trip_plans
  add constraint trip_plans_status_check
  check (status in ('draft', 'saved', 'archived'));

create index if not exists trip_plans_user_id_status_idx
  on public.trip_plans (user_id, status);

create index if not exists trip_plans_user_id_last_opened_at_desc_idx
  on public.trip_plans (user_id, last_opened_at desc nulls last);
