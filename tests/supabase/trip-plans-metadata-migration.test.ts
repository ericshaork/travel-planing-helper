import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "006_trip_plans_metadata.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("trip_plans metadata migration", () => {
  it("adds metadata fields to trip_plans", () => {
    expect(migrationSql).toMatch(
      /add column if not exists source_type text not null default 'ai_generated'/i,
    );
    expect(migrationSql).toMatch(
      /add column if not exists status text not null default 'saved'/i,
    );
    expect(migrationSql).toMatch(
      /add column if not exists trip_preferences_json jsonb not null default '\{\}'::jsonb/i,
    );
    expect(migrationSql).toMatch(/add column if not exists local_draft_id text/i);
    expect(migrationSql).toMatch(/add column if not exists last_opened_at timestamptz/i);
  });

  it("adds source_type and status check constraints", () => {
    expect(migrationSql).toMatch(/trip_plans_source_type_check/i);
    expect(migrationSql).toMatch(
      /source_type in \('ai_generated', 'blank_manual', 'explore_import'\)/i,
    );
    expect(migrationSql).toMatch(/trip_plans_status_check/i);
    expect(migrationSql).toMatch(/status in \('draft', 'saved', 'archived'\)/i);
  });

  it("adds indexes without loosening own-only access", () => {
    expect(migrationSql).toMatch(/trip_plans_user_id_status_idx/i);
    expect(migrationSql).toMatch(/trip_plans_user_id_last_opened_at_desc_idx/i);
    expect(migrationSql).not.toMatch(/disable row level security/i);
    expect(migrationSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });
});
