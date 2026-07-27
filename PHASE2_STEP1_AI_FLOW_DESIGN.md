# Wanderly v1.9 Phase 2 Step 1 AI Flow Design

## 1. 当前 AI 流程审计

### 1.1 当前 AI 入口在哪里

当前主入口分两段：

1. `/create`
   - 用户在 [app/create/page.tsx](C:/Users/10200/Desktop/travel_planing/app/create/page.tsx) 输入自然语言
   - `NaturalLanguageInput` 调用 `/api/parse-trip`

2. `/plan`
   - 用户在 [app/plan/page.tsx](C:/Users/10200/Desktop/travel_planing/app/plan/page.tsx) 补齐缺失字段
   - 页面把草稿规范化为完整 `TripRequest`
   - 然后调用 `/api/generate-trip`

也就是说，当前没有独立的 Copilot 会话入口，AI 能力被拆成：

- 解析输入：`/api/parse-trip`
- 生成完整方案：`/api/generate-trip`

### 1.2 Prompt 如何组织

Prompt 统一放在：

- [lib/ai/prompts.ts](C:/Users/10200/Desktop/travel_planing/lib/ai/prompts.ts)

当前主要有三类 prompt：

1. `PARSE_TRIP_SYSTEM_PROMPT`
   - 负责把自然语言输入解析成 `ParseTripResponse`
   - 核心输出：
     - `parsed`
     - `missingFields`
     - `followUpQuestions`

2. `TRIP_PLAN_SYSTEM_PROMPT`
   - 负责生成完整 `GenerateTripResponse`
   - 核心输出：
     - `tripPlan`
     - 可选 `appliedChanges`
     - 可选 `warnings`

3. JSON repair prompt
   - 当模型输出不符合 schema 时，做 JSON 修复

当前 prompt 组织特点：

- Prompt 已集中管理，结构是好的
- 但语义仍然是：
  - parse
  - generate
  - regenerate

没有：

- proposal prompt
- clarification prompt
- source review prompt
- project conversation prompt

### 1.3 当前输入输出结构

#### 当前 parse 阶段

输入：

- `ParseTripRequest`
  - `text`

输出：

- `ParseTripResponse`
  - `parsed: TripRequestDraft`
  - `missingFields: string[]`
  - `followUpQuestions: string[]`

#### 当前 generate 阶段

输入：

- `GenerateTripRequest`
  - `tripRequest: TripRequest`
  - `modificationRequest?: string`
  - `previousPlan?: TripPlan`

输出：

- `GenerateTripResponse`
  - `tripPlan: TripPlan`
  - `appliedChanges?: string[]`
  - `warnings?: string[]`

#### 当前 planner 内部

[lib/trip/planner.ts](C:/Users/10200/Desktop/travel_planing/lib/trip/planner.ts) 负责：

- 校验 `GenerateTripRequest`
- 读取天气
- 读取 `user_settings`
- 合并偏好
- 调用 `generateTripWithProvider`
- 修正天气 claim
- 返回结构化 `GenerateTripResponse`

说明：

- 当前已经有“偏好合并”和“结果修正”能力
- 但这些发生在最终生成阶段，不是会话式 planning 阶段

### 1.4 生成结果如何进入 Workspace

当前链路：

1. `/plan` 页面调用 `/api/generate-trip`
2. 成功后把 `result.tripPlan` 存到 localStorage
   - `saveTripPlan(result.tripPlan)`
3. 写入 workspace session metadata
   - `ensureWorkspaceSessionMetadata({ sourceType: "ai_generated", workspaceModeDefault: "read" })`
4. `router.push("/workspace")`

结论：

- 当前 Workspace 入口只认 `TripPlan`
- 当前没有 `TravelProject -> Version -> Workspace` 的加载路径
- 当前生成结果进入 Workspace 依赖本地 session，而不是项目状态

### 1.5 当前限制

当前 AI 流程的核心限制有：

1. 没有 source-aware state machine
   - `blank input`
   - `explore archive`
   - `import text`
   还没有进入不同的 AI 处理分支

2. 没有理解阶段
   - parse 只做字段提取
   - 不做“我理解你的旅行意图是……”

3. 没有澄清阶段
   - `/plan` 还是表单补字段，不是 AI 共创澄清

4. 没有 proposal 阶段
   - 当前是直接从完整 `TripRequest` 跳到完整 `TripPlan`

5. 没有项目级 conversation
   - 没有 `travel_project_messages` 的使用路径

