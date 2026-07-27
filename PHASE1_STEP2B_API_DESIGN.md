# Wanderly v1.9 Phase 1 Step 2B API Design

## 1. 当前 API 审计

### 1.1 当前 API route 列表

当前 `app/api/*` 路由包括：

- `/api/parse-trip`
- `/api/generate-trip`
- `/api/enrich-trip`
- `/api/trips`
- `/api/trips/[tripId]`
- `/api/user-settings`
- `/api/explore`
- `/api/explore/facets`
- `/api/explore/[id]`
- `/api/map/search`
- `/api/map/route-estimate`

### 1.2 每个 route 的职责

#### `/api/parse-trip`

职责：

- 解析自然语言旅行输入
- 提取 `TripRequestDraft`
- 返回缺失字段和追问问题

数据访问方式：

- 不落库
- 调用 `lib/ai/parseTrip`
- 通过 `lib/ai/client` 获取 LLM provider

特点：

- 是“输入理解 API”
- 不是项目 API

#### `/api/generate-trip`

职责：

- 根据 `TripRequest` 生成完整 `TripPlan`
- 合并天气和用户默认偏好

数据访问方式：

- 主要调用 `lib/trip/planner`
- `planner` 再调用：
  - LLM provider
  - weather provider
  - `user_settings`

特点：

- 是“生成引擎 API”
- 当前不负责 project identity
- 当前不负责持久化版本

#### `/api/enrich-trip`

职责：

- 基于现有 `TripPlan` 做结果增强
- 输出路线/补充分析数据

数据访问方式：

- 不落库
- 调用 `lib/trip/result-enrichment`

特点：

- 是“结果增强 API”
- 和项目生命周期无关

#### `/api/trips`

职责：

- `POST` 保存当前 trip 到 `trip_plans`
- `GET` 列出当前用户已保存 trip

数据访问方式：

- route 内直接创建 Supabase access-token client
- route 内直接查询 `trip_plans`
- 通过 `lib/trips/save-payload.ts` 做 payload 映射

特点：

- 是当前唯一的用户旅行持久化入口
- 面向的是“saved trip”，不是“travel project”

#### `/api/trips/[tripId]`

职责：

- `GET` 加载单个 saved trip
- `PATCH` 更新完整 saved trip 或 metadata
- `DELETE` 删除 saved trip

数据访问方式：

- route 内直接创建 Supabase access-token client
- route 内直接查询 / 更新 / 删除 `trip_plans`
- 完整更新时会用 `lib/trips/save-payload.ts`

特点：

- 依然是 `trip_plans` 语义
- 不是版本系统

#### `/api/user-settings`

职责：

- 读取当前用户设置
- 更新当前用户设置

数据访问方式：

- route 调用 `lib/settings/server.ts`
- `lib/settings/server.ts` 负责：
  - load or create row
  - row -> domain settings
  - settings -> row update

特点：

- 是当前最接近“route + service helper”的模块
- 可作为 Project API 的结构参考

#### `/api/explore`

职责：

- 返回 Explore 内容列表

数据访问方式：

- 优先使用静态 / package / normalized source
- 再 fallback 到 `lib/explore/repository`

特点：

- 已经有 repository 抽象
- 但更多是 content retrieval，不是用户项目业务

#### `/api/explore/facets`

职责：

- 返回 Explore 筛选维度

数据访问方式：

- 静态内容和 repository 混合读取

#### `/api/explore/[id]`

职责：

- 加载 Explore 单条内容详情

数据访问方式：

- 依次尝试 package content / normalized content / repository / mock

#### `/api/map/search`

职责：

- 地点搜索

数据访问方式：

- 调用 POI provider
- 不落库

#### `/api/map/route-estimate`

职责：

- 路线距离 / 时间估算

数据访问方式：

- 调用 route provider
- 不落库

### 1.3 当前数据访问方式总结

当前仓库大致有三种模式：

