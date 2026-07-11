import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "002_explore_trip_contents.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("explore supabase migration", () => {
  it("creates explore_trip_contents table with core fields", () => {
    expect(migrationSql).toMatch(
      /create table if not exists public\.explore_trip_contents/i,
    );
    expect(migrationSql).toMatch(/slug text not null unique/i);
    expect(migrationSql).toMatch(/trip_type text not null/i);
    expect(migrationSql).toMatch(/itinerary_days_json jsonb not null/i);
    expect(migrationSql).toMatch(/raw_content_json jsonb not null/i);
  });

  it("adds status checks and indexes", () => {
    expect(migrationSql).toMatch(/explore_trip_contents_status_check/i);
    expect(migrationSql).toMatch(/explore_trip_contents_review_status_check/i);
    expect(migrationSql).toMatch(/explore_trip_contents_tags_gin_idx/i);
  });

  it("enables read-only published access via RLS policy", () => {
    expect(migrationSql).toMatch(
      /alter table public\.explore_trip_contents enable row level security/i,
    );
    expect(migrationSql).toMatch(
      /create policy "explore_trip_contents_select_published"/i,
    );
    expect(migrationSql).toMatch(/to anon, authenticated/i);
    expect(migrationSql).toMatch(/using \(status = 'published'\)/i);
  });
});
