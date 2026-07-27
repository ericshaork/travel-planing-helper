# Phase 1 Step 2A Changelog

## 新增文件

- `supabase/migrations/007_travel_projects.sql`

## 新增数据库对象

### 新表

- `public.travel_projects`
- `public.travel_project_versions`
- `public.travel_project_sources`
- `public.travel_project_messages`

### 索引

- `travel_projects_user_id_lifecycle_state_idx`
- `travel_projects_user_id_last_activity_at_desc_idx`
- `travel_project_versions_project_id_version_number_desc_idx`
- `travel_project_sources_project_id_created_at_desc_idx`
- `travel_project_messages_project_id_created_at_asc_idx`

### Trigger

- `travel_projects_updated_at`
- `travel_project_versions_updated_at`
- `travel_project_sources_updated_at`

## 字段说明摘要

### `travel_projects`

- 保存项目身份、生命周期和当前 flow 阶段。
- `current_version_id` 本次只预留字段，不添加外键，避免循环依赖。

### `travel_project_versions`

- 保存项目版本快照。
- 使用 `trip_plan_json` 保存完整 `TripPlan` snapshot。
- 使用 `(project_id, version_number)` 保证版本号唯一。

### `travel_project_sources`

- 保存项目来源记录。
- `source_payload_json` 使用 `jsonb` 存储来源 payload。

### `travel_project_messages`

- 保存轻量项目级 AI 上下文。
- 当前仅包含 `role`、`content`、`created_at`。

## 安全策略

- 所有新表均已开启 RLS。
- `travel_projects` 直接使用 `auth.uid() = user_id` 进行 own-only 访问控制。
- `travel_project_versions` / `travel_project_sources` / `travel_project_messages`
  通过 `project_id -> travel_projects.id` 反查项目归属用户，再判断 `auth.uid() = travel_projects.user_id`。
- 每张表均包含：
  - `select_own`
  - `insert_own`
  - `update_own`
  - `delete_own`

## 未完成事项

- 未为 `travel_projects.current_version_id` 添加外键。
- 未创建任何新 API、前端接入或数据服务层。
- 未迁移旧 `trip_plans` 数据。
- 未修改 `trip_plans` 表、旧保存流程、Workspace 或 My Trips。
