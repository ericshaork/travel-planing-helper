import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "005_user_settings.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("user_settings supabase migration", () => {
  it("创建了 user_settings 表和默认 json 字段", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.user_settings/i);
    expect(migrationSql).toMatch(/user_id uuid not null unique references auth\.users/i);
    expect(migrationSql).toMatch(/travel_preferences_json jsonb not null default/i);
    expect(migrationSql).toMatch(/workspace_preferences_json jsonb not null default/i);
    expect(migrationSql).toMatch(/ai_preferences_json jsonb not null default/i);
  });

  it("开启了 user_settings 的 RLS 和 own policies", () => {
    expect(migrationSql).toMatch(/alter table public\.user_settings enable row level security/i);
    expect(migrationSql).toMatch(/create policy "user_settings_select_own"/i);
    expect(migrationSql).toMatch(/create policy "user_settings_insert_own"/i);
    expect(migrationSql).toMatch(/create policy "user_settings_update_own"/i);
    expect(migrationSql).toMatch(/create policy "user_settings_delete_own"/i);
    expect(migrationSql).toMatch(/\(select auth\.uid\(\)\) = user_id/i);
  });

  it("复用了 updated_at trigger，并让新用户自动拥有默认 settings", () => {
    expect(migrationSql).toMatch(/create trigger user_settings_updated_at/i);
    expect(migrationSql).toMatch(/execute function public\.update_updated_at_column\(\)/i);
    expect(migrationSql).toMatch(/insert into public\.user_settings \(user_id\)/i);
    expect(migrationSql).toMatch(/on conflict \(user_id\) do nothing/i);
  });
});
