# Wanderly v1.9 当前状态审计报告

> 审计日期：2026-07-27
> 审计基准：当前工作区代码（非 git HEAD）
> 审计方式：静态代码审计 + 测试执行，**未修改任何代码**
> 最后提交：`b44902b Integrate image pipeline into Wanderly main repository`

---

## 1. 项目总体状态

Wanderly 目前是一个 Next.js 16 + React 19 + Supabase 的旅行规划应用，已经走完 v1.6（登录/保存）、v1.7（视觉重构）、v1.8（Explore/Workspace/Auth/My Trips），当前正处在 **v1.9「旅行项目化 + 版本化 + AI 协作」** 的施工中段。

### 一句话结论

**主链路（五问 → 生成 V1 → AI 讨论 → 选版本 → 进工作台）已经打通并可用；但 v1.9 的全部代码尚未纳入版本控制，测试套件有 30 条红灯，且存在「旧 trip_plans」与「新 travel_projects」双轨数据模型尚未收敛。**

### 关键数字

| 指标 | 数值 | 说明 |
| --- | --- | --- |
| 代码规模 | ~50,600 行（components + lib + hooks） | 不含 image-pipeline |
| 路由页面 | 11 个 page + 22 个 API route | |
| 数据库表 | 8 张 | 分属两代数据模型 |
| 测试 | 749 条，**719 通过 / 30 失败** | 失败率 4% |
| **未纳入 git 的条目** | **178 项** | 含 `lib/projects/`、`app/api/projects/`、`components/create/` 全目录 |

### ⚠️ 最高优先级事实

`git ls-files lib/projects/` 返回空。v1.9 的核心架构——项目系统、版本系统、Revision Mode、AI provider 抽象——**全部处于未跟踪（untracked）状态**，最后一次提交停留在 v1.8.4。这意味着当前所有 v1.9 成果没有任何版本控制保护，一次误操作即全部丢失。

---

## 2. 页面完成度表

| 页面 | 路由 | 完成度 | 状态 |
| --- | --- | --- | --- |
| Landing | `/` | 95% | ✅ 稳定 |
| Explore 列表 | `/explore` | 90% | ✅ 可用 |
| Explore 档案详情 | `/explore/[id]` | 90% | ✅ 可用 |
| 收藏 | `/favorites` | 70% | ⚠️ 本地存储 |
| Create 入口 | `/create` | 85% | ⚠️ 文件导入为占位 |
| AI 五问 | `/create?source=ai` | 90% | ✅ 可用 |
| FirstPlanPage | `/create`（阶段内） | 85% | ✅ 可用 |
| **Revision Mode** | `/create`（阶段内） | **70%** | ⚠️ 建议无法应用 |
| Workspace | `/workspace` | 80% | ⚠️ 见第 6 节 |
| Result（旧） | `/result` | 80% | ⚠️ 与 Workspace 同源 |
| Plan（旧表单流） | `/plan` | 75% | ⚠️ 与新流程并存 |
| My Trips | `/trips` | 85% | ⚠️ 双轨数据 |
| Settings | `/settings` | 90% | ✅ 四个分区齐全 |
| Login | `/login` | 90% | ✅ 稳定 |

### 2.1 Landing（`components/landing/LandingPage.tsx`）

- **作用**：品牌入口，导向 Explore 与 Create。
- **已实现**：完整视觉叙事、v1.8.1 打磨过的氛围层、响应式。
- **未实现**：无个性化推荐、无登录态差异化。
- **问题**：无明显问题。
- **建议**：暂不投入，v1.9 收尾后再考虑登录态个性化。

### 2.2 Explore（`components/explore/`，`app/api/explore/`）

- **作用**：旅行档案浏览与导入来源。
- **已实现**：列表 + facets 筛选 + 详情档案阅读器（Cover/Intro/Itinerary/POI/Food）+ 收藏 + 两个出口（「让 AI 调整」/「导入工作台」）。
- **数据源**：多源合并——`normalized-source`（静态归档）、`repository`（Supabase `explore_trip_contents`）、`trip-packages/source`、`mock-archives`（兜底）。
- **未实现**：真实用户投稿、档案评分/评论。
- **问题**：数据源有四层兜底，**线上到底命中哪一层不易判断**，排障成本高。
- **建议**：给 `/api/explore` 响应加一个 `source` 标记字段（诊断用），不改逻辑。