#### 模式 A：route 直接调业务函数

例如：

- `/api/parse-trip`
- `/api/generate-trip`
- `/api/enrich-trip`
- `/api/map/*`

特点：

- route 做输入校验
- 业务逻辑在 `lib/*` 函数
- 不一定访问数据库

#### 模式 B：route 直接调 Supabase

例如：

- `/api/trips`
- `/api/trips/[tripId]`

特点：

- route 同时承担：
  - auth 校验
  - schema 校验
  - DB query
  - response shaping

问题：

- route 过重
- 业务语义和表结构耦合过深

#### 模式 C：route + helper / repository

例如：

- `/api/user-settings` + `lib/settings/server.ts`
- `/api/explore/*` + `lib/explore/repository.ts`

特点：

- route 仍掌控 request/response
- `lib/*` 封装 row mapping 和 query 逻辑
- 分层相对更清晰

### 1.4 当前是否有 service layer

结论：

- 有“局部 service/helper/repository”，但没有统一的 API service architecture

当前可视为已有雏形的模块：

- `lib/settings/server.ts`
  - 偏 service/helper
- `lib/explore/repository.ts`
  - 明确 repository
- `lib/trip/planner.ts`
  - 明确 domain service

当前欠缺的模块：

- `trips` 没有稳定的 server-side service layer
- 没有 `projects` 的 domain service / repository / mapper

### 1.5 当前主要问题

#### 问题 1：`trip_plans` API 直接暴露旧数据模型

当前 `/api/trips` 和 `/api/trips/[tripId]` 直接围绕 `trip_plans` 设计。

后果：

- 无法表达 project lifecycle
- 无法表达多版本
- 无法表达 source records
- 无法表达 messages

#### 问题 2：route 过重，业务语义分散

`trip_plans` 路由里同时做：

- auth
- zod parse
- row mutation
- select fields 拼接
- error mapping

后果：

- 后续新增 `projects` 路由会复制很多逻辑
- 项目级事务和状态机难以管理

#### 问题 3：当前“生成”和“保存”完全断裂

现状：

- `/api/generate-trip` 只负责生成
- `/api/trips` 只负责保存结果

后果：

- 没有 project state machine
- 没有 proposal 持久化
- 没有 AI context 持久化

#### 问题 4：Workspace 和 Trips 都依赖旧 `trip_plans` 语义

现状：

- Workspace 吃 localStorage 中的 `TripPlan`
- My Trips 吃 `/api/trips` 返回的 `trip_plans`

后果：

- 新 `TravelProject` 不能直接复用现有数据访问接口

## 2. 新 Project API 设计

核心原则：

- API 不直接暴露数据库表
- API 以业务语义建模
- `TravelProject` 负责 identity + lifecycle
- `Version` 负责 snapshot
- `Source` 负责来源
- `Message` 负责轻量上下文

### 2.1 Project API

#### `POST /api/projects`

用途：

- 创建 `TravelProject` 身份

输入建议：

```ts
{
  title: string;
  sourceType: "blank_input" | "explore_archive" | "import_text" | "uploaded_file" | "existing_trip";
  initialMetadata?: {
    lifecycleState?: TravelProjectLifecycleState;
    flowStage?: TravelProjectFlowStage | null;
    sourceTitle?: string | null;
    sourcePayload?: Record<string, unknown> | null;
  };
}
```

行为建议：

- 创建 `travel_projects`
- 同时创建一条 `travel_project_sources`
- 不自动创建 version

输出建议：

```ts
{
  project: TravelProjectView;
}
```

这里的 `TravelProjectView` 应是业务对象，而不是原始 DB row。

#### `GET /api/projects/[projectId]`

用途：

- 加载项目当前状态

返回建议包括：

- project 基本信息
- current version summary
- lifecycle
- current flow stage
- source summary

建议输出：

