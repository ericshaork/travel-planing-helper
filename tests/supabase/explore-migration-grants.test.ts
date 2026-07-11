import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "004_explore_trip_contents_grants.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("explore supabase grants migration", () => {
  it("grants service_role access to explore_trip_contents", () => {
    expect(migrationSql).toMatch(/grant usage on schema public to service_role/i);
    expect(migrationSql).toMatch(
      /grant select, insert, update on table public\.explore_trip_contents to service_role/i,
    );
  });
});
