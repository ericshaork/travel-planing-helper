# Wanderly Travel Guild 项目接管报告

## 1. 执行摘要

当前仓库是一个基于 Next.js App Router 的 AI 自由行规划网站，核心链路 `/create -> /plan -> /workspace|/result`、登录保存、历史行程、Explore 内容接口都已经落到代码中，可本地通过 `lint`、`build`、`typecheck`、`test`。依据 `package.json`、`app/`、`lib/`、`supabase/` 与测试文件，项目不是空壳，也不只是设计稿状态。

当前最接近的阶段判断是“`v1.7` 开发中而未收口”，不是纯 `v1.6`，也不是已完成的 `v1.7`。依据包括：大量 `v1.7` 文档与 Explore/Landing/Workspace 新组件已进入工作区但仍未提交（`docs/PRD_v1.7.md`、`components/explore/*`、`components/landing/LandingPage.tsx`、`components/workspace/WorkspaceRoutePage.tsx` 等），同时首页、Explore、Workspace 的产品目标与代码现状仍有差距。

最大的风险有三类：一是源码中大量中文文案已经出现乱码，直接影响用户可见文案与错误提示（如 `app/plan/page.tsx`、`app/api/generate-trip/route.ts`、`components/layout/Header.tsx`）；二是工作区存在大批未提交改动，且覆盖 Landing、Explore、Workspace、Supabase 类型、图片资产与文档，交接前必须把“当前事实”与“未完成方向”区分清楚（`git status --short`）；三是产品方向与代码现状并不完全一致，例如当前主入口仍是 Landing，而不是 Workspace（`app/page.tsx`、`components/landing/LandingPage.tsx`）。

建议下一步不要继续扩功能，先收口一轮“文本编码与 v1.7 页面结构对齐”。

## 2. 项目基本信息

| 项目项 | 结论 | 依据 |
| --- | --- | --- |
| 项目名称 | `travel-planning`；产品文档名称为 `Wanderly Travel Guild` | `package.json`，`docs/PRD_v1.7.md` |
| 产品定位 | AI 自由行规划网站，目标从“能生成行程”升级为“有产品感的旅行工作台” | `AGENTS.md`，`docs/PRD_v1.7.md` |
| 当前分支 | `main` | `git branch --show-current` |
| 最近 5 次提交 | `9963bec feat: add auth and saved trips v1.6`；`0bbfc25 feat: add real map workspace v1.5`；`ea24a09 feat: complete desktop workspace ui v1.4`；`6e71d83 feat: complete v1.3 route insights`；`25987bb feat: add qwen ai and mobile fixes for v1.2.5` | `git log -5 --oneline` |
| 工作区状态 | 脏工作区；大量 `M`、`D`、`??`，未提交 | `git status --short` |
| 运行状态 | 本地脚本可通过 `lint`、`build`、`typecheck`、`test` | `npm.cmd run lint/build/typecheck/test` |

## 3. 技术栈

| 技术 | 版本/形态 | 用途 | 依据 |
| --- | --- | --- | --- |
| Next.js | `16.2.9` | 前端框架、App Router、API Route | `package.json`，`app/` |
| React | `19.2.0` | UI 渲染 | `package.json` |
| TypeScript | `^6.0.3`，`strict: true` | 全站类型约束 | `package.json`，`tsconfig.json` |
| Tailwind CSS | `^4.3.2` | 样式工具 | `package.json`，`styles/globals.css` |
| ESLint | `^9.39.1` + `eslint-config-next` | Lint | `package.json` |
| Vitest | `^4.1.9` | 单元/集成测试 | `package.json`，`tests/` |
| Zod | `^4.1.12` | API 输入与 AI 输出 schema 校验 | `package.json`，`lib/trip/schema.ts`，`app/api/generate-trip/route.ts` |
| Supabase JS | `^2.110.0` | Auth、PostgreSQL、客户端/服务端读写 | `package.json`，`lib/supabase/*` |
| OpenAI-compatible Provider | 自研封装 | AI 解析与生成 | `lib/ai/openai-compatible.ts`，`lib/ai/client.ts` |
| Mock AI Provider | 自研封装 | 无真实 Key 时跑通链路 | `lib/ai/mock.ts`，`lib/ai/client.ts` |
| QWeather | 自研 Provider | 天气查询 | `lib/weather/qweather.ts`，`lib/weather/client.ts` |
| AMap Web Service | 自研 Provider | 服务端 POI / Route | `lib/poi/amap.ts`，`lib/route/amap.ts` |
| AMap JS SDK | 前端加载器 | 浏览器地图显示 | `lib/map/amap-loader.ts`，`lib/map/amap-env.ts` |
| localStorage 持久层 | 自研 | 未登录草稿、当前行程、本地编辑状态 | `lib/trip/storage.ts` |
| 表单方案 | React state + 自研步骤表单 | `/create`、`/plan` 表单与分步补全 | `components/trip/NaturalLanguageInput.tsx`，`components/trip/StepQuestionForm.tsx` |
| 路由方案 | Next.js App Router | 页面与 API 路由 | `app/` |
| 部署相关 | 未见站内部署脚本；Next 标准构建 | 生产构建 | `package.json` |
| 格式化工具 | 无独立 Prettier 依赖 | 无法确认存在单独格式化脚本 | `package.json` |