### 2.3 Create / AI 创建流程（`components/create/CreateFlowRouter.tsx`）

- **作用**：项目创建总路由，按 `flowStage` 决定渲染哪个视图。
- **已实现**：`resolveCreateFlowView` 把 8 个 flowStage 映射为 chat / proposal / generating / workspace_preview / revision / resume 等视图；断点续传（reload 后回到正确阶段）。
- **未实现**：文件导入（`FileImportPlaceholder`，`app/create/page.tsx:111`「即将开放」）。
- **问题**：`CreateChatWorkspace.tsx` 已达 **1776 行**，承担五问、生成、FirstPlan、Revision Chat、Revision Edit 全部职责。
- **建议**：v1.9 收尾后按视图拆分，本阶段不动。

### 2.4 FirstPlanPage（`components/create/FirstPlanPage.tsx`，371 行）

- **作用**：第一版方案的确认页，提供两个出口。
- **已实现**：方案摘要渲染、「继续和 AI 调整」（`onAdjust` → Revision Mode）、「方式二·进入工作台」。
- **问题**：`handleAccept`（`:135`）只做 `router.replace("/workspace")`，**不显式写 versionId**，依赖 `generateCreateProposal` 早前 merge 进 session 的值。与 Revision Edit Mode 的显式 handoff 不一致。
- **建议**：统一走 `applyWorkspaceVersionHandoff`（P2）。

### 2.5 Revision Mode（AI 调整模式）

- **作用**：拿到 V1 后与 AI 讨论调整，并选择版本进入工作台。
- **已实现**：
  - `revisionMode: "chat" | "edit"` 双模式，默认 chat
  - Chat：真实 AI 调用，携带 tripPlan/tripRequest/五问历史/完整每日安排/对话历史
  - Edit：版本档案列表、点击切换、右侧摘要 + 每日路线、显式 workspace handoff
  - `reply` 与 `modification_suggestion` 两种响应形态均可展示
- **未实现**：**应用修改建议**（`RevisionSuggestionCard.tsx:111`「应用修改（即将开放）」），即 AI 给出建议后无法一键生成 V2。
- **问题**：这是 Revision Mode 体验的最大断点——用户能聊、能看建议，但**建议落不了地**。
- **建议**：作为 v1.9 剩余工作的第一优先级（见第 8 节 Step 3）。

### 2.6 Workspace（`components/workspace/`，`hooks/useTripWorkspaceState.ts`）

见第 6 节专项。

### 2.7 My Trips（`app/trips/page.tsx`）

- **作用**：已保存旅行列表，支持打开/更新/删除。
- **已实现**：列表 + 筛选 + 搜索 + 删除确认 + `last_opened_at` 标记 + 登录保护。
- **问题**：列表混合两类实体——旧 `trip_plans` 行与新 `travel_projects`（`entity_type: "project"`，`app/api/trips/route.ts:123`）。打开逻辑因此分叉（`lib/trips/open-flow.ts`）。
- **建议**：v1.9 收尾阶段统一为 project 实体（见 Step 6）。

### 2.8 Settings（`components/settings/SettingsPage.tsx`）

- **已实现**：四个分区全部落地——`TravelPreferenceSection`、`WorkspacePreferenceSection`（工作台默认 read/edit）、`AIPreferenceSection`、`AccountSection`；Supabase `user_settings` 持久化。
- **问题**：SSR 测试有 2 条红灯（文案漂移，非功能故障）。

### 2.9 Login / Auth（`components/auth/`）

- **已实现**：Supabase 邮箱登录、`returnTo` 回跳、`UserMenu`、`useAuthStatus`、RLS 全表覆盖。
- **已实现（开发用）**：`DEVELOPMENT_GUEST_PROJECT_HEADER` 游客旁路，仅部分接口支持。
- **问题**：游客旁路在 `revision-chat` 生效，但在 `restoreWorkspaceProjectVersionContext` **不生效**（无 token 直接返回 null），造成未登录态下 Workspace 只能读 localStorage。

