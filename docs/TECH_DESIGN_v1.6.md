# TECH DESIGN v1.6

## 1. 目标

`v1.6` 的目标不是重写现有旅行生成链路，而是在尽量少动主流程的前提下补上：

- 登录
- 云端保存
- 我的行程列表
- 历史计划回到现有工作台
- 已保存计划更新与删除

主链路仍然是：

`/create -> /plan -> /result`

## 2. 核心原则

- `TripRequest` / `TripPlan` schema 不改
- `/result` 不改成纯数据库驱动
- localStorage 继续作为前端工作台当前态来源
- Supabase 负责 Auth 和云端持久态
- 历史计划打开流程继续使用“读数据库 -> 恢复 localStorage -> 跳转 `/result`”的过渡方案

## 3. 数据分工

### localStorage

负责：

- 当前浏览器会话内的草稿和工作台状态
- `/result` 现有读取逻辑
- 从历史计划恢复后的即时工作态
- `savedTripId` / `savedTripTitle` / `restoredAt` / `savedAt` metadata

### Supabase

负责：

- 身份认证
- 云端持久化保存
- 我的行程列表
- 历史行程详情
- 已保存行程更新 / 删除

## 4. 数据模型

### `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `email text`
- `display_name text`
- `avatar_url text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `trip_plans`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `destination_city text`
- `start_date date`
- `end_date date`
- `days integer`
- `budget numeric`
- `trip_request_json jsonb not null`
- `trip_plan_json jsonb not null`
- `enrichment_json jsonb`
- `weather_summary_json jsonb`
- `cover_image_url text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## 5. Supabase Auth 与 key 边界

前端只允许使用：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

仅服务端允许使用：

- `SUPABASE_SERVICE_ROLE_KEY`

规则：

- 前端永远不信任传入的 `user_id`
- 服务端必须先用 bearer token 解析真实 auth user
- 普通用户链路默认优先 `bearer token + anon key + RLS`
- phase 4/5/6/7 的保存、列表、详情、更新、删除都不使用 service role 绕过用户权限
- `service role key` 只保留在 `server-only` 文件中，作为未来管理型服务端能力备用

## 6. Helper 设计

### Browser helper

- `createSupabaseBrowserClient()`
- 只读取 `process.env.NEXT_PUBLIC_SUPABASE_URL`
- 只读取 `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 懒创建，不在模块顶层因缺 env 崩溃

### Server helper

- `createSupabaseServerClient()`
- 普通服务端操作使用 `anon key`

### Access token helper

- `createSupabaseAccessTokenClient(accessToken)`
- 使用 `anon key`
- 在服务端请求头里带 `Authorization: Bearer <token>`
- 用于普通用户 trip CRUD

### Service role helper

- `createSupabaseServiceRoleClient()`
- 位于 `lib/supabase/server.ts`
- 文件显式 `import "server-only"`
- 当前阶段不接入普通 trip CRUD

## 7. API 边界

当前已落地：

- `POST /api/trips`
- `GET /api/trips`
- `GET /api/trips/[tripId]`
- `PATCH /api/trips/[tripId]`
- `DELETE /api/trips/[tripId]`

### `POST /api/trips`

- 仅登录用户可用
- 服务端解析 bearer token
- `user_id` 以 `auth.getUser()` 的真实用户为准
- 保存完整 `trip_request_json` / `trip_plan_json` / `enrichment_json` / `weather_summary_json`

### `GET /api/trips`

- 仅登录用户可用
- 只返回轻量列表字段：
  `id,title,destination_city,start_date,end_date,days,budget,cover_image_url,created_at,updated_at`
- 不返回大 JSON 字段

### `GET /api/trips/[tripId]`

- 仅登录用户可用
- 使用 `bearer token + anon key + RLS`
- 只读取当前用户自己的 trip
- 返回恢复工作台所需完整字段

### `PATCH /api/trips/[tripId]`

- 仅登录用户可用
- 使用 `bearer token + anon key + RLS`
- 只允许更新当前用户自己的 trip
- 不信任客户端 `user_id`
- 更新字段包括：
  - `title`
  - `destination_city`
  - `start_date`
  - `end_date`
  - `days`
  - `budget`
  - `trip_request_json`
  - `trip_plan_json`
  - `enrichment_json`
  - `weather_summary_json`

### `DELETE /api/trips/[tripId]`

- 仅登录用户可用
- 使用 `bearer token + anon key + RLS`
- 只允许删除当前用户自己的 trip
- 不信任客户端 `user_id`

## 8. `savedTripId` 状态方案

新增本地 metadata：

- `savedTripId`
- `savedTripTitle`
- `restoredAt`
- `savedAt`

行为规则：

- 从 `/trips` 打开历史计划时，写入 `savedTripId` metadata
- 新计划首次保存时，走 `POST /api/trips`，成功后写入 `savedTripId`
- 已有 `savedTripId` 时，保存按钮走 `PATCH /api/trips/[tripId]`
- 点击“创建新计划”或开始新的创建流时，清理 `savedTripId`
- 重新生成仍留在当前上下文，保存时继续更新当前 `savedTripId`

## 9. localStorage 与 Supabase 的关系

- Supabase 是云端持久态
- localStorage 是当前工作台态
- `/result` 仍然读取 localStorage，而不是直接查库渲染
- `/trips` 打开历史计划时，先取详情，再恢复到本地存储，然后复用现有 `/result`

## 10. 删除交互

- `/trips` 每张卡片提供删除入口
- 删除前进行轻量确认
- 确认后调用 `DELETE /api/trips/[tripId]`
- 删除成功后从列表移除
- 删除失败显示友好错误
- 如果删掉的是当前工作台对应计划，会同步清理本地 `savedTripId`

## 11. 当前明确不做

- 不新增 `/trips/[id]` 独立详情页
- 不把 `/result` 改成服务端查库直出
- 不做 share link
- 不做多版本 diff / 历史
- 不改 AI / Weather / POI / Route 主链路
- 不做 v1.7 UI 大修
