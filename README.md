# 漫游草签 / AI 自由行规划

一个面向自由行新手的 Next.js 旅行规划网站。它先帮用户把需求整理出来，再结合 AI、天气、POI、路线和地图生成一版可执行的出行方案。

## 当前状态

当前仓库已完成 `v1.6 phase 8`，`v1.6` 主体功能已经收口。

已完成能力：

- `/` landing
- `/create` 创建需求
- `/plan` 最终确认
- `/result` 结果工作台
- AI 生成旅行计划
- 高德 POI / Route / JS 地图
- 和风天气
- Supabase Auth 基础接入
- Email magic link 登录
- 登出
- `profiles` / `trip_plans` 表与 RLS
- 在 `/result` 保存当前计划
- `/trips` 我的行程列表
- 从 `/trips` 打开历史计划回到现有 `/result`
- 更新已保存计划
- 删除已保存计划
- localStorage 继续作为前端工作台临时态
- Supabase 作为云端持久态

## v1.6 明确没做

- 不做 UI 大修
- 不做分享链接
- 不做多人协作
- 不做多版本历史
- 不做 `/trips/[id]` 独立详情页
- 不做地图选点
- 不做拖拽编辑
- 不做自动重排
- 不把 `/result` 改成数据库驱动页面

## 关键设计边界

- 主链路仍然是 `/create -> /plan -> /result`
- `TripRequest` / `TripPlan` schema 没改
- 历史计划打开流程仍然是：
  1. `/trips` 请求详情 API
  2. 取回完整 JSON
  3. 写回现有 localStorage key
  4. 跳转回 `/result`
- `savedTripId` metadata 用来区分“保存新计划”还是“更新已保存计划”
- 点击“创建新计划”或进入新建流时，会清理旧的 `savedTripId`

## Supabase 环境变量边界

前端可用：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

仅服务端可用：

- `SUPABASE_SERVICE_ROLE_KEY`

说明：

- 浏览器端只允许使用 `anon key`
- `service role key` 不能进入前端 bundle
- 普通登录、保存、列表、详情、更新、删除链路使用 `bearer token + anon key + RLS`
- 不信任前端传入的 `user_id`

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 检查命令

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

## 相关文档

- [docs/PRD_v1.6.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.6.md)
- [docs/TECH_DESIGN_v1.6.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.6.md)
- [docs/V1.6_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.6_PHASE_PLAN.md)
- [docs/SUPABASE_SETUP_v1.6.md](/C:/Users/10200/Desktop/travel_planing/docs/SUPABASE_SETUP_v1.6.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