---

## 3. 用户流程状态图

### 路径 A：首次进入 ✅ 已打通

```
Landing ✅ → Explore ✅ → /create?source=ai ✅ → 五问（5 轮）✅
  → generateCreateProposal → planTrip ✅ → V1 落库 ✅ → FirstPlanPage ✅
```

五问答完自动触发生成；`travel_project_versions` 写入一条 `version_status='accepted'`、`created_from='ai_generate'`、`setAsCurrent=true` 的记录，`tripRequestSnapshot` 一并落库。

### 路径 B：AI 调整 ⚠️ 半完成

```
FirstPlan ✅ → 继续和 AI 调整 ✅ → Revision Chat ✅（真实 AI，上下文完整）
  → modification_suggestion 展示 ✅ → 应用修改 ❌（即将开放）
  → Revision Edit ✅ → 选版本 ✅ → Workspace ✅
```

**断点在「应用修改」**：AI 能给出结构化建议（day/action/target/replacement/reason），但没有任何入口把它变成 V2。用户只能把建议记在脑子里，再去 Workspace 手动改，或用 Workspace 的 RegenerateBox 重新描述一遍。

### 路径 C：Explore 导入 ⚠️ 半完成

```
Explore 档案 ✅ → CreateMyVersion 两个出口：
  ├─ 「让 AI 调整」→ /create?source=explore_archive&archiveSlug=… ✅
  └─ 「导入工作台」→ 直接进 Workspace ✅
```

两条出口都已接通（`components/explore/CreateMyVersion.tsx:195`）。标记为半完成的原因：导入后的 tripPlan 由 `lib/explore/to-trip-draft.ts` 转换而来，字段完整度低于 AI 生成的计划（缺 weatherSummary/budgetSummary 细节），进 Workspace 后部分模块会显示空态。

### 路径 D：文件上传 ❌ 未实现

```
/create?source=file → FileImportPlaceholder（「即将开放」占位）
```

只有入口卡片和返回按钮，无拖拽区、无解析、无后端。

### 其它存量路径 ⚠️

- `/plan`（旧表单式五问）与 `/create` 新流程**并存**，两套入口都能创建计划。
- `/result` 与 `/workspace` 共用 `WorkspaceRoutePage`，仅 `mode` 不同。

---

## 4. 数据流状态

### 4.1 一个旅行计划目前保存在哪里？

**三处，同时存在：**

| 层 | 位置 | 内容 | 权威性 |
| --- | --- | --- | --- |
| 数据库（新） | `travel_project_versions.trip_plan_json` | 每个版本的完整 tripPlan + tripRequestSnapshot | **权威源** |
| 数据库（旧） | `trip_plans.trip_plan_json` | v1.6 保存的行程 | 遗留 |
| 浏览器 | `localStorage` 约 10 个 key | 当前工作副本 | 缓存/降级源 |

localStorage 关键 key（`lib/trip/storage.ts`）：`travel-planning:trip-plan`、`:trip-request`、`:trip-enrichment`、`:trip-weather-summary`、`:workspace-session`、`:restored-saved-trip` 等；外加 `lib/projects/session.ts` 的 `travel-planning:project-session`（`{projectId, versionId, sourceType, flowStage}`）。

### 4.2 版本系统是否真实存在？

**是，真实存在且落库。**

- 表：`travel_project_versions`，唯一约束 `(project_id, version_number)`，`version_number > 0`
- 状态：`draft | proposed | accepted`
- 来源：`ai_generate | ai_adjust | manual_edit | template_import | import_transform`
- RLS：select/insert/update/delete 四条策略均已启用

**版本创建路径有 3 条：**

1. `proposal-service.generateFromProposal` → V1，`accepted` + `setAsCurrent`（五问主链路）
2. `proposal-service.createProposal` → `proposed` 种子版本，`setAsCurrent=false`、`tripRequestSnapshot=null`（提案预览路径）
3. `workspace-ai-service.applyModification` → 新版本（Workspace 内 AI 改写）

