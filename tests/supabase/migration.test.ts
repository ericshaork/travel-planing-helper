import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "001_init_v1_6_auth_trips.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("supabase migration", () => {
  it("migration 文件存在并包含 profiles 表", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.profiles/i);
    expect(migrationSql).toMatch(/email text/i);
    expect(migrationSql).toMatch(/updated_at timestamptz not null default now\(\)/i);
  });

  it("migration 文件包含 trip_plans 表和核心字段", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.trip_plans/i);
    expect(migrationSql).toMatch(/user_id uuid not null references auth\.users/i);
    expect(migrationSql).toMatch(/trip_request_json jsonb not null/i);
    expect(migrationSql).toMatch(/trip_plan_json jsonb not null/i);
  });

  it("开启了两张表的 row level security", () => {
    expect(migrationSql).toMatch(/alter table public\.profiles enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.trip_plans enable row level security/i);
  });

  it("profiles policy 只允许用户访问自己的 profile", () => {
    expect(migrationSql).toMatch(/create policy "profiles_select_own"/i);
    expect(migrationSql).toMatch(/create policy "profiles_insert_own"/i);
    expect(migrationSql).toMatch(/create policy "profiles_update_own"/i);
    expect(migrationSql).toMatch(/\(select auth\.uid\(\)\) = id/i);
  });

  it("trip_plans policy 只允许用户访问自己的计划", () => {
    expect(migrationSql).toMatch(/create policy "trip_plans_select_own"/i);
    expect(migrationSql).toMatch(/create policy "trip_plans_insert_own"/i);
    expect(migrationSql).toMatch(/create policy "trip_plans_update_own"/i);
    expect(migrationSql).toMatch(/create policy "trip_plans_delete_own"/i);
    expect(migrationSql).toMatch(/\(select auth\.uid\(\)\) = user_id/i);
  });

  it("包含 updated_at function 和两个 updated_at trigger", () => {
    expect(migrationSql).toMatch(/create or replace function public\.update_updated_at_column\(\)/i);
    expect(migrationSql).toMatch(/create trigger profiles_updated_at/i);
    expect(migrationSql).toMatch(/create trigger trip_plans_updated_at/i);
  });

  it("包含自动创建 profile 的 auth.users trigger", () => {
    expect(migrationSql).toMatch(/create or replace function public\.handle_new_user\(\)/i);
    expect(migrationSql).toMatch(/after insert on auth\.users/i);
    expect(migrationSql).toMatch(/insert into public\.profiles/i);
  });

  it("不包含危险的公开读取策略或任何真实 key", () => {
    expect(migrationSql).not.toMatch(/trip_plans[\s\S]*using\s*\(\s*true\s*\)/i);
    expect(migrationSql).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(migrationSql).not.toMatch(/eyJ[a-zA-Z0-9\-_]+/);
  });
});
