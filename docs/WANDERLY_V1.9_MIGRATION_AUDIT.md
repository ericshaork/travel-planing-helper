# Wanderly v1.9 Migration Audit Report

## 1. 当前产品状态总结

### 后端完成度

Wanderly v1.9 的后端主架构已经基本成型。当前代码已经具备：

- `TravelProject` 作为项目身份层
- `TravelProjectVersion` 作为版本层
- Project API / Copilot API / Proposal API / Workspace AI API
- Project message / source / version persistence
- Settings 对生成与 Workspace AI 的真实接入

从能力上看，`TravelProject -> Copilot Conversation -> Proposal -> Generation -> Workspace` 这条主链路已经不是概念设计，而是具备实际可用的后端基础。

### 前端完成度

前端完成度处于“核心链路已接上，但页面迁移尚未收口”的阶段：

- `/create` 已经接入新版 Copilot Flow
- Generation 体验层已存在
- Workspace 已能读取 project/version context
- Explore 已能作为 source layer 进入 Create 或 Workspace
- My Trips 已开始以 `TravelProject` 作为主要展示对象

但与此同时，旧页面、旧存储、旧状态管理仍然残留较多，导致产品层面仍呈现明显的双轨状态。

### 最大阻塞问题

当前最大的阻塞不是后端能力不足，而是新旧架构并存时间过长：

- `TravelProject/Version` 与 `TripPlan/localStorage/trip_plans` 同时驱动多个页面
- `/create -> generation -> /workspace` 仍带有旧本地草稿链路
- Workspace 仍是新项目上下文和旧 TripPlan 状态的混合恢复模式
- My Trips 对 legacy 数据的兼容方式不稳定
- 多处存在乱码/编码问题，直接影响产品验收质量

结论是：v1.9 当前最需要的不是继续扩功能，而是完成页面级迁移收口。

---

## 2. 页面迁移地图

| 模块 | 当前状态 | 问题 | 后续负责人 |
|---|---|---|---|
| Landing `/` | 已有首页、Create/Explore 主入口、空白 Workspace 入口 | 信息架构仍偏旧；空白入口仍绕过 project-first；`/trips` 不是主路径 | GLM |
| Create `/create` | 已默认进入 Copilot 页面 | 仍暴露 `/plan` classic flow；proposal 语义不够稳；初始化仍带 legacy parse/session | GLM |
| Generation | 已有真实加载体验组件 | 仍是组件态，不是稳定独立状态层；进度为前端模拟；刷新恢复弱 | GLM |
| Workspace `/workspace` | 功能最完整，已支持 project/version context | 新旧状态重叠最严重；localStorage fallback 太深；AI 修改仍带旧 regenerate 语义 | GLM |
| Explore `/explore` | 内容层较成熟，已能进入 Create 或 Workspace | source 入口仍需统一；仍有中间 draft/bridge 痕迹 | GLM |
| My Trips `/trips` | 已优先展示 TravelProject | project 与 legacy trip 未真正并表；混合用户可能看不到旧 trip | GLM |
| Settings `/settings` | 已有真实持久化并接入 AI/Workspace | Account 区部分仍是占位；AI Preference 感知弱 | GLM |
| 全站视觉层 | 已有品牌基础与若干新页面组件 | 页面成熟度不一致；乱码与文案统一性问题明显 | Qwen |
| 架构审计 | 当前已完成审计结论 | 不涉及功能实现 | Codex |

负责人定义：

- GLM：功能迁移、架构收口、数据链路整理
- Qwen：UI视觉升级、CSS统一、页面体验优化
- Codex：审计、架构检查

---

## 3. 模块详细审计

### Landing

**当前实现**

- 首页已经具备品牌化入口。
- 主 CTA 指向 `/create` 与 `/explore`。
- 还存在“空白开始”直接创建本地 Workspace draft 并跳转 `/workspace` 的入口。

**存在问题**

- 仍然存在绕过 `TravelProject` 的空白创建路径。
- `/trips` 没有成为明确的产品主入口。
- 首页尚未完全体现 Explore / Copilot / Workspace 三层新产品结构。

**建议方向**