## 4. 项目目录结构

```text
app/
  api/
  create/
  explore/
  login/
  plan/
  result/
  trips/
  workspace/
components/
  auth/
  explore/
  landing/
  layout/
  map/
  trip/
  trips/
  workspace/
docs/
hooks/
lib/
  ai/
  explore/
  map/
  poi/
  route/
  supabase/
  trip/
  trips/
  utils/
public/
  images/
scripts/
supabase/
  migrations/
tests/
styles/
```

职责说明：

- 页面与路由：`app/`
- API Route：`app/api/*`
- 通用布局与头尾：`components/layout/*`
- 登录与用户态：`components/auth/*`
- Landing：`components/landing/*`
- Explore 页面与 Archive 视觉：`components/explore/*`
- 行程创建/编辑组件：`components/trip/*`
- Workspace/Result 工作台：`components/workspace/*`
- AI、天气、地图、Supabase、Trip 业务层：`lib/*`
- Supabase 迁移：`supabase/migrations/*`
- 测试：`tests/*`
- 图片资产：`public/images/*`
- 文档：`docs/*`

## 5. 页面与路由

| 路由 | 对应文件 | 页面用途 | 完成度 | 主要组件 | 是否需要登录 | 桌面端状态 | 移动端状态 | 已知问题 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | Landing 首页 | 部分完成 | `components/landing/LandingPage.tsx` | 否 | 已做全屏封面化重构 | 代码存在，但视觉效果未人工确认 | 首屏方向已变更，但仍不等于“Workspace 主入口” |
| `/create` | `app/create/page.tsx` | 新建旅行入口 | 部分完成 | `CreateModeSelector`、`NaturalLanguageInput` | 否 | 可用 | 基础可用 | 仍有阶段性占位与英文文案 |
| `/plan` | `app/plan/page.tsx` | 补全需求并触发生成 | 已完成但需修文案 | `ParsedTripCard`、`StepQuestionForm` | 否 | 可用 | 明确有 `mobileViewport` 分支 | 大量中文乱码 |
| `/result` | `app/result/page.tsx` | 结果页兼容入口 | 部分完成 | `WorkspaceRoutePage` | 否 | 工作台化进行中 | 无法确认 | 实际复用 Workspace 结构 |
| `/workspace` | `app/workspace/page.tsx` | 主工作台 | 部分完成 | `WorkspaceRoutePage` | 否 | 核心工作台已存在 | 无法确认 | 是否符合 v1.7 目标仍待收口 |
| `/explore` | `app/explore/page.tsx` | 旅行灵感/档案馆 | 部分完成 | `ExploreHome` | 否 | 已有 Archive/Featured/搜索结构 | 无法确认 | 仍处于 v1.7 重构中 |
| `/explore/[id]` | `app/explore/[id]/page.tsx` | Explore 详情页 | 部分完成 | Archive 详情壳组件 | 否 | 存在 | 无法确认 | 未单独验收 |
| `/trips` | `app/trips/page.tsx` | 我的行程/历史计划 | 已完成 | `SavedTripsList` | 是 | 可用 | 基础可用 | 文案仍有阶段感与乱码 |
| `/login` | `app/login/page.tsx` | 登录页 | 已完成 | `LoginForm` | 否 | 可用 | 基础可用 | 仅确认 Magic Link 登录，未见单独注册页 |
| `/api/parse-trip` | `app/api/parse-trip/route.ts` | 解析自然语言旅行需求 | 已完成 | `lib/ai/*` | 否 | API | API | 错误文案有乱码风险 |
| `/api/generate-trip` | `app/api/generate-trip/route.ts` | 生成结构化行程 | 已完成 | `lib/trip/planner.ts` | 否 | API | API | 错误文案有乱码风险 |
| `/api/enrich-trip` | `app/api/enrich-trip/route.ts` | 行程 enrich | 已完成 | `lib/trip/enrichTripPlan.ts` | 否 | API | API | 无法确认前端是否完整消费 |
| `/api/trips` | `app/api/trips/route.ts` | 保存与列出行程 | 已完成 | `lib/trips/*` | 是 | API | API | 依赖 bearer token |
| `/api/trips/[tripId]` | `app/api/trips/[tripId]/route.ts` | 读取/更新/删除单个行程 | 已完成 | `lib/trips/*` | 是 | API | API | 无法确认所有前端入口都已对齐 |
| `/api/explore` | `app/api/explore/route.ts` | Explore 列表 | 已完成 | `lib/explore/repository.ts` | 否 | API | API | 高级筛选已有参数但未全接数据库列 |
| `/api/explore/facets` | `app/api/explore/facets/route.ts` | Explore 分类 | 已完成 | `lib/explore/facets.ts` | 否 | API | API | 无法确认 UI 全量消费 |
| `/api/explore/[id]` | `app/api/explore/[id]/route.ts` | Explore 详情 | 已完成 | `lib/explore/repository.ts` | 否 | API | API | 无法确认全部字段都被前端使用 |
| `/settings` | 不存在 | 设置页 | 不存在 | 不存在 | 无法确认 | 不存在 | 不存在 | 文档提到 Sidebar 可能包含 Settings，但代码未见页面 |
| `/register` | 不存在 | 注册页 | 不存在 | 不存在 | 否 | 不存在 | 不存在 | 当前仅确认登录页 |
| 自定义 `loading.tsx` / `error.tsx` / `not-found.tsx` | 未发现 | 全局加载/错误/404 页面 | 不存在或无法确认 | 仅有 Next 默认 `/_not-found` | 否 | 默认 | 默认 | 未见自定义文件 |