6. 没有可恢复的 planning session
   - 刷新页面后只能恢复表单草稿
   - 不能恢复“AI 正在理解到哪一步”

## 2. 新 AI Flow 状态机设计

目标状态机：

- `source_received`
- `source_review`
- `clarifying`
- `proposal_ready`
- `proposal_adjusting`
- `generating`
- `workspace_ready`
- `abandoned`

### 2.1 `source_received`

进入条件：

- 用户第一次提交一个 planning source
- source 可以来自：
  - 空白自然语言输入
  - Explore 档案
  - 文本导入

用户行为：

- 输入一句话想法
- 点击“用此档案创建”
- 粘贴已有攻略文本

AI 行为：

- 暂不正式回复完整规划
- 仅确认 source 已收到

数据变化：

- 创建或准备创建 project session
- 记录 source payload
- project flow stage 标记为 `source_received`

下一状态：

- `source_review`

说明：

- 这是“资料进入系统”的状态
- 不是“AI 已理解”的状态

### 2.2 `source_review`

进入条件：

- 已收到 source
- 系统准备读取 source 内容

用户行为：

- 等待 AI 消化输入
- 可查看 source 摘要

AI 行为：

- 根据 source 类型做不同处理：
  - `blank_input`
    - 读取自然语言意图
  - `explore_archive`
    - 提炼主题、节奏、核心地点
  - `import_text`
    - 提炼已有攻略中的地点、路线、时间和偏好

数据变化：

- 可写入一轮 `assistant` message：
  - “我先理解一下你现有的信息……”
- project flow stage 更新为 `source_review`

下一状态：

- `clarifying`

说明：

- 这是新增的关键状态
- 它把“已有素材”与“后续澄清”明确分离
- 未来 AI 不会拿到任何输入都直接开始问问题

### 2.3 `clarifying`

进入条件：

- source 已被 review
- AI 已知道哪些信息足够、哪些信息仍缺失

用户行为：

- 回答少量关键问题
- 选择节奏 / 偏好 / 取向
- 也可继续自由输入补充说明

AI 行为：

- 先总结已理解到的信息
- 只问必要问题
- 优先给简单选项，而不是开放大问卷

数据变化：

- 每轮用户输入 / AI 输出写入 `travel_project_messages`
- 形成逐渐收敛的 planning context
- project flow stage 保持 `clarifying`

下一状态：

- 信息足够时进入 `proposal_ready`
- 用户长时间中断可进入 `abandoned`

说明：

- `clarifying` 不是传统表单
- 它是“最小必要澄清”的 AI 会话

### 2.4 `proposal_ready`

进入条件：

- AI 认为已有足够信息，可以先给一个旅行方向

用户行为：

- 查看 proposal
- 选择：
  - 接受当前方向
  - 再调整

AI 行为：

- 给出非最终 `TripPlan` 的提案
- 强调理解结果与建议方向，而非直接排满每日行程

数据变化：

- 保存一轮 `assistant` proposal message
- project flow stage 更新为 `proposal_ready`

下一状态：

- 用户继续聊：`proposal_adjusting`
- 用户确认生成：`generating`

说明：

- proposal 是“规划方向已成形”
- 不是最终版本

### 2.5 `proposal_adjusting`

进入条件：

- proposal 已出现
- 用户对 proposal 提出调整

用户行为：

- 补充：
  - “更偏美食一点”
  - “不要太赶”
  - “第三天想空一点”

AI 行为：

- 在 proposal 层继续协商
- 不急着生成完整 itinerary

数据变化：

- user / assistant message 持续追加
- flow stage 更新为 `proposal_adjusting`

下一状态：

- 调整后重新回到 `proposal_ready`
- 或者用户确认生成，进入 `generating`

说明：

- 这是 proposal 的反复打磨阶段
- 它允许 AI 共创，而不是一次提问一次生成

### 2.6 `generating`

进入条件：

- 用户确认当前 proposal 可以生成正式方案

用户行为：

- 点击“按当前方案生成”

AI 行为：

- 把当前澄清结果与 proposal 约束整理成完整 `TripRequest`
- 调用现有生成器生成完整 `TripPlan`

数据变化：

- flow stage 更新为 `generating`
- 调用现有 `/api/generate-trip` 能力
- 生成完成后创建 project version

下一状态：

- 成功：`workspace_ready`
- 中断或失败后可回到 `proposal_ready` 或 `proposal_adjusting`

说明：

- `generating` 是 AI Flow 中最短的一个状态
- 它不是思考状态，而是“正式生成执行状态”

### 2.7 `workspace_ready`

进入条件：

