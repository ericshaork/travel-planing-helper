-- Wanderly v2.0.5 Step3 sample ingest upsert support.
-- The expression dedupe index from 011 remains the strict data-quality guard.
-- This additional index gives Supabase/PostgREST a plain-column conflict target
-- for place_facts upsert while preserving null-as-equal semantics.

create unique index if not exists place_facts_dedupe_columns_nulls_not_distinct_idx
  on public.place_facts (
    place_id,
    fact_type,
    source_provider,
    source_external_id,
    language
  )
  nulls not distinct;