- 保留首页内容框架，但将空白创建收口到 project-first。
- 强化 “我的旅行项目” 作为统一管理入口。
- 让首页只呈现新版主流程，不再暗示旧链路是主要方式。

**风险**

- 如果 Landing 继续保留绕行入口，后续 Project 身份层很难真正统一。

**优先级**

- High

---

### Create

**当前实现**

- `/create` 当前已经默认以 `CreateCopilotPanel` 作为主体。
- 已支持 project session 恢复、多轮 Copilot 消息、`proposal_ready` 与 generate 触发。
- 新版主链路已经接通。

**存在问题**

- 页面中仍可显性进入 `/plan` classic flow。
- 初始化仍依赖旧 `/api/parse-trip` 与旧 session/draft。
- Proposal Card 当前更接近“前端从消息推导”，而不是稳定的服务端 proposal 语义。

**建议方向**

- 将 `/create` 明确收口为新版 AI Copilot 创建中心。
- `/plan` 改为兼容页，不再在 `/create` 中高权重曝光。
- 后续逐步让 proposal 数据由服务端稳定输出，而不是长期依赖消息推导。

**风险**

- Create 如果长期处于半迁移状态，会持续产生 session 混乱和状态重复问题。

**优先级**

- High

---

### Generation

**当前实现**

- 已有 Generation Experience 组件，包含进度、阶段文案、插画、顶部/底部文案区域。
- 生成完成后能够继续进入 Workspace。

**存在问题**

- 当前 Generation 更像 Create 面板中的组件态状态，而不是稳定的独立生成阶段。
- 进度主要为前端模拟，不反映真实生成状态。
- 刷新、重进、异常恢复能力较弱。

**建议方向**

- v1.9 收口阶段应把 Generation 视为独立状态层。
- 即使暂时不做复杂后端任务协议，也应增强其 session/恢复能力。
- 后续可再升级为独立 route 或真实任务状态驱动。

**风险**

- 用户在生成中刷新或失败后，容易不清楚是否已经成功创建了版本。

**优先级**

- High

---

### Workspace

**当前实现**

- Workspace 已支持 read / edit / map 等核心模式。
- 已优先读取 `projectId/versionId`，没有 project 时再 fallback 到旧 TripPlan/localStorage。
- Workspace AI 修改链路已经支持基于当前版本生成新版本。

**存在问题**

- 这里是当前新旧架构冲突最严重的区域。
- `useTripWorkspaceState` 承担了过多旧 TripPlan 状态与新 Project Context 的混合职责。
- 没有 project/version 时，AI 修改仍会回到旧生成逻辑。
- 顶栏与修改面板的语义仍偏旧“regenerate”，不完全符合版本化协作定位。

**建议方向**

- GLM 优先把 Workspace 稳定为 version-first。
- localStorage fallback 保留，但只作为兼容兜底，不再继续驱动主链路。
- 明确“当前项目 / 当前版本 / 当前编辑上下文”的统一语义。

**风险**

- 如果 Workspace 继续维持双系统混合，未来 v2.3 AI 修改和 v2.4 协作都会变得很难推进。

**优先级**

- High

---

### Explore

**当前实现**

- Explore 已有首页、城市/灵感内容、详情页、Archive Shell、Trip Package 数据层。
- 已能从 Explore 进入 Create Copilot 或直接进入 Workspace。
- 从产品定义上已经接近 source layer。

**存在问题**

- Source 语义尚未完全统一。
- 某些导入分支仍带有旧 draft/intermediate bridge 的痕迹。
- Explore 仍有少量“导出草稿”感，而不是“创建项目”感。

**建议方向**

- 保持 Explore 的内容层结构不动。
- 优先统一所有 Explore 导入最终都进入 `TravelProject`。
- 后续 UI 精修交给 Qwen，GLM 只做数据流收口。

**风险**

- 如果 Explore 与 Create 的 source 规范不统一，后续统计、推荐、版本解释都会受影响。

**优先级**

- Medium

---

### My Trips

**当前实现**

- `/trips` 已开始优先以 `TravelProject` 作为主数据来源。
- 打开项目时已经能够写入 project/version context 并进入 Workspace。
- legacy saved trip 仍保留 fallback。