### 4.3 V1/V2/V3 目前是什么状态？

- **V1**：真实存在，五问生成后即落库。
- **V2**：**只能从 Workspace 的 RegenerateBox 产生**，Revision Mode 无法产生。
- **V3+**：机制上可以（继续 regenerate），但 UI 无版本历史浏览。
- **Revision Mode 左栏的 V2/V3**：`buildRevisionPlaceholderEntry` 生成的**占位条目**（`lib/projects/revision-mode.ts`），标注「等待调整」、虚线、不可点击，**不是真实数据**。真实版本不足 3 条时才补位。

### 4.4 AI 修改模式读取哪个数据？

```
selectedRevisionVersion.id（左栏选中项，回落 session.versionId）
  → POST /api/projects/{id}/revision-chat
  → versionService.getVersion() → 该版本的 trip_plan_json + trip_request_snapshot_json
  → projectService.listProjectMessages() → 五问对话原文
```

**读的是数据库权威源，不是 localStorage。**

### 4.5 Workspace 读取哪个数据？

```
restoreWorkspaceProjectVersionContext()
  ├─ 有 token：读 session.versionId → GET /api/projects/{id} 或 /versions/{versionId}
  │            → 拿到 tripPlan → saveTripPlan() 覆盖 localStorage
  └─ 无 token：直接返回 null → 回落 loadTripPlan()（localStorage）
```

### 4.6 是否存在数据重复 / 不同步 / 旧版本覆盖？

| 风险 | 是否存在 | 说明 |
| --- | --- | --- |
| 数据重复 | **是** | 同一份 tripPlan 同时存在于 DB 版本行、localStorage、以及旧 `trip_plans` 行 |
| 状态不同步 | **是（有条件）** | 未登录/token 失效时 Workspace 只读 localStorage，与 DB 版本可能脱节 |
| 旧版本覆盖新版本 | **未发现** | Revision handoff 先写 `session.versionId` 再落盘，`restoreWorkspaceProjectVersionContext` 严格按 versionId 取版本 |

补充：`applyWorkspaceVersionHandoff` 的 `saveTripPlan` 已加 try/catch——若历史版本的 tripPlan 不符合当前 `tripPlanSchema`（例如 `days` 与 `dailyItinerary` 长度不一致），落盘会失败但不阻断跳转，登录态由服务端兜底。

---

## 5. AI 能力状态

### 5.1 Provider 层

| Provider | 状态 | 行为 |
| --- | --- | --- |
| `OpenAICompatibleConversationProvider` | ✅ 完成 | 发送 `systemPrompt` + `userPrompt`，`response_format: json_object`，当前指向 qwen-plus |
| `createMockAIProvider` | ⚠️ **有坑** | **完全忽略 systemPrompt/userPrompt**，返回 copilot 形状（reply/intent/action/nextStage） |

当前 `.env.local` 为 `USE_MOCK_AI=false`，真实 provider 生效。

**风险**：一旦切到 mock，revision-chat 的响应会被 schema 拒绝并降级成固定套话「我收到你的想法了…」，表现为「AI 读不到旅行计划」。

### 5.2 各 AI 能力清单

| 能力 | 文件 | 状态 | 说明 |
| --- | --- | --- | --- |
| 行程生成 | `lib/ai/generateTrip.ts`（966 行）、`prompts.ts` | ✅ 真实 | 含 JSON 修复重试（`JSON_REPAIR_SYSTEM_PROMPT`） |
| 行程解析 | `lib/ai/parseTrip.ts`、`parse-trip-normalize.ts` | ✅ 真实 | 自然语言 → tripRequest |
| 简易解析 | `lib/trip/simpleParser.ts` | ✅ 真实 | 无 AI 的规则兜底 |
| 五问对话 | `lib/projects/create-copilot-client.ts` + copilot route | ⚠️ 半真 | 五问的**转场话术是本地固定文案**（`resolveInterviewTransitionReply`），非 AI 生成 |
| Revision Chat | `lib/projects/revision-chat/` | ✅ 真实 | 上下文含完整每日安排 + 五问历史 + tripRequest |
| **应用修改建议** | — | ❌ **未实现** | 无任何代码路径 |
| Workspace AI 改写 | `lib/projects/workspace-ai/` | ✅ 真实 | `RegenerateBox` → `regenerateWorkspaceTrip` → 创建新版本；无 session/token 时降级到 `/api/generate-trip` |
| 天气 | `lib/weather/` | ✅ 真实 | QWeather |
| POI | `lib/poi/` | ✅ 真实 | 高德 |