## 6. 已完成功能

以下仅列出有代码证据的功能：

- 自然语言解析旅行需求：`app/api/parse-trip/route.ts`，`lib/ai/parseTrip.ts`
- 结构化生成 `TripPlan`：`app/api/generate-trip/route.ts`，`lib/trip/planner.ts`，`lib/trip/schema.ts`
- 生成前补全缺失字段：`app/plan/page.tsx`，`components/trip/StepQuestionForm.tsx`
- 生成后进入工作台/结果页：`app/result/page.tsx`，`app/workspace/page.tsx`，`components/workspace/WorkspaceRoutePage.tsx`
- 本地草稿持久化：`lib/trip/storage.ts`
- Magic Link 登录：`app/login/page.tsx`，`components/auth/LoginForm.tsx`，`lib/supabase/auth-client.ts`
- 登录状态展示与退出：`components/auth/UserMenu.tsx`
- Supabase 用户行程保存：`app/api/trips/route.ts`，`lib/trips/save-payload.ts`
- 历史行程列表：`app/trips/page.tsx`，`lib/trips/list-client.ts`
- 历史行程打开到工作台：`lib/trips/open-flow.ts`
- 历史行程删除：`app/api/trips/[tripId]/route.ts`，`lib/trips/delete-flow.ts`
- 天气 Provider 抽象与 QWeather/Mock 双实现：`lib/weather/provider.ts`，`lib/weather/qweather.ts`，`lib/weather/mock.ts`
- POI 与 Route Provider 抽象及高德实现：`lib/poi/*`，`lib/route/*`
- 前端地图加载与工作台地图面板：`lib/map/amap-loader.ts`，`components/workspace/MapPanel.tsx`
- Explore 列表、详情、分类 API：`app/api/explore/*`
- Explore 页面基础 UI：`app/explore/page.tsx`，`components/explore/ExploreHome.tsx`
- 测试覆盖 AI、天气、地图、Supabase、Explore、Trip：`tests/*`

## 7. 部分完成或占位功能

