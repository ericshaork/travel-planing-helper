create table if not exists public.travel_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  lifecycle_state text not null default 'new',
  current_flow_stage text,
  current_version_id uuid,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_projects_lifecycle_state_check check (
    lifecycle_state in (
      'new',
      'exploring',
      'planning',
      'proposed',
      'generating',
      'workspace',
      'editing',
      'archived'
    )
  ),
  constraint travel_projects_current_flow_stage_check check (
    current_flow_stage is null
    or current_flow_stage in (
      'source_received',
      'source_review',
      'clarifying',
      'proposal_ready',
      'proposal_adjusting',
      'generating',
      'workspace_ready',
      'abandoned'
    )
  )
);

create table if not exists public.travel_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.travel_projects (id) on delete cascade,
  version_number integer not null,
  version_status text not null default 'accepted',
  created_from text,
  trip_plan_json jsonb not null,
  trip_request_snapshot_json jsonb,
  proposal_summary_json jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_project_versions_project_version_number_key unique (project_id, version_number),
  constraint travel_project_versions_version_number_positive check (version_number > 0),
  constraint travel_project_versions_version_status_check check (
    version_status in ('draft', 'proposed', 'accepted')
  ),
  constraint travel_project_versions_created_from_check check (
    created_from is null
    or created_from in (
      'ai_generate',
      'ai_adjust',
      'manual_edit',
      'template_import',
      'import_transform'
    )
  )
);

create table if not exists public.travel_project_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.travel_projects (id) on delete cascade,
  source_type text not null,
  source_title text,
  source_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_project_sources_source_type_check check (
    source_type in (
      'blank_input',
      'explore_archive',
      'import_text',
      'uploaded_file',
      'existing_trip'
    )
  )
);

create table if not exists public.travel_project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.travel_projects (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint travel_project_messages_role_check check (
    role in ('system', 'user', 'assistant')
  )
);

create index if not exists travel_projects_user_id_lifecycle_state_idx
  on public.travel_projects (user_id, lifecycle_state);

create index if not exists travel_projects_user_id_last_activity_at_desc_idx
  on public.travel_projects (user_id, last_activity_at desc);

create index if not exists travel_project_versions_project_id_version_number_desc_idx
  on public.travel_project_versions (project_id, version_number desc);

create index if not exists travel_project_sources_project_id_created_at_desc_idx
  on public.travel_project_sources (project_id, created_at desc);

create index if not exists travel_project_messages_project_id_created_at_asc_idx
  on public.travel_project_messages (project_id, created_at asc);

drop trigger if exists travel_projects_updated_at on public.travel_projects;
create trigger travel_projects_updated_at
before update on public.travel_projects
for each row
execute function public.update_updated_at_column();

drop trigger if exists travel_project_versions_updated_at on public.travel_project_versions;
create trigger travel_project_versions_updated_at
before update on public.travel_project_versions
for each row
execute function public.update_updated_at_column();

drop trigger if exists travel_project_sources_updated_at on public.travel_project_sources;
create trigger travel_project_sources_updated_at
before update on public.travel_project_sources
for each row
execute function public.update_updated_at_column();

alter table public.travel_projects enable row level security;
alter table public.travel_project_versions enable row level security;
alter table public.travel_project_sources enable row level security;
alter table public.travel_project_messages enable row level security;

drop policy if exists "travel_projects_select_own" on public.travel_projects;
create policy "travel_projects_select_own"
on public.travel_projects
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "travel_projects_insert_own" on public.travel_projects;
create policy "travel_projects_insert_own"
on public.travel_projects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "travel_projects_update_own" on public.travel_projects;
create policy "travel_projects_update_own"
on public.travel_projects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "travel_projects_delete_own" on public.travel_projects;
create policy "travel_projects_delete_own"
on public.travel_projects
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "travel_project_versions_select_own" on public.travel_project_versions;
create policy "travel_project_versions_select_own"
on public.travel_project_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_versions.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_versions_insert_own" on public.travel_project_versions;
create policy "travel_project_versions_insert_own"
on public.travel_project_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_versions.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_versions_update_own" on public.travel_project_versions;
create policy "travel_project_versions_update_own"
on public.travel_project_versions
for update
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_versions.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
)
with check (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_versions.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_versions_delete_own" on public.travel_project_versions;
create policy "travel_project_versions_delete_own"
on public.travel_project_versions
for delete
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_versions.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_sources_select_own" on public.travel_project_sources;
create policy "travel_project_sources_select_own"
on public.travel_project_sources
for select
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_sources.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_sources_insert_own" on public.travel_project_sources;
create policy "travel_project_sources_insert_own"
on public.travel_project_sources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_sources.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_sources_update_own" on public.travel_project_sources;
create policy "travel_project_sources_update_own"
on public.travel_project_sources
for update
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_sources.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
)
with check (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_sources.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_sources_delete_own" on public.travel_project_sources;
create policy "travel_project_sources_delete_own"
on public.travel_project_sources
for delete
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_sources.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_messages_select_own" on public.travel_project_messages;
create policy "travel_project_messages_select_own"
on public.travel_project_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_messages.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_messages_insert_own" on public.travel_project_messages;
create policy "travel_project_messages_insert_own"
on public.travel_project_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_messages.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_messages_update_own" on public.travel_project_messages;
create policy "travel_project_messages_update_own"
on public.travel_project_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_messages.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
)
with check (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_messages.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);

drop policy if exists "travel_project_messages_delete_own" on public.travel_project_messages;
create policy "travel_project_messages_delete_own"
on public.travel_project_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.travel_projects
    where travel_projects.id = travel_project_messages.project_id
      and (select auth.uid()) = travel_projects.user_id
  )
);