- 已经生成正式 `TripPlan`
- 已保存为 project version

用户行为：

- 进入 Workspace 查看 / 编辑

AI 行为：

- 结束本轮生成流程
- 后续改动通过 Workspace Copilot 进行

数据变化：

- 创建 `travel_project_versions`
- 若确认是当前版本，则更新 `current_version_id`
- project lifecycle 转入 `workspace` 或 `editing`
- flow stage 更新为 `workspace_ready`

下一状态：

- 进入后续编辑生命周期

### 2.8 `abandoned`

进入条件：

- 用户中途退出
- 项目被创建但未继续
- 长时间未继续 planning

用户行为：

- 暂停、不继续、离开页面

AI 行为：

- 不继续主动推进

数据变化：

- flow stage 标记为 `abandoned`
- 保留已有 message / source / draft proposal context

下一状态：

- 用户重新打开后回到：
  - `source_review`
  - `clarifying`
  - `proposal_ready`
  具体取决于上次停留点

说明：

- `abandoned` 是异常终止状态
- 需要持久化保存
- 允许恢复，不等于删除

## 3. Project 与 AI Flow 的关系

### 3.1 什么时候创建 TravelProject

可选方案：

#### 方案 A：用户进入 AI 页面立即创建

优点：

- 最早拿到 `projectId`
- 所有中间状态都天然可挂载

缺点：

- 噪音项目会很多
- 只是打开页面但没输入内容，也会产生无效项目

#### 方案 B：用户第一次提交内容时创建

优点：

- 平衡最好
- 只有真正开始 planning 的用户才创建项目
- 从第一条 source 开始就有 project identity

缺点：

- 页面初始空态还没有 `projectId`
- 需要在第一次提交时完成“create project + write source”

#### 方案 C：AI 确认意图后创建

优点：

- 项目创建更晚，噪音更少

缺点：

- `source_received` 到 `source_review` 之前没有稳定 project anchor
- message、source、proposal 的落库时机变复杂
- 不利于中途恢复

### 3.2 推荐方案

推荐：

- 方案 B：用户第一次提交内容时创建 `TravelProject`

原因：

1. 它保留了真正的“planning started”语义
2. 从第一条有效 source 开始就能落项目状态
3. 便于支持 `abandoned`
4. 不会像方案 A 那样制造大量空项目
5. 比方案 C 更适合消息和 proposal 的持久化

推荐时点：

- 用户第一次点击“开始共创”
- 或第一次从 Explore / Import 确认进入 AI Flow

## 4. Conversation 数据流设计

### 4.1 每轮消息的基本流

每轮建议采用：

1. 用户输入
2. 保存 `user message`
3. AI 输出
4. 保存 `assistant message`
5. 更新 `last_activity_at`

### 4.2 v1.9 需要保存什么

基于现有 `travel_project_messages`，v1.9 保持简单：

- `project_id`
- `role`
- `content`
- `created_at`

### 4.3 是否需要 metadata

v1.9 推荐：

- 不在数据库主结构中引入复杂 metadata 字段
- 如确实需要，只在应用层临时组合，不作为 Phase 2 Step 1 的必须项

原因：

- 当前目标是先建立稳定的 project conversation 基础
- 不是实现复杂聊天系统

### 4.4 message 的实际用途

这些消息主要服务于：

1. 恢复 planning 上下文
2. 解释为什么 proposal 会这样
3. 支撑后续 Workspace 中的项目级 Ask Wanderly

## 5. Proposal 阶段设计

### 5.1 Proposal 不是最终 TripPlan

Proposal 应理解为：

- AI 对当前需求的结构化理解
- 初步旅行方向
- 核心节奏建议
- 核心地点和安排思路

它不应该：

- 直接展开成完整每日 itinerary
- 成为 Workspace 的最终 render contract

### 5.2 Proposal 建议包含什么

Proposal 建议包含：

- 目的地理解
- 旅行目标理解
- 节奏建议
- 核心体验方向
- 核心地点集合
- 避免事项
- 生成前仍待确认的重点

可以理解成一种：

- `TripIntentSummary`
- 或 `PlanningProposal`

但它不需要在 v1.9 变成复杂 schema

### 5.3 Proposal 与 Version 的关系

推荐关系：

- proposal 本身不一定创建 `accepted version`
- 用户确认 proposal 后，正式生成 `TripPlan`
- 生成成功后创建 `accepted version`

如果后续需要 proposal 刷新恢复：