- Landing 产品化：已不是旧说明页，但当前实现仍只是第一轮封面化收口，且未把主入口切到 Workspace（`components/landing/LandingPage.tsx`，`app/page.tsx`）。
- Workspace v1.7 产品化：已引入 `WorkspaceRoutePage`、`WorkspaceLayout`、`TripWorkspace` 等新壳层，但是否完全达到“左行程 55% / 右地图 45%”与最终交互目标，需继续验收（`components/workspace/*`）。
- Explore v1.7 重构：Featured、搜索、Inspiration、Archive 抽屉已存在，但仍明显处于改造中（`components/explore/ExploreHome.tsx`、`components/explore/archive/*`）。
- Create 双模式：AI-assisted 可用；地图探索模式仍为占位说明（`app/create/page.tsx`）。
- 局部修改/批量修改：已有 `PendingChangesPanel`、`ModificationPanel`、`ModificationQuickActions` 等组件，但无法仅从本次审阅确认全部交互是否闭环（`components/trip/*`、`components/workspace/*`）。
- 导出：存在 `ExportActions` 组件，但未在本次审阅中完整验证导出格式和下载链路（`components/trip/ExportActions.tsx`）。
- 移动端：`/plan` 明确有移动分支；其余页面有响应式类名，但未做视觉验收（`app/plan/page.tsx`，`components/workspace/*`）。

## 8. 未实现功能

### 仅在文档/规划中出现

- Workspace 成为网站默认主入口：当前代码未实现，首页仍是 Landing（`app/page.tsx`）。
- Settings 页面：文档与侧边栏方向有提法，但无实际页面文件（未见 `app/settings/*`）。
- 单独 Register 页面：未发现路由文件（未见 `app/register/*`）。
- 分享功能：文档有方向，本次未见明确实现入口（无法确认）。
- 收藏功能：Explore 类型里有 `savedCount` 字段，但未见明确用户收藏 CRUD 界面（`lib/explore/types.ts`）。

### 代码中明确未完成或占位

- 地图探索创建模式：明确写着 “stays for a later phase”（`app/create/page.tsx`）。
- 更完整的 Explore 筛选落库：API 接收 terrain/cuisine/season/companion，但 repository 注释写明未来再接数据库列（`app/api/explore/route.ts`，`lib/explore/repository.ts`）。

## 9. Supabase 与数据结构

### 认证与客户端

- 浏览器端 Supabase 环境读取：`lib/supabase/env.ts`
- 浏览器端 client：`lib/supabase/browser.ts`
- 服务端 service-role client：`lib/supabase/server.ts`
- bearer token 访问 client：`lib/supabase/server.ts`
- 登录状态消费：`components/auth/useAuthStatus.ts`、`components/auth/UserMenu.tsx`

结论：

- 浏览器端与服务端 client 已分离。
- Auth 走 Supabase，前端登录，API 通过 bearer token 校验用户。

### 数据表与关系

- `profiles`：用户资料表，`id` 关联 `auth.users.id`（`supabase/migrations/001_init_v1_6_auth_trips.sql`）
- `trip_plans`：用户行程表，`user_id` 关联用户；保存 `trip_request_json`、`trip_plan_json`、`enrichment_json`、`weather_summary_json`（同上）
- `explore_trip_contents`：Explore 内容表（`supabase/migrations/002_explore_trip_contents.sql`，后续 `003`、`004` 追加扩展与授权）

### 代码中的主要类型

- Trip/Saved Trip：`lib/trip/types.ts`，`lib/supabase/types.ts`
- Explore：`lib/explore/types.ts`
- Supabase 行类型：`lib/supabase/types.ts`

### CRUD 状态

- 保存 Trip：`app/api/trips/route.ts` + `lib/trips/save-client.ts`
- 列表 Trip：`app/api/trips/route.ts` + `lib/trips/list-client.ts`
- 打开 Trip：`app/api/trips/[tripId]/route.ts` + `lib/trips/open-flow.ts`
- 更新 Trip：`app/api/trips/[tripId]/route.ts` + `lib/trips/update-flow.ts`
- 删除 Trip：`app/api/trips/[tripId]/route.ts` + `lib/trips/delete-flow.ts`

### RLS

- `profiles` 与 `trip_plans` 的 select/insert/update/delete policy 已在迁移中定义（`supabase/migrations/001_init_v1_6_auth_trips.sql`）。
- `explore_trip_contents` 至少有 published 内容对 `anon, authenticated` 的读策略（`supabase/migrations/002_explore_trip_contents.sql`，以及后续 `004_explore_trip_contents_grants.sql`）。