```ts
{
  project: {
    id: string;
    title: string;
    lifecycleState: string;
    currentFlowStage: string | null;
    currentVersionId: string | null;
    lastActivityAt: string;
    createdAt: string;
    updatedAt: string;
  };
  currentVersion: {
    id: string;
    versionNumber: number;
    versionStatus: string;
    createdFrom: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  sources: Array<{
    id: string;
    sourceType: string;
    title: string | null;
    createdAt: string;
  }>;
}
```

注意：

- 默认不返回完整 message history
- 默认不返回完整 `TripPlan snapshot`
- 避免把一个项目详情接口做成“巨型响应”

#### `PATCH /api/projects/[projectId]/state`

用途：

- 更新项目状态

允许更新：

- `lifecycle_state`
- `current_flow_stage`
- `last_activity_at`

输入建议：

```ts
{
  lifecycleState?: TravelProjectLifecycleState;
  currentFlowStage?: TravelProjectFlowStage | null;
  touchActivity?: boolean;
}
```

语义建议：

- 这是“状态 API”，不是通用 patch row API
- 不允许通过它修改 title、source、version

### 2.2 Version API

#### `POST /api/projects/[projectId]/versions`

用途：

- 创建新版本

适用场景：

- AI 首次生成
- AI 根据反馈调整后用户确认
- 用户手动保存重要修改
- Explore 模板导入后生成
- Import 文本整理后生成

输入建议：

```ts
{
  versionStatus?: "draft" | "proposed" | "accepted";
  createdFrom?: "ai_generate" | "ai_adjust" | "manual_edit" | "template_import" | "import_transform" | null;
  tripPlan: TripPlan;
  tripRequestSnapshot?: TripRequest | null;
  proposalSummary?: Record<string, unknown> | null;
  setAsCurrent?: boolean;
}
```

行为建议：

- 查询当前项目已有最大 `version_number`
- 创建下一版
- 如果 `setAsCurrent = true`，同时更新 `travel_projects.current_version_id`
- 更新 `travel_projects.last_activity_at`

说明：

- 这是典型“业务事务”，不应放在 route 里拼 SQL 完成

#### `GET /api/projects/[projectId]/versions`

用途：

- 返回版本历史列表

返回建议：

- `versionNumber`
- `versionStatus`
- `createdFrom`
- `createdAt`
- `updatedAt`
- `id`

不建议：

- 默认把每个版本的完整 `trip_plan_json` 全量返回

#### `GET /api/projects/[projectId]/versions/[versionId]`

用途：

- 获取指定版本
- 用于 Workspace 恢复

返回建议：

```ts
{
  version: {
    id: string;
    projectId: string;
    versionNumber: number;
    versionStatus: string;
    createdFrom: string | null;
    tripPlan: TripPlan;
    tripRequestSnapshot?: TripRequest | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 2.3 Source API

#### `POST /api/projects/[projectId]/sources`

用途：

- 追加来源记录

支持：

- `blank_input`
- `explore_archive`
- `import_text`

输入建议：

```ts
{
  sourceType: "blank_input" | "explore_archive" | "import_text" | "uploaded_file" | "existing_trip";
  title?: string | null;
  payload?: Record<string, unknown> | null;
}
```

说明：

- 这不是“创建项目”主入口
- 更像后续补充来源、关联素材的子接口

#### `GET /api/projects/[projectId]/sources`

用途：

- 查询项目来源历史

返回建议：

- 轻量 source summary 列表
- 如有必要，再支持 `includePayload=true`

### 2.4 Message API

#### `POST /api/projects/[projectId]/messages`

用途：

- 追加项目级 AI 上下文

输入建议：

```ts
{
  role: "system" | "user" | "assistant";
  content: string;
}
```

行为建议：

- 写一条 message
- 顺便 touch `travel_projects.last_activity_at`

#### `GET /api/projects/[projectId]/messages`

用途：

- 获取项目消息

v1.9 建议：

- 支持 `limit`
- 默认按 `created_at asc`

输入建议：

- `?limit=50`

返回建议：

- 按时间顺序的 message list

明确边界：

- 不做复杂 thread
- 不做富消息结构
- 不做 tool log

## 3. Service 层设计

### 3.1 推荐代码结构

推荐目录：

```text
app/api/projects/route.ts
app/api/projects/[projectId]/route.ts
app/api/projects/[projectId]/state/route.ts
app/api/projects/[projectId]/versions/route.ts
app/api/projects/[projectId]/versions/[versionId]/route.ts
app/api/projects/[projectId]/sources/route.ts
app/api/projects/[projectId]/messages/route.ts