**存在问题**

- 现在并不是 project 与 legacy trip 真正并表，而是 project 优先、legacy 兜底。
- 混合时代用户可能出现旧 trip 被隐藏的问题。
- My Trips 虽然已开始项目化，但项目管理语义仍不够完整。

**建议方向**

- 把 My Trips 明确定位为 `TravelProject` 管理入口。
- 给 legacy trip 设计过渡展示策略，而不是静默消失。
- 列表字段后续应围绕 title、lifecycle、current version、last activity、source type 稳定下来。

**风险**

- 这会直接影响老用户对“我的旅行去哪了”的信任感。

**优先级**

- High

---

### Settings

**当前实现**

- Settings 已具备真实服务端持久化能力。
- 已包含 Travel Preference、Workspace Preference、AI Preference。
- Proposal 生成与 Workspace AI 已读取用户设置。

**存在问题**

- AI Preference 已有数据结构，但产品感知仍较弱。
- Account 区部分动作仍是占位。
- Settings 与 Create 的正向产品联动还不够明显。

**建议方向**

- v1.9 阶段保持 Settings 稳定，不再扩功能。
- GLM 重点确认字段与调用链不再漂移。
- Qwen 后续再提升“设置会真实影响 AI 行为”的可感知体验。

**风险**

- 当前风险较低，主要问题是感知不足，不是架构阻塞。

**优先级**

- Medium

---

## 4. 新旧架构冲突列表

当前主要冲突集中在以下四类：

### 4.1 Legacy Flow

- `/create` 已是新版 Copilot，但仍暴露 `/plan` classic flow
- `submitCreateFlow()` 仍依赖旧 parse 流程
- Generation 到 Workspace 的交接仍带有旧 TripPlan 链路

**迁移目标**

- 新旅行创建统一走 `TravelProject -> Copilot -> Proposal -> Generation -> Workspace`

### 4.2 Legacy Storage

- localStorage 仍深度参与 Create、Workspace、恢复流程
- `trip_plans` 仍用于 legacy 存储和部分 My Trips 兼容

**迁移目标**

- 新流程以 `TravelProject + Version + Session Context` 为主
- localStorage 仅作为兼容层和短期恢复兜底

### 4.3 Legacy Component

- `/plan` 旧分步表单仍完整存在
- Workspace 中部分交互仍以旧 regenerate 语义表达
- Landing 仍保留旧 blank workspace 直跳入口

**迁移目标**

- 新版主入口、主创建、主编辑体验全部围绕新产品模型组织

### 4.4 重复状态管理

- Create 同时维护 copilot state、parse session、draft session
- Workspace 同时维护 project/version context 与 TripPlan 本地状态
- My Trips 同时维护 project summary 与 legacy saved trip 两套列表语义

**迁移目标**

- 页面状态由单一主语义驱动：
  - Create 由 Project + Flow Stage 驱动
  - Generation 由 Generation State 驱动
  - Workspace 由 Project + Current Version 驱动
  - My Trips 由 Project Summary 驱动

---

## 5. Future Compatibility Report

### v2.2 真实数据增强

**未来需要预留**

- POI / Place / Location 的稳定结构化引用
- provider abstraction 持续保留
- itinerary item 关联 canonical place identity 的能力

**当前不要实现**

- 不要现在就做复杂实时票务、酒店、开放时间、队列状态系统

---

### v2.3 AI修改能力

**未来需要预留**

- Project 级 conversation
- 当前版本上下文
- 修改原因与版本来源说明
- 基于当前 version 生成新 version 的明确链路

**当前不要实现**

- 不要提前做复杂版本 diff 页面或高级多轮协作 UI

---

### v2.4 分享协作

**未来需要预留**

- project member
- role / permission
- collaboration layer

**当前不要实现**

- 不要在 v1.9 阶段提前加入多人协作模型

---

### v2.5 出行助手

**未来需要预留**

- lifecycle 扩展，例如 traveling / completed
- 当前行程状态
- planning 与 traveling 的不同工作模式

**当前不要实现**

- 不要现在把 Workspace 强行扩成旅行中实时助手

---

### v2.6 旅行中模式

