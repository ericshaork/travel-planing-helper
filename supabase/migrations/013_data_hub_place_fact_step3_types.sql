-- Wanderly v2.0.5 Step3 place fact type expansion.
-- Step3 sample ingest stores provider-backed address/category/coordinate facts
-- as normalized evidence instead of raw provider payloads.

alter table public.place_facts
  drop constraint if exists place_facts_fact_type_check;

alter table public.place_facts
  add constraint place_facts_fact_type_check check (
    fact_type in (
      'intro',
      'opening_hours',
      'ticket_info',
      'recommended_duration',
      'best_time_to_visit',
      'crowd_level',
      'accessibility',
      'phone',
      'website',
      'image',
      'booking_url',
      'official_notice',
      'tags',
      'suitability',
      'address',
      'coordinate',
      'category'
    )
  );