### 5.3 「只是 UI」与「假流程」清单

- **只是 UI**：Revision 建议卡的「应用修改」按钮；`/create?source=file` 全页。
- **假流程**：Revision Mode 左栏的 V2/V3 占位版本（视觉上像版本历史，实为占位）。
- **半真**：五问的 AI 转场话术（本地文案，用户会误以为 AI 在回应）。

---

## 6. Workspace 状态

| 能力 | 完成度 | 说明 |
| --- | --- | --- |
| 1. 查看计划 | ✅ 90% | Read Mode 完整：行程、地图、天气、预算、住宿、交通 |
| 2. 编辑计划 | ⚠️ 75% | Edit Mode 可增删改点位、锁定、替换；`useTripWorkspaceState.ts` 达 1527 行 |
| 3. 版本进入 | ✅ 85% | 支持按 `session.versionId` 进入指定版本 |
| 4. 地图联动 | ⚠️ 70% | 高德 SDK + marker 联动 + `/api/map/route-estimate`（driving/walking/transit） |
| 5. AI 修改后进入 | ✅ 80% | `regenerateWorkspaceTrip` 生成新版本并 merge session |

**Read Mode**：`components/workspace/read/` 独立目录，结构清晰，完成度最高。

**Edit Mode**：核心状态集中在 `useTripWorkspaceState.ts`（1527 行，19 处 `setWorkspaceMode`），改动风险高。

**Map**：`AmapBaseMap.tsx` + `lib/map/amap-loader.ts`；路线模式不支持时降级为驾车估算（`lib/route/provider.ts:12`）。相关测试有 3 条红灯（`inspector-map-preview`、`inspector-point-list`、`read-empty-plan`）。

**问题**：
- Edit Mode 的编辑结果如何回写版本，与 Revision Mode 的版本选择之间没有统一约定
- 地图相关测试红灯未清

**下一步**：先清测试债确认地图模块无功能回归，再考虑 Edit Mode 回写版本。

---

## 7. Bug 与风险列表

### P0 — 阻塞主流程 / 不可逆风险

**P0-1｜v1.9 全部代码未纳入版本控制**
- 问题：178 项未跟踪，`lib/projects/`、`app/api/projects/`、`components/create/` 整目录不在 git 中；最后提交停在 v1.8.4。
- 原因：连续多轮功能开发未提交。
- 影响：误删/回滚/换机即全部丢失；无法 diff、无法回溯、无法协作。
- 建议阶段：**立即**（Step 1）。

### P1 — 影响核心体验

**P1-1｜AI 修改建议无法应用**
- 问题：`RevisionSuggestionCard` 的「应用修改」为 disabled 占位。
- 原因：功能未实现，前几轮明确排除在范围外。
- 影响：Revision Mode 的价值闭环断裂——能聊不能改，用户必须去 Workspace 重述一遍需求。
- 建议阶段：Step 3。

**P1-2｜测试套件 30 条红灯**
- 问题：`modification-intents`（13 条）、`itinerary-view`（2 条）、`trips/*`（4 条）、`settings/page`（2 条）、`workspace/*`（3 条）、`ai/client`（1 条）、`trip/create-modes`（1 条）、`e2e/*.spec.ts`（4 个文件）。
- 原因：三类——(a) 函数被重构后测试未更新（`buildBlockModificationRequest is not a function`）；(b) 文案漂移（settings/trips 空态文案）；(c) vitest 的 `include` 覆盖 `*.spec.ts`，把 playwright e2e 也收进来导致 import 失败。
- 影响：测试套件已失去回归门禁作用，新 bug 会被淹没在既有红灯里。
- 建议阶段：Step 2。