- 可以用 `travel_project_versions.version_status = 'proposed'`
- 但 v1.9 的最低可行方案是：
  - proposal 主要通过 messages 恢复
  - accepted version 只在正式生成后创建

### 5.4 Proposal 阶段的用户决策

用户在 proposal 阶段的两个核心动作：

1. 继续调整
   - 进入 `proposal_adjusting`

2. 按当前方案生成
   - 进入 `generating`

## 6. 与现有 `generate-trip` 的兼容方案

### 6.1 不重写生成器

当前建议保持不变：

- `/api/generate-trip`
- `lib/trip/planner.ts`
- `lib/ai/generateTrip.ts`

仍然负责：

- 接受完整 `TripRequest`
- 输出完整 `TripPlan`

### 6.2 新 AI Flow 如何调用现有生成能力

未来建议流程：

1. AI Flow 收集 source
2. AI 做 source review
3. AI 做 clarifying
4. AI 形成 proposal
5. 用户确认 proposal
6. 系统把当前 planning context 收敛成完整 `TripRequest`
7. 调用现有 `generate-trip`
8. 返回 `GenerateTripResponse`
9. 创建 `TravelProjectVersion`

即：

`AI Flow` 负责前置共创  
`generate-trip` 负责最终 itinerary generation

### 6.3 兼容层的关键设计

关键点在于中间层：

- AI Flow 不直接产出 `TripPlan`
- AI Flow 先产出：
  - 已理解约束
  - 已确认偏好
  - 结构化 `TripRequest`

然后才调用现有生成器。

这意味着：

- `generate-trip` 依旧是纯生成引擎
- `Project API` 负责状态和持久化
- `AI Flow` 负责会话式收敛

### 6.4 对现有系统的好处

这样做的好处：

1. 最大限度复用现有生成能力
2. 不需要重写 prompt 主生成器
3. 让 Phase 2 可以渐进推进
4. 把“理解 / 澄清 / proposal”作为生成前置层叠加上去

## 7. Project 生命周期关系

AI Flow state 和 Project lifecycle 不是同一个东西。

推荐映射：

- `source_received` + `source_review`
  - 对应 project `planning` 前早期阶段

- `clarifying`
  - 对应 project `planning`

- `proposal_ready` + `proposal_adjusting`
  - 对应 project `proposed`

- `generating`
  - 对应 project `generating`

- `workspace_ready`
  - 对应 project `workspace`

- `abandoned`
  - 不是独立 lifecycle
  - 而是 `current_flow_stage` 的异常状态标记

推荐原则：

- `lifecycle_state` 描述项目大阶段
- `current_flow_stage` 描述 AI 共创流程精细阶段

## 8. Phase 2 后续实施步骤

### Step 2

新增 AI Flow schema / DTO

建议：

- `lib/projects/ai-flow-schema.ts`
- 或 `lib/copilot/schema.ts`

用于定义：

- source review result
- clarifying question shape
- proposal shape

### Step 3

实现 project message 写入链路

目标：

- 新 AI Flow 每轮 user / assistant 都能落到 `travel_project_messages`

### Step 4

实现 project-aware flow service

目标：

- 把：
  - create project
  - append source
  - append message
  - update state
  - create version

串成一条 AI Flow service

### Step 5

实现 proposal persistence 轻量方案

优先建议：

- 先通过 messages 恢复 proposal
- 如不够，再引入 `proposed version`

### Step 6

新建 Copilot route

建议未来引入：

- `/api/projects/[projectId]/copilot/next`

语义：

- 输入当前用户消息
- 返回 AI 下一步响应和 flow stage 更新

### Step 7

最后再接入 UI

顺序建议：

1. 新 AI route/service 先打通
2. 再做 `/create` 新入口迁移
3. 再做 Workspace / My Trips 接入

## 9. 结论

当前 Wanderly 的 AI 流程仍然是：

- parse input
- fill form
- generate trip

它适合 MVP，但不适合 `AI Travel Copilot + Workspace` 的共创形态。

Phase 2 Step 1 的设计结论是：

1. 新 AI Flow 需要显式状态机
2. `source_review` 是必须新增的阶段
3. `TravelProject` 推荐在用户第一次有效提交 source 时创建
4. `travel_project_messages` 足以承接 v1.9 的轻量 conversation
5. `proposal` 应是生成前的方向层，不是最终 `TripPlan`
6. 现有 `generate-trip` 保留为最终生成引擎，通过完整 `TripRequest` 接入新流程

这样可以在不推翻现有生成系统的前提下，把 Wanderly 升级为真正的 AI Travel Copilot 工作流。