### Mock 与真实数据混用

- Trip 主链路支持 Mock AI、Mock Weather、Mock POI、Mock Route（`lib/utils/env.ts`、`lib/ai/client.ts`、`lib/weather/client.ts`、`lib/poi/client.ts`、`lib/route/client.ts`）。
- Explore 明显走真实 Supabase 表，但也存在本地图片与内容映射层（`lib/explore/repository.ts`、`lib/explore/image-resolver.ts`）。

## 10. AI、天气与地图

### AI

- Provider 选择：`lib/ai/client.ts`
- Prompt 位置：`lib/ai/prompts.ts`
- 解析入口：`app/api/parse-trip/route.ts`
- 生成入口：`app/api/generate-trip/route.ts`
- 输出 Schema：`lib/trip/schema.ts`
- Schema 校验：`app/api/generate-trip/route.ts` 使用 Zod
- 错误处理：`lib/utils/errors.ts` + 各 API route
- 超时：`LLM_TIMEOUT_MS`，见 `lib/utils/env.ts`、`lib/ai/client.ts`
- Mock/fallback：`USE_MOCK_AI=true` 时走 `MockLLMProvider`；真实模式缺配置会报错，不是静默回退（`lib/ai/client.ts`，`tests/ai/client.test.ts`）

### 天气

- Provider：QWeather 或 Mock（`lib/weather/client.ts`）
- 查询入口：`lib/weather/provider.ts`、`lib/weather/qweather.ts`
- 进入生成链路：`lib/trip/planner.ts`、`lib/trip/enrichTripPlan.ts`
- 缺 Key 行为：可走 Mock；若真实模式且缺 `QWEATHER_API_KEY` 会明确报错（`lib/weather/client.ts`）
- 错误处理：Provider 与 planner 层都有限定（`lib/weather/qweather.ts`、`lib/utils/errors.ts`）

### 地图 / POI / 路线

- 前端地图：高德 JS SDK（`lib/map/amap-loader.ts`）
- 服务端 POI：高德 Web Service（`lib/poi/amap.ts`）
- 服务端 Route：高德 Web Service（`lib/route/amap.ts`）
- 工作台地图组件：`components/workspace/MapPanel.tsx`、`InspectorMapPreview.tsx`
- 行程联动：存在工作台 Day 面板、点位列表、路线腿、point detail 等组件，说明地图与 itinerary 是联动设计（`components/workspace/*`）
- 展开/收缩：文档方向明确，但本次未逐个交互验收，无法确认所有状态（`docs/UI_AUDIT_v1.7.md`）

## 11. 图片和视觉资产

### 目录结构

`public/images` 当前一级目录为：

- `archive/`
- `brand/`
- `explore/`
- `icons/`
- `landing/`
- `stickers/`
- `ui/`
- `workspace/`
- `_source/`

依据：`Get-ChildItem public\\images -Directory`

### 规模

- `public/images` 文件总数：619
- 同时还有 `public/images.zip`

依据：`Get-ChildItem public\\images -Recurse -File | Measure-Object`，`git status --short`

### 当前已确认的页面引用

- Landing：`/images/landing/hero/hero-main.png`，`/images/brand/logo/logo-horizontal.png`（`components/landing/LandingPage.tsx`，`components/layout/Header.tsx`）
- Explore / Archive：大量使用 `/images/explore/*` 与 `/images/archive/*`（`components/explore/archive/*`）
- Workspace：大量使用 `/images/archive/*`、`/images/ui/*`、`/images/icons/*`（`components/workspace/*`，`lib/trip/workspace-asset-resolver.ts`）

### 资产结构与风险

- 与目标结构不完全一致：当前存在 `_source/`，不是文档中的 `_source-sheets/`；未见独立 `weather/`、`transport/` 一级目录，而是放在 `ui/weather` 与 `ui/transport` 下。
- 存在原始资源与运行时资源并存风险：`_source/`、`images.zip`、大量新文档都表明图片系统仍在整理中。
- 命名总体有主题性，但并未完全统一，如 `hero-main.png`、`archive-template-main.png`、`button-accent-soft.png`、`xiamen-city-card-alt.png` 混用多套规则。
- 从代码可见大量固定路径直连，路径一旦变更会有较高回归风险（例如 `components/workspace/*`、`components/explore/archive/*`）。
- 是否存在未引用图片、重复图片、带纸背景却被当透明素材使用的图片：本次未做逐文件比对，只能部分确认，完整结论“无法确认”。