**P1-3｜未登录态 Workspace 与 DB 版本脱节**
- 问题：`restoreWorkspaceProjectVersionContext` 无 token 即返回 null，只能回落 localStorage。
- 原因：该函数未接入 `DEVELOPMENT_GUEST_PROJECT_HEADER` 游客旁路，而 `revision-chat` 接了。
- 影响：开发/游客态下选择历史版本进入 Workspace，实际加载的是本地缓存副本。当前已用「跳转前预落盘选中版本 tripPlan」缓解，但两条通道行为不一致。
- 建议阶段：Step 4。

### P2 — 体验优化

**P2-1｜数据双轨未收敛**
- 问题：`trip_plans`（旧）与 `travel_projects`（新）并存，My Trips 混合展示，打开逻辑分叉。
- 影响：维护成本翻倍，新功能须两边都改。
- 建议阶段：Step 6。

**P2-2｜Workspace 入口 handoff 不一致**
- 问题：FirstPlanPage 的「进入工作台」隐式依赖 session；Revision Edit 显式写 versionId。
- 影响：前者在 session 异常时可能进错版本。
- 建议阶段：Step 4。

**P2-3｜五问转场话术是本地固定文案**
- 问题：`resolveInterviewTransitionReply` 返回硬编码回复。
- 影响：用户以为在与 AI 对话，实际前 5 轮 AI 未介入。
- 建议阶段：Step 5。

**P2-4｜mock provider 会让 revision-chat 静默降级**
- 问题：mock 忽略 prompt，返回结构不匹配 → 降级为套话。
- 影响：切 mock 调试时会误判为「AI 读不到计划」。
- 建议阶段：Step 5。

**P2-5｜`CreateChatWorkspace.tsx` 1776 行 / `useTripWorkspaceState.ts` 1527 行**
- 影响：单文件承载过多职责，改动风险高。
- 建议阶段：v1.9 之后。

### P3 — 未来功能

- P3-1：文件导入（路径 D）全未实现。
- P3-2：版本历史浏览/对比/回滚。
- P3-3：Explore 导入的 tripPlan 字段完整度低于 AI 生成。
- P3-4：`/plan` 旧流程与 `/create` 新流程并存，未决定弃用时机。

---

## 8. 剩余施工路线

> 原则：不重新设计、不大规模重构，全部基于现有架构。

### Step 1｜把 v1.9 纳入版本控制（P0）

- **目标**：所有 v1.9 代码进入 git，建立可回溯基线。
- **涉及页面**：无（工程动作）。
- **涉及文件**：`lib/projects/`、`app/api/projects/`、`components/create/`、`components/workspace/read/`、`lib/ai/provider/`、`lib/trip-packages/`、`supabase/migrations/007`、`tests/` 等 178 项。
- **同时补 `.gitignore`**：当前已忽略 `/node_modules`、`/.next`、`*.tsbuildinfo`、`.env*`、`*.zip`；**尚未忽略**且不应入库的有 `test-results/`、`.playwright-mcp/`、`.codex-*.log`、`.codex-*.png`、`temp/`、`output/`，以及 `image-pipeline/**/assets/external/` 下的抓取图片。
- **验收标准**：`git status --porcelain | grep '^??'` 仅剩明确应忽略的产物；`git ls-files lib/projects/ | wc -l` > 0。

### Step 2｜清理测试债（P1）

- **目标**：测试套件回到全绿，恢复回归门禁。
- **涉及文件**：
  - `vitest.config.ts` — `include` 排除 `tests/e2e/**`
  - `tests/trip/modification-intents.test.ts` — 对齐重构后的导出（`buildBlockModificationRequest` 已不存在）
  - `tests/trip/itinerary-view.test.ts`、`tests/settings/page.test.tsx`、`tests/trips/*.test.tsx`、`tests/workspace/*.test.tsx`、`tests/ai/client.test.ts`、`tests/trip/create-modes.test.ts`
- **验收标准**：`npx vitest run` 0 失败；e2e 由 playwright 单独执行。

### Step 3｜打通「应用 AI 修改建议 → V2」（P1，v1.9 核心闭环）

