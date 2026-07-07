# Supabase Setup v1.6

## 1. 这份文档覆盖什么

这份文档用于把 `v1.6` 需要的 Supabase 配置一次写清楚，包括：

- Supabase 项目创建
- URL / anon key / service role key
- `.env.local` 配置
- Netlify 环境变量配置
- migration 执行
- Data API 暴露表检查
- Auth redirect URL 配置
- email magic link 检查

它对应的是 `v1.6` 最终态，不再只限于 phase 1 或 phase 2。

## 2. 创建 Supabase 项目

1. 打开 Supabase Dashboard
2. 创建一个新项目
3. 记录以下信息

- `Project URL`
- `Publishable key / anon key`
- `Secret key / service_role key`

## 3. 本地 `.env.local` 怎么填

在项目根目录创建或更新 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

填写规则：

- `NEXT_PUBLIC_SUPABASE_URL`：填 Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：填 anon / publishable key
- `SUPABASE_SERVICE_ROLE_KEY`：填 service role secret key

注意：

- 前两个允许进入前端
- `SUPABASE_SERVICE_ROLE_KEY` 只能服务端使用
- 不要提交 `.env.local`
- 不要把 secret key 发到前端、日志或截图里

## 4. Netlify 环境变量怎么填

在 Netlify 项目环境变量里新增：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

要求：

- `SUPABASE_SERVICE_ROLE_KEY` 必须按 secret 管理
- 不要把 service role key 放进任何 `NEXT_PUBLIC_` 变量
- 如果刚改过环境变量，部署前建议执行一次 `Clear cache and deploy`

## 5. 执行 migration

当前 migration 文件：

- `supabase/migrations/001_init_v1_6_auth_trips.sql`

推荐做法：

1. 打开 `Supabase Dashboard -> SQL Editor`
2. 新建一个 query
3. 粘贴 `001_init_v1_6_auth_trips.sql` 全部内容
4. 点击 `Run`

## 6. Data API 与暴露表检查

确认 Supabase Data API 已开启，并检查暴露表包含：

- `profiles`
- `trip_plans`

这两张表用于 `v1.6` 的列表、详情、保存、更新、删除链路。

## 7. migration 执行后检查项

### 表

在 `Database -> Tables` 确认存在：

- `public.profiles`
- `public.trip_plans`

### 字段

确认：

- `profiles.id` 关联 `auth.users.id`
- `trip_plans.user_id` 关联 `auth.users.id`
- `trip_plans.trip_request_json` 与 `trip_plans.trip_plan_json` 是 `jsonb`
- `created_at` / `updated_at` 存在

### RLS

确认两张表都已开启 RLS：

- `profiles`
- `trip_plans`

### Policies

至少应存在：

- `profiles_select_own`
- `profiles_insert_own`
- `profiles_update_own`
- `trip_plans_select_own`
- `trip_plans_insert_own`
- `trip_plans_update_own`
- `trip_plans_delete_own`

核心条件应为：

- `profiles`: `auth.uid() = id`
- `trip_plans`: `auth.uid() = user_id`

### Trigger

确认这些 trigger 已存在：

- `profiles_updated_at`
- `trip_plans_updated_at`
- `on_auth_user_created`

## 8. Authentication URL Configuration

在 Supabase Auth 设置中至少确认：

- 本地 `Site URL`: `http://localhost:3000`
- 本地 Redirect URL: `http://localhost:3000/*`

上线后还要补：

- 生产 `Site URL`: 你的正式域名
- 生产 Redirect URL: 正式域名及需要的路径范围

## 9. Email magic link 检查

`v1.6` 使用 email magic link 登录。请确认：

- Email provider 已启用
- 发信配置可用
- 本地和生产 redirect URL 正确

## 10. 安全提醒

- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可前端使用
- `SUPABASE_SERVICE_ROLE_KEY` 只能服务端使用
- 不要提交 `.env.local`
- 不要在 issue、PR、聊天记录、截图中泄露 secret key