## 12. UI/UX 当前状态

对照 `docs/UI_AUDIT_v1.7.md` 与代码现状：

- Landing 已开始从说明页改成封面页，`UI_AUDIT_v1.7.md` 提到的“首屏旅行视觉 + CTA”方向有代码落实，但是否最终达标仍未收口（`components/landing/LandingPage.tsx`）。
- Workspace 不是网站默认入口，`UI_AUDIT_v1.7.md` 中“工作台中心化”的更高阶段目标尚未实现（`app/page.tsx`）。
- Header 体系并未全站统一。Landing/Explore 可走 `minimal` 头部，但 Create/Plan/Trips/Login 仍走旧头部，且旧头部保留“我的行程”“不卖课，只帮你先想清楚”等文案与乱码（`components/layout/Header.tsx`）。
- Result/Workspace 已明显不是“长 AI 文章页”，而是工作台方向；但从工作区未提交文件看，布局与视觉仍在调整中（`components/workspace/*`）。
- Explore 已从“功能入口页”向“Travel Archive”过渡，但当前首屏仍同时承担搜索、灵感入口、Featured、Feed，信息层级仍在重构中（`components/explore/ExploreHome.tsx`）。
- 大面积黑色主按钮仍广泛存在于 Create、Plan、Trips、Login 等页面，不符合 `v1.7` 文档强调的浅色旅行手账方向（`app/create/page.tsx`、`app/plan/page.tsx`、`app/trips/page.tsx`、`app/login/page.tsx`）。
- 天气是否已经从“资料展示”转成“出行建议”：仅从本次审阅无法完全确认，文档长期将其列为待优化项（`docs/UI_AUDIT_v1.7.md`）。
- 旧版 phase 文案仍未完全清理，且有大量乱码，属于当前最明显的产品感问题之一。

### 与 `docs/UI_AUDIT_v1.7.md` 的对照

- 已部分修复：Landing 首屏方向、Explore 进入档案馆方向、Workspace 新壳层组件
- 仍存在：旧 Header、黑色主按钮、阶段性文案、Result/Workspace 最终布局未完全确认
- 新发现问题：源码级中文乱码已经进入用户可见页面与 API 错误返回

## 13. 桌面端与移动端状态

### 桌面端

- 明显是当前优先目标。`Explore` 使用 `max-w-[86rem]`，`Workspace` 新组件较多，文档也明确写 desktop 优先（`app/explore/page.tsx`，`docs/V1.7_PHASE_PLAN.md`）。
- Landing 与 Explore 都明显针对桌面首屏和宽屏容器做过调整。

### 移动端

- `/plan` 有独立移动视口逻辑，说明不是完全忽略移动端（`app/plan/page.tsx`）。
- 多数页面有 `sm:`、`lg:` 等响应式类，但本次未运行浏览器验收，不能证明真实表现。
- 综合判断：移动端是“有基础适配，但不是本阶段主优化对象”。精确体验状态无法确认。

## 14. 环境变量清单

以下只列代码中出现的变量名，不展示真实值：