- **目标**：Revision Chat 的 `modification_suggestion` 可一键应用并生成新版本。
- **涉及页面**：Revision Mode（chat）。
- **涉及文件**：
  - `components/create/RevisionSuggestionCard.tsx` — 启用 `onApply`
  - `components/create/CreateChatWorkspace.tsx` — 接 apply 回调、刷新 versions 快照
  - 复用 `lib/projects/workspace-ai/workspace-ai-client.ts` 的 `regenerateWorkspaceTrip`，把 `changes[]` 序列化为 `modificationRequest` 文本；**不新建服务**
  - `lib/projects/revision-mode.ts` — 新增纯函数 `buildModificationRequestFromChanges(changes)`
- **验收标准**：给出建议 → 点应用 → `travel_project_versions` 新增 `created_from='ai_adjust'` 记录 → 左栏 V2 从占位变真实 → 选中 V2 进 Workspace 显示新计划。

### Step 4｜统一版本 handoff 与游客态（P1/P2）

- **目标**：所有进入 Workspace 的入口都显式携带 versionId；游客态行为一致。
- **涉及页面**：FirstPlanPage、Revision Edit、My Trips。
- **涉及文件**：`components/create/FirstPlanPage.tsx`（`handleAccept` 改走 `applyWorkspaceVersionHandoff`）、`lib/projects/workspace-context-client.ts`（接入 `DEVELOPMENT_GUEST_PROJECT_HEADER`）。
- **验收标准**：三个入口进入 Workspace 后 `session.versionId` 与实际加载版本一致；游客态与登录态加载同一版本。

### Step 5｜AI 体验补齐（P2）

- **目标**：消除「假 AI」观感与 mock 陷阱。
- **涉及文件**：`lib/projects/create-copilot-client.ts`（五问转场话术接 AI，保留本地兜底）、`lib/ai/provider/provider.ts`（mock provider 增加 revision 场景分支，返回合法 `reply`/`modification_suggestion`）。
- **验收标准**：`USE_MOCK_AI=true` 时 revision-chat 返回结构合法、不再走降级套话。

### Step 6｜数据双轨收敛（P2）

- **目标**：My Trips 统一为 project 实体。
- **涉及页面**：My Trips。
- **涉及文件**：`app/api/trips/route.ts`、`lib/trips/open-flow.ts`、`lib/trips/list-client.ts`、`lib/projects/trips/`。
- **验收标准**：新建旅行只写 `travel_projects`；旧 `trip_plans` 数据只读兼容；打开逻辑单一分支。

---

## 9. 下一阶段建议

### 立即做（本周）

1. **Step 1 提交代码**——这是唯一的不可逆风险，其它都能补救。建议按 PHASE 拆成若干提交而非一个巨型提交。
2. **Step 2 清测试债**——在动新功能前恢复门禁，否则 Step 3 的回归无法验证。

### 接着做（v1.9 收尾）

3. **Step 3 应用修改建议**——这是 v1.9「AI 协作」叙事的最后一块拼图。做完之后，路径 B 从「半完成」变「已打通」，产品故事才完整。
4. **Step 4 统一 handoff**——低成本，消除版本错乱的隐患。

### 可延后

5. Step 5、Step 6 属于打磨与债务清理，不阻塞 v1.9 发布。
6. 文件导入（路径 D）、版本历史浏览建议留到 v2.0，本轮只保留占位。

### 给接手者的三个提醒

- **改 `CreateChatWorkspace.tsx` 和 `useTripWorkspaceState.ts` 前先跑测试**——两个文件都超过 1500 行且近期高频改动。
- **Revision Mode 的模式状态是组件内部 effect 驱动**，`renderToStaticMarkup` 进不去该状态；纯逻辑请写进 `lib/projects/revision-mode.ts` 再测，组件串联以 `docs/MANUAL_ACCEPTANCE.md` 第 12 节手动验收为准。
- **版本权威源永远是 `travel_project_versions`**，localStorage 只是工作副本；任何新入口都应先写 `session.versionId`，再让 `restoreWorkspaceProjectVersionContext` 去取。

---

*本报告所有判断均基于当前工作区代码静态审计与测试执行结果，未做任何代码修改。*