**未来需要预留**

- mobile-first 的轻量状态读取
- 当天行程模式
- 不依赖大侧栏和复杂编辑区的简化视图

**当前不要实现**

- 不要在 v1.9 阶段增加新的大页面体系或移动端专用复杂壳层

---

### v2.7 旅行后手帐

**未来需要预留**

- Photo / Note / Memory 扩展位
- completed trip 的后旅行分支
- 从 Trip Project 向回忆内容扩展的模型能力

**当前不要实现**

- 不要在 v1.9 直接扩写成完整手帐系统

---

## 6. GLM执行路线

### 第一阶段：Create -> Generation -> Workspace

#### Create

**GLM负责**

- 将 `/create` 完整收口为新版 AI Copilot 创建中心
- 降低 `/plan` classic flow 的主入口地位
- 稳定 proposal 与 project session 语义

**Qwen负责**

- 后续对 Create 页面进行视觉统一与体验优化

#### Generation

**GLM负责**

- 将 Generation 从组件态 loading 收口为稳定生成状态层
- 增强 session 与恢复能力
- 保证生成到 Workspace 的上下文不丢失

**Qwen负责**

- 后续优化生成页视觉、插画节奏、文案与动效

#### Workspace

**GLM负责**

- 统一 Workspace 为 project/version-first
- 收敛 deep legacy fallback
- 稳定 AI 修改与版本切换语义

**Qwen负责**

- 后续优化 Read / Edit / Map / AI 区域的视觉层级与页面感受

---

### 第二阶段：Explore -> My Trips -> Settings

#### Explore

**GLM负责**

- 统一所有 Explore 导入最终进入 `TravelProject`
- 清理残余 draft/intermediate bridge

**Qwen负责**

- 优化 Explore 的内容展示、卡片视觉与 Archive 体验

#### My Trips

**GLM负责**

- 把 My Trips 完整收口为 `TravelProject` 管理入口
- 处理 legacy trip 的过渡展示策略
- 稳定打开、恢复、归档、重命名语义

**Qwen负责**

- 优化列表样式、状态标签、信息层级与管理操作体验

#### Settings

**GLM负责**

- 收口字段、调用链与偏好同步逻辑
- 确保 AI Preference / Workspace Preference / Travel Preference 不再漂移

**Qwen负责**

- 后续做设置页视觉统一与偏好影响感知优化

---

## 结论

Wanderly v1.9 当前真正需要完成的，不是再扩新的大功能，而是把已经存在的新后端架构，完整迁移到前端页面和用户主流程中。

可以把后续工作理解为两层：

1. GLM 先完成功能迁移与架构收口  
2. Qwen 再进行页面体验和视觉精修

在这个顺序下，最优先闭环应为：

`Create -> Generation -> Workspace`

随后再完成：

`Explore -> My Trips -> Settings`

这份审计文件的目标，就是为这两位后续执行者提供统一的迁移判断依据。


补充执行规则

GLM执行原则

一次只处理一个模块，不跨页面大规模重构。

完成一个模块后必须通过验收，再进入下一模块。

优先复用已有 API、组件、数据模型。

Future Compatibility 只代表预留能力，不代表 v1.9 实现。

模块验收补充

Create完成标准

/create进入后默认展示AI Copilot流程。

用户可以输入需求、看到AI回复、多轮交流。

proposal_ready后必须经过用户确认。

不允许跳过确认直接进入Workspace。

旧表单流程不能作为主路径。

Generation完成标准

生成状态可恢复。

project/version上下文不丢失。

成功后进入正确Workspace。

暂不实现复杂任务队列。

Workspace完成标准

Project和Version成为唯一主语义。

localStorage只作为兼容兜底。

AI修改基于当前版本产生新版本。

v1.9.5技术债单独处理

包括： - 中文乱码与编码统一 - legacy代码清理 - 测试整理 - 类型补全 -注释整理

最终执行流程

Codex：审计和架构检查

GLM：功能迁移、架构收口

Qwen：UI视觉升级和体验优化

执行顺序：

Create → Generation → Workspace → Explore → My Trips → Settings

目标：让已经存在的新架构真正成为用户使用的产品。