| 变量名 | 用途 | 客户端/服务端 | 是否必需 | 缺失表现 | 依据 |
| --- | --- | --- | --- | --- | --- |
| `USE_MOCK_AI` | 控制是否走 Mock AI | 服务端 | 否 | 默认 true，可继续运行 | `lib/utils/env.ts` |
| `LLM_BASE_URL` | 真实 AI Base URL | 服务端 | 真实 AI 模式必需 | 明确报错 | `lib/utils/env.ts` |
| `LLM_API_KEY` | 真实 AI Key | 服务端 | 真实 AI 模式必需 | 明确报错 | `lib/utils/env.ts` |
| `LLM_MODEL` | 真实 AI 模型名 | 服务端 | 真实 AI 模式必需 | 明确报错 | `lib/utils/env.ts` |
| `LLM_TIMEOUT_MS` | AI 超时 | 服务端 | 否 | 回退默认 `120000` | `lib/utils/env.ts` |
| `USE_MOCK_POI` | 是否走 Mock POI | 服务端 | 否 | 默认 true | `lib/utils/env.ts` |
| `USE_MOCK_ROUTE` | 是否走 Mock Route | 服务端 | 否 | 默认 true | `lib/utils/env.ts` |
| `USE_MOCK_WEATHER` | 是否走 Mock Weather | 服务端 | 否 | 默认 true | `lib/utils/env.ts` |
| `POI_PROVIDER` | POI provider 选择 | 服务端 | 否 | 默认 mock | `.env.example`，`lib/poi/client.ts` |
| `ROUTE_PROVIDER` | Route provider 选择 | 服务端 | 否 | 默认 mock | `.env.example`，`lib/route/client.ts` |
| `WEATHER_PROVIDER` | Weather provider 选择 | 服务端 | 否 | 默认 mock | `.env.example`，`lib/weather/client.ts` |
| `AMAP_API_KEY` | 服务端高德 Web Service Key | 服务端 | 真实 POI/Route 模式必需 | 明确报错 | `lib/poi/client.ts`，`lib/route/client.ts` |
| `NEXT_PUBLIC_AMAP_JS_KEY` | 前端高德 JS SDK Key | 客户端 | 地图底图真实加载时必需 | 前端地图 fallback/报缺 key | `lib/map/amap-env.ts`，`lib/map/amap-loader.ts` |
| `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE` | 高德前端安全码 | 客户端 | 否 | 可缺省 | `lib/map/amap-env.ts` |
| `QWEATHER_BASE_URL` | 和风天气 Base URL | 服务端 | 否 | 有默认值 | `lib/weather/client.ts`，`lib/weather/qweather.ts` |
| `QWEATHER_API_KEY` | 和风天气 Key | 服务端 | 真实天气模式必需 | 明确报错 | `lib/weather/client.ts` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 客户端+服务端 | 登录/云存储必需 | 明确报错 | `lib/supabase/env.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 客户端+服务端 | 登录/浏览器 client 必需 | 明确报错 | `lib/supabase/env.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | 服务端 | Explore 导入/服务端 client 必需 | 明确报错 | `lib/supabase/env.ts` |

## 15. Git 状态与未提交修改

### 当前状态

- 分支：`main`
- 工作区：脏
- 未提交修改覆盖范围非常大，已进入“阶段性交接中间态”

### 已修改/新增的重点区域

- Landing / Header：`app/page.tsx`、`components/layout/Header.tsx`、`components/landing/*`
- Explore：`app/explore/*`、`app/api/explore/*`、`components/explore/*`、`lib/explore/*`
- Workspace / Result：`app/result/page.tsx`、`app/workspace/page.tsx`、`components/workspace/*`
- Trip 编辑链路：`components/trip/*`、`lib/trip/*`
- Supabase 类型与环境：`lib/supabase/*`
- 文档：大量 `docs/v1.7-*`
- 资产：`public/images/`、`public/images.zip`
- 测试：`tests/api/explore-*`、`tests/explore/*`、`tests/supabase/explore-*`

### 对这些改动的推断

- 很大概率属于 `v1.7` 的 Landing、Explore、Workspace UI 产品化与 Explore 数据接入阶段。
- 不是单点修复，而是一轮跨页面重构中的未提交工作区。
- 不应在不了解上下文前提下做 `reset`、`restore`、`clean` 或强制整理。

## 16. 验证结果

本次仅执行项目已有脚本，未安装新依赖，未修改业务代码来“修过关”。

| 命令 | 结果 | 摘要 |
| --- | --- | --- |
| `npm.cmd run lint` | 成功 | `eslint .` 通过 |
| `npm.cmd run build` | 成功 | `next build` 通过，生成 `/`、`/create`、`/explore`、`/plan`、`/result`、`/trips`、`/workspace` 等路由 |
| `npm.cmd run typecheck` | 成功 | `tsc --noEmit` 通过 |
| `npm.cmd test` | 成功 | `87` 个测试文件，`422` 个测试全部通过 |

结论：当前仓库在“代码质量门禁”层面是可运行的，但不等于产品层面已收口。

## 17. 已知问题和风险

### P0

- 大量中文乱码已进入用户可见页面与 API 错误信息，直接损伤产品可用性与交付质量：`app/plan/page.tsx`、`app/create/page.tsx`、`app/login/page.tsx`、`app/trips/page.tsx`、`components/layout/Header.tsx`、`app/api/generate-trip/route.ts`、`app/api/trips/route.ts`、`lib/explore/repository.ts`
- 工作区存在大规模未提交改动，且覆盖核心页面、核心组件、文档和图片资产；如果下一位 AI 不先厘清范围，极易误改或覆盖他人工作：`git status --short`
- 代码现状与部分产品叙述不一致，若直接按口头描述接手会误判现状。例如首页不是 Workspace，Settings/Register 页面不存在：`app/page.tsx`、`app/` 目录

