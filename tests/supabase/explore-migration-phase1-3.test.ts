import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "003_explore_trip_contents_phase1_3.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("explore supabase phase 1.3 migration", () => {
  it("adds phase 1.3 explore content columns", () => {
    expect(migrationSql).toMatch(/add column if not exists external_id text/i);
    expect(migrationSql).toMatch(/add column if not exists city_code text/i);
    expect(migrationSql).toMatch(/add column if not exists pace text/i);
    expect(migrationSql).toMatch(/add column if not exists budget_level text/i);
    expect(migrationSql).toMatch(/add column if not exists budget_note text/i);
    expect(migrationSql).toMatch(
      /add column if not exists highlights_json jsonb not null/i,
    );
  });

  it("adds filter indexes and unique importer identity", () => {
    expect(migrationSql).toMatch(
      /create unique index if not exists explore_trip_contents_external_id_uidx/i,
    );
    expect(migrationSql).toMatch(
      /create index if not exists explore_trip_contents_city_code_idx/i,
    );
    expect(migrationSql).toMatch(
      /create index if not exists explore_trip_contents_days_idx/i,
    );
  });

  it("updates status constraint from review to reviewing", () => {
    expect(migrationSql).toMatch(/set status = 'reviewing'/i);
    expect(migrationSql).toMatch(
      /status in \('draft', 'reviewing', 'published', 'archived'\)/i,
    );
  });
});