lib/projects/service.ts
lib/projects/repository.ts
lib/projects/rows.ts
lib/projects/schema.ts
lib/projects/types.ts
```

### 3.2 Route 层职责

Route 层应该只负责：

- 读取 request
- zod 校验输入
- 获取 access token user context
- 调用 project service
- 映射 HTTP response / error

Route 层不应该负责：

- 版本号递增逻辑
- current version 更新逻辑
- project/source/version/message 的跨表事务
- DB row 到 domain object 的复杂转换

### 3.3 Service 层职责

推荐 `lib/projects/service.ts` 作为核心业务层。

负责：

- create project
- load project summary
- update project state
- create version
- list versions
- get version detail
- append source
- append message

Service 层应该掌握：

- 业务语义
- 状态机规则
- 跨表更新顺序
- current version 指针更新
- last activity 更新

这是未来 AI Flow、Workspace、My Trips 都可复用的层。

### 3.4 Repository 层是否需要

推荐答案：

- 需要

原因：

#### 原因 1：`projects` 是真正的多表聚合领域

这次不是简单 CRUD 单表。

涉及：

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- `travel_project_messages`

如果没有 repository：

- route 或 service 会直接散落大量 `.from(...).select(...).insert(...)`

#### 原因 2：后续会有 row / domain / view model 三层映射

项目 API 需要：

- DB row
- domain model
- response view model

repository 可以稳定封装 row query 和 select fields。

#### 原因 3：便于后续事务化和测试

例如创建 version 时：

- 查当前最大 `version_number`
- 插入新版本
- 更新 `current_version_id`

这些逻辑最好让 service 调 repository，而不是 route 直接拼。

### 3.5 推荐 repository 边界

推荐 `lib/projects/repository.ts` 负责：

- `insertProject`
- `getProjectById`
- `updateProjectState`
- `listProjectVersions`
- `getProjectVersionById`
- `insertProjectVersion`
- `listProjectSources`
- `insertProjectSource`
- `listProjectMessages`
- `insertProjectMessage`

推荐 `lib/projects/rows.ts` 负责：

- row -> domain
- domain -> insert/update row

## 4. 数据流说明

### 4.1 新 AI Flow 的目标数据流

未来新 AI Flow 推荐：

1. 用户进入 Copilot
2. 调用 `POST /api/projects` 创建 project identity
3. source material 进入 `travel_project_sources`
4. clarifying / proposal 阶段写入 `travel_project_messages`
5. proposal 确认后创建 `travel_project_versions`
6. 同时更新 `travel_projects.current_version_id`
7. Workspace 通过 version detail 读取 `TripPlan`

### 4.2 Workspace 的目标数据流

未来 Workspace 不直接知道数据库表，而是：

1. 收到 `projectId`
2. 先调 `GET /api/projects/[projectId]`
3. 拿到 `currentVersionId`
4. 再调 `GET /api/projects/[projectId]/versions/[versionId]`
5. 用返回的 `TripPlan snapshot` 渲染

好处：

- Workspace 继续只依赖 `TripPlan`
- 版本和项目状态由 Project API 管理

### 4.3 My Trips 的目标数据流

未来 My Trips 的真正展示对象应是 `TravelProject`。

推荐：

- 新增 `GET /api/projects`
- 返回项目列表视图，而不是全量表 row

列表项建议字段：

- `projectId`
- `title`
- `lifecycleState`
- `currentVersionId`
- `lastActivityAt`
- `primarySourceType`

### 4.4 Explore 入口的目标数据流

未来 Explore 点击“用此档案创建”时：

1. 前端拿到 Explore 内容摘要
2. 调 `POST /api/projects`
3. `sourceType = explore_archive`
4. `sourcePayload` 中记录 `explore_trip_contents.id / slug / summary`

之后：

- `AI完善` 进入 Copilot flow
- `直接编辑` 未来可直接创建 version 或 blank workspace session
- `重新规划` 进入 project-based AI planning

## 5. 与现有系统兼容策略

### 5.1 不替换 `/api/generate-trip`

短期策略：

- `/api/generate-trip` 继续保留
- 它仍负责生成 `TripPlan`

未来关系：

- Project API 不负责生成内容本身
- Project API 负责保存生成上下文和结果

也就是说：

- `generate-trip` 是 engine
- `projects` 是 state + persistence layer

### 5.2 不替换 `trip_plans` API

短期策略：

- `/api/trips`
- `/api/trips/[tripId]`

继续保留给旧流程使用。

原因：

- 当前 `/trips` 和 `/workspace` 仍绑定旧流程
- 一次切换风险过高

### 5.3 AI Flow 如何逐渐调用 Project API

建议分阶段：

#### 阶段 1

- 先只让新 Copilot route 调 `POST /api/projects`
- 记录 source 和 messages
- 生成仍调用 `/api/generate-trip`

#### 阶段 2

- proposal 确认后，调用 `POST /api/projects/[projectId]/versions`
- 把生成结果存为 current version

#### 阶段 3

- Copilot UI 主要依赖 Project API 恢复状态
- 页面刷新后可以继续规划

### 5.4 Workspace 如何逐渐读取 Project Version

建议分阶段：

#### 阶段 1

- 旧 Workspace 继续从 localStorage 读

#### 阶段 2

- 新 project-based workspace entry 在进入页面前把 version detail 转回 `TripPlan`
- 暂时仍灌入现有 workspace state

#### 阶段 3

- Workspace 直接支持 projectId / versionId 加载

核心策略：

- 兼容期允许“Project API -> TripPlan -> 旧 Workspace”
- 不要求一开始就把 Workspace 状态管理重写

## 6. 后续实现顺序

### Step 1

- 补 `lib/projects/schema.ts`
- 定义 request / response zod schema

### Step 2

- 补 `lib/projects/rows.ts`
- 定义 DB row 和 domain model 的映射

### Step 3

- 补 `lib/projects/repository.ts`
- 封装 4 张表的查询与写入

### Step 4

- 补 `lib/projects/service.ts`
- 封装 project / version / source / message 的业务语义

### Step 5

- 新增最小 route：
  - `POST /api/projects`
  - `GET /api/projects/[projectId]`
  - `POST /api/projects/[projectId]/versions`
  - `POST /api/projects/[projectId]/messages`

### Step 6

- 新 Copilot Flow 先接 `project create + message append + version create`

### Step 7

- Workspace 再逐步接 `version detail`

### Step 8

- My Trips 最后切到 `project list`

## 7. 结论

当前 Wanderly 的 API 结构可以支撑现有 `TripPlan + trip_plans` 流程，但还不具备 `TravelProject` 时代需要的项目语义层。

Phase 1 Step 2B 的核心结论是：

- 新 `Project API` 不应直接暴露数据库表
- 应以 `project / version / source / message` 四类业务语义组织
- 推荐采用：
  - `route`
  - `service`
  - `repository`
  - `rows/schema`

这样的结构

并通过渐进兼容策略保持：

- `/api/generate-trip` 不变
- `/api/trips` 不变
- 旧 Workspace 不变

先让新 AI Flow 成为 `TravelProject` 的第一个调用方，再逐步扩展到 Workspace 和 My Trips。