### P1

- Header 与多页面文案体系未统一，旧版“阶段说明/内部交付语境”仍残留：`components/layout/Header.tsx`、`app/create/page.tsx`、`app/login/page.tsx`、`app/trips/page.tsx`
- Create 仍保留未完成模式占位，会误导用户认为地图探索已可用：`app/create/page.tsx`
- Explore 与 Workspace 都处于 v1.7 重构中，视觉与信息架构尚未完全定型：`components/explore/ExploreHome.tsx`、`components/workspace/*`
- 图片系统已很大，但结构仍在整理，存在原始资源、运行时资源、压缩包并存风险：`public/images/*`、`public/images.zip`

### P2

- `tsconfig.json` 依赖 `.next/types/**/*.ts` 与 `.next/dev/types/**/*.ts`，对本地构建目录有一定耦合：`tsconfig.json`
- Explore API 已接收多种筛选参数，但数据库查询暂未全量接线，未来容易出现“UI 有筛选、结果没生效”的认知偏差：`app/api/explore/route.ts`、`lib/explore/repository.ts`
- 文档数量很多，且不同阶段文档并存，后续继续迭代前需要防止“旧文档覆盖代码事实”：`docs/*`

## 18. 当前版本判断

当前最接近的版本状态是：`v1.7 开发中`。

判断依据：

- 已有 `v1.7` 文档群：`docs/PRD_v1.7.md`、`docs/UI_AUDIT_v1.7.md`、`docs/V1.7_PHASE_PLAN.md`
- 已有 `v1.7` 相关未提交代码：Landing、Explore、Workspace 新组件与新页面壳层
- 但 `v1.7` 目标并未完全落地：Workspace 不是首页主入口，Header/多页面文案仍未统一，视觉系统仍混杂旧阶段内容
- 最近正式提交仍停留在 `v1.6`：`9963bec feat: add auth and saved trips v1.6`

因此，不建议把当前仓库描述为“稳定的 v1.7 成品”，更像“在 v1.6 代码基线上推进中的 v1.7 UI 产品化分支工作区”。

## 19. 下一阶段建议

1. 先处理中文乱码与用户可见文案编码问题，覆盖 Header、Create、Plan、Login、Trips、API 错误消息。
2. 再统一 Header 与页面入口逻辑，明确 Landing、Explore、Workspace 的角色边界。
3. 针对 Workspace 做一次结构验收，确认是否真的达到“左行程、右地图、可编辑工作台”。
4. 针对 Explore 做一次结构验收，确认是否从“功能入口页”过渡为“旅行灵感大厅/档案馆”。
5. 最后再整理图片资产与文档，减少 `_source`、`images.zip`、多份阶段文档的交叉成本。

## 20. 建议交给下一位 AI 的第一项任务

### 任务

修复用户可见中文乱码，不改业务逻辑。

### 目标

把 Landing 之外仍存在乱码的页面文案、按钮文案、错误提示恢复为正常中文，保证产品可读。

### 涉及范围

- `components/layout/Header.tsx`
- `app/create/page.tsx`
- `app/plan/page.tsx`
- `app/login/page.tsx`
- `app/trips/page.tsx`
- `app/api/generate-trip/route.ts`
- `app/api/trips/route.ts`
- `lib/explore/repository.ts`

### 不应修改的内容

- AI pipeline 逻辑
- Supabase 逻辑
- Explore 数据结构
- Workspace 交互结构
- 图片资源路径

### 验收标准

- 页面中不再出现乱码中文
- API 返回的人类可读错误消息恢复正常中文
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run typecheck`
- `npm.cmd test`

## 21. 信息缺口

- 当前真实线上部署地址、部署平台与生产环境配置：无法确认
- 真实 Supabase 项目中的数据规模、用户规模、Explore 内容量：无法确认
- Explore 详情页、Workspace 复杂交互在浏览器中的真实视觉表现：本次未起浏览器，无法确认
- 移动端真实表现：仅能从代码推断存在基础适配，无法确认完整体验
- 收藏、分享、设置是否有外部系统或未提交代码：无法确认
- 当前未提交图片资产中哪些已经被运行时实际消费、哪些只是候选素材：无法确认
