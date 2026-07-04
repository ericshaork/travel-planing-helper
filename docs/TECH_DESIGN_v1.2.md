# TECH_DESIGN v1.2：移动端分层、行程柜识别与修改篮

## 1. 文档定位

本文是 MVP v1.2 的增量技术设计。MVP 1.0 的 Provider、API、Schema、安全与错误处理继续以 `docs/TECH_DESIGN.md` 为准；v1.1 的行程柜映射与完整重排设计继续以 `docs/TECH_DESIGN_v1.1.md` 为准。

阶段 0 只创建规划文档，不修改业务代码。

## 2. 技术目标

v1.2 只增加三类前端能力：

1. 移动端与桌面端可采用不同布局和默认展开策略；
2. 复用现有视图模型，强化 Day → Slot → Block → Detail 的表达；
3. 在结果页增加临时 Pending Changes 状态，并编译为既有 `modificationRequest`。

补充总原则：Mobile Flow First。

- 首页输入、`/plan` 补信息、`/result` 浏览结果，都优先采用一屏一任务；
- 移动端优先使用步骤切换、分页浏览、分屏浏览或 Tab 切换；
- 桌面端可继续保持完整展开式布局；
- 移动端与桌面端允许不同 DOM 组合，但必须复用同一套领域数据、状态规则和提交逻辑。

补充产品边界：竞品分析已明确分层。

- v1.2 只吸收移动端流程、柜子识别、积木编辑和 Pending Changes；
- v1.2 不承接地图、商业按钮、保存分享、已有计划导入、图片视频和 Explore；
- 与地图相关的 Provider、视图和联动边界只允许在文档中预留到 v1.3 / 2.0，不在当前实现落地。

不修改：

- `TripPlan`、`DailyItinerary`、`ItineraryItem`；
- `GenerateTripRequest`、`GenerateTripResponse`；
- `/api/parse-trip`、`/api/generate-trip`；
- LLM Provider、Weather Provider；
- localStorage 中的旅行需求与方案格式。

## 3. 现有实现基线

### 3.1 可直接复用

| 模块 | 已有职责 | v1.2 复用方式 |
|---|---|---|
| `app/plan/page.tsx` | 三步状态、缺失项、聚焦、生成 | 保留业务状态，调整响应式组合 |
| `StepQuestionForm` | 字段、错误、步骤导航 | 保留字段逻辑，拆出移动布局所需展示边界 |
| `TripPlan` | 完整当前方案 | 唯一真实来源 |
| `DayCabinetView` | Day / Slot / Block 展示映射 | 直接复用 |
| `DayCabinetSummary` | 手机端 Day 摘要 | 升级为柜门入口 |
| `ItineraryBlock` | 积木内容与详情 | 保留内容，升级详情按钮和积木视觉 |
| `ResultDayNav` | 模块与 Day 定位 | 保留导航语义，调整不同断点的位置 |
| `modification-intents.ts` | 点击动作到中文修改句 | 作为 Pending Change 的 `requestText` 来源 |
| `RegenerateBox` | 修改文本、提交、错误、结果 | 保持唯一最终提交入口 |
| `saveTripPlan` / `toTripMarkdown` | 保存当前方案与导出 | 不接触 UI 临时状态 |

### 3.2 当前缺口

- `app/result/page.tsx` 的 `modificationDraft` 每次被单条动作覆盖；
- 移动端虽有 Day 摘要，但天气、预算、攻略、住宿、交通等仍连续铺开，实际体验仍是长页面 + 折叠；
- `/plan` 的业务步骤已有，但桌面和手机共用同一种大表单表现；
- 柜子语义主要存在于命名，视觉结构仍接近普通卡片；
- 当前项目没有 DOM 测试环境，核心交互主要靠纯函数单测与手动验收。

## 4. 总体架构

```text
                         shared domain data
                    ┌────────────────────────┐
                    │ TripRequest / TripPlan │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │ existing view mapping  │
                    │ DayCabinetView         │
                    └────────────┬───────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             │                                       │
   ┌─────────▼──────────┐                  ┌─────────▼──────────┐
   │ mobile composition │                  │ desktop composition│
   │ progressive reveal │                  │ expanded reading   │
   └─────────┬──────────┘                  └─────────┬──────────┘
             └───────────────────┬───────────────────┘
                                 │ shared events
                    ┌────────────▼───────────┐
                    │ Pending Changes state │
                    │ result page only      │
                    └────────────┬───────────┘
                                 │ compile
                    ┌────────────▼───────────┐
                    │ modificationRequest   │
                    │ controlled text       │
                    └────────────┬───────────┘
                                 │ manual submit
                    ┌────────────▼───────────┐
                    │ /api/generate-trip    │
                    │ complete TripPlan     │
                    └────────────────────────┘
```

关键约束：移动端和桌面端可以有不同 DOM 组合，但不得各自实现一套修改规则、数据映射或 API 调用。

## 5. 响应式布局策略

### 5.1 断点原则

继续使用现有 Tailwind 断点。实现时以内容行为而不是设备名称判断：

- 小屏：单列、渐进展开、紧凑 sticky / bottom entry；
- `sm`：增加间距但保持单列业务顺序；
- `lg`：恢复多列或多日展开式阅读。

不通过 JavaScript 读取屏幕宽度来决定业务数据，只用 CSS 控制布局；只有“当前展开 Day / 模块”这类真实交互状态进入 React。

### 5.2 `/plan`

共享：

- `draft`
- `currentStep`
- `issues`
- `fieldErrors`
- `focusField`
- `handleNext`
- `handleSubmit`

不同布局：

```text
mobile                           desktop
┌──────────────────────┐       ┌────────────┬───────────────┐
│ compact trip summary │       │ trip draft │ current step  │
├──────────────────────┤       │ summary    │ form          │
│ current step form    │       │            │               │
├──────────────────────┤       └────────────┴───────────────┘
│ back        next     │
└──────────────────────┘
```

移动端草稿摘要只改变展开状态，不复制或转换 `TripRequestDraft`。

日期仍使用原生 `input[type="date"]`，以保留系统日期选择器和可访问性。中文体验通过显式 label、辅助文案与空值提示改善，不伪造日期值，不把显示格式写入业务数据；业务值继续是 ISO `YYYY-MM-DD`。

### 5.3 `/result`

移动端使用分页式 / 分屏式浏览：

```text
overview page
  ↓
day summaries / day nav
  ↓ tap day-2
day-2 page
  ↓
slot sections
  ↓
block summary
  ↓
block detail

other mobile pages
budget page
more page (weather / guide / hotel / transport / notes)
edit page (quick actions / regenerate box / export)
```

桌面端保持 v1.1：

- 总览、天气、预算直接展示；
- 多个 Day 连续展开；
- 攻略、住宿、交通、注意事项按当前顺序阅读；
- 修改篮可放在稳定侧区或靠近修改区，但不制造第二个提交入口。

实现约束：

- 手机端顶部导航切换 `activeMobilePage`，不再依赖 `scrollIntoView` 跳到长页面锚点；
- `overview`、`day-N`、`budget`、`more`、`edit` 共享同一份 `TripPlan`、同一套修改意图和同一个 `RegenerateBox`；
- `more` 页可以继续使用折叠组件，但折叠只存在于该页内部；
- BlockActions 与快捷修改在手机端触发后，应把用户直接带到 `edit` 页；
- 桌面端继续保留滚动导航和完整展开式阅读。

## 6. 展示状态设计

建议状态仍由页面拥有，子组件通过受控 props 接收：

```ts
type MobilePageKey =
  | "overview"
  | "budget"
  | "more"
  | "edit"
  | `day-${number}`;

interface ResultViewState {
  activeDesktopNavKey: string;
  activeMobilePage: MobilePageKey;
}
```

实现时不要求一定包装成单一对象；以上只描述状态边界。

规则：

- 桌面端导航继续映射到锚点滚动；
- 手机端导航直接切换 `activeMobilePage`；
- `more` 页内部的折叠状态不持久化；
- 点击 BlockActions 或快捷修改后，手机端切到 `edit`，桌面端定位到修改区；
- 生成新方案后，桌面端与手机端都重置回总览；
- 无 JavaScript 或状态异常时，核心内容仍应有可读降级。

## 7. Cabinet Identity 组件边界

不新增领域模型，只调整现有组件职责：

| 组件 | v1.2 职责 |
|---|---|
| `DayCabinetSummary` | 柜门 / 抽屉入口、三格预览、展开状态 |
| `DayCabinet` | 单日柜外框、主题、路线、三层结构 |
| `TimeSlotSection` | 固定格层、标签、空状态、积木容器 |
| `ItineraryBlock` | 积木摘要、显式详情按钮、操作区 |
| `BlockActions` | 发出动作，不持有 Pending Changes |

视觉常量继续集中在 `app/globals.css` 或现有统一样式入口。不得在每个组件复制相近颜色、阴影和边框语义。

## 8. Pending Changes 数据设计

### 8.1 只属于前端 UI

Pending Changes 是当前 `/result` 页面会话内的临时 UI 状态：

- 不进入 `TripPlan`；
- 不进入 `TripRequest`；
- 不进入 API 请求体的新字段；
- 不写入 localStorage；
- 不等同于持久化 constraints；
- 刷新页面可丢失；
- 完整重排成功后必须清空。

### 8.2 建议类型

建议新增 `lib/trip/pending-changes.ts`：

```ts
export type PendingChangeKind = "block" | "quick";

export interface PendingChange {
  id: string;
  kind: PendingChangeKind;
  actionType: BlockActionType | QuickModificationType;
  blockRef?: ItineraryBlockRef;
  label: string;
  requestText: string;
}
```

说明：

- `id` 只需在当前页面状态中稳定；
- `blockRef` 只引用当前 `TripPlan`；
- `label` 用于修改篮展示；
- `requestText` 直接复用现有确定性文案函数；
- 不新增时间戳、服务端 ID 或数据库主键。

### 8.3 身份与去重

建议身份键：

```text
block disposition:
  block:{day}:{slot}:{itemIndex}:disposition

block additive:
  block:{day}:{slot}:{itemIndex}:addSimilar

quick:
  quick:{quickActionType}
```

规则：

- `remove`、`replace`、`lock` 共用 disposition 身份，后选覆盖前选；
- `addSimilar` 使用独立身份，可与 `lock` 并存；
- 完全相同动作重复加入时保持一条；
- 不同 block 使用 `day + slot + itemIndex` 区分；
- 生成新 `TripPlan` 后全部清空，避免旧 index 指向新方案。

### 8.4 纯函数

建议导出：

```ts
addPendingChange(
  current: PendingChange[],
  next: PendingChange,
): PendingChange[]

removePendingChange(
  current: PendingChange[],
  id: string,
): PendingChange[]

compilePendingChanges(
  changes: PendingChange[],
): string

mergeModificationRequest(
  currentDraft: string,
  compiledChanges: string,
): string
```

这些函数必须：

- 不修改输入数组；
- 保持稳定顺序；
- 可单元测试；
- 不读取 DOM、localStorage 或网络；
- 不静默截断文本。

## 9. Pending Changes 状态机

```text
                     add first intent
        ┌──────────┐ ────────────────▶ ┌───────────┐
        │  empty   │                   │ collecting│
        └──────────┘ ◀──────────────── └─────┬─────┘
             ▲        remove last / clear    │
             │                               │ write to box
             │ regeneration success          ▼
             └──────────────────────── ┌────────────┐
                                      │ box drafted│
                                      └─────┬──────┘
                                            │ manual submit
                                            ▼
                                      ┌────────────┐
                                      │ submitting │
                                      └───┬────┬───┘
                                          │    │
                                      fail│    │success
                                          ▼    ▼
                                   keep old   new TripPlan
                                   plan/text  reset UI
```

无效转换：

- 空清单点击“写入修改框”：按钮禁用或给出轻提示；
- 提交中重复点击：沿用 `RegenerateBox` 的 `isSubmitting` 禁用；
- 新方案生成后继续使用旧 block ref：通过成功回调清空阻止；
- 超长内容写入：保持清单和原修改框不变，显示错误。

## 10. 修改篮到 RegenerateBox 的数据流

### 10.1 正常路径

```text
BlockActions / ModificationQuickActions
→ build...ModificationRequest()
→ create PendingChange
→ addPendingChange()
→ PendingChangesPanel
→ compilePendingChanges()
→ mergeModificationRequest(existingDraft, compiled)
→ length validation
→ setModificationDraft()
→ increment externalDraftVersion
→ clear Pending Changes
→ user edits and submits in RegenerateBox
→ POST /api/generate-trip
```

### 10.2 影子路径

```text
nil / missing block
→ UI 不应发出动作；纯函数拒绝不完整输入

empty Pending Changes
→ 不写入，不改变 modificationDraft

duplicate action
→ 确定性去重，不增加计数

conflicting action on same block
→ disposition 后选覆盖前选，附加动作按规则保留

compiled text over 1000 chars
→ 不截断，不覆盖修改框，提示删减

stale block ref after regeneration
→ 成功回调清空清单；不持久化，因此刷新也不会恢复
```

### 10.3 合并文本

建议输出可读而非机器协议：

```text
请按下面这些要求统一重排：
1. 请一定保留第 1 天上午的「A」……
2. 请把第 2 天下午的「B」换成……
3. 请增加一个和第 3 天晚上的「C」类似的……
```

如果修改框已有文本：

```text
{用户已有文字}

另外，请按下面这些要求统一重排：
...
```

不解析用户自由文本，不尝试把它反向转换为 Pending Changes。

## 11. RegenerateBox 与 API 边界

`RegenerateBox` 继续接收：

```ts
{
  tripPlan,
  tripRequest,
  modificationRequest,
  externalDraftVersion,
  onModificationRequestChange,
  onRegenerated
}
```

请求保持：

```ts
{
  tripRequest,
  previousPlan: tripPlan,
  modificationRequest
}
```

响应保持：

```ts
{
  tripPlan: TripPlan,
  appliedChanges?: string[],
  warnings?: string[]
}
```

Pending Changes 不直接调用 API。`RegenerateBox` 仍是唯一最终提交入口，继续负责：

- 空值与长度校验；
- 提交中状态；
- API 错误；
- 响应 Schema 校验；
- 成功提示与 `appliedChanges`；
- 失败时保留旧方案。

## 12. v1.3 Provider 扩展边界

v1.2 不接真实 API，但不得破坏 v1.3 的扩展点：

- POI、路线、天气与开放时间仍应从服务端 Provider 进入；
- 移动端折叠组件只消费 `TripPlan`，不直接请求高德或天气服务；
- Cabinet 组件不保存坐标、距离或开放时间的私有副本；
- 未来真实性字段若进入核心 Schema，应由 v1.3 单独设计和迁移；
- Pending Changes 只表达用户意图，不伪装成经过真实数据验证的约束。

建议在 v1.3 起单独建立以下边界，而不是把地图逻辑混入 v1.2 页面组件：

- `PoiProvider`：负责 POI 搜索、标准化名称与地点基础信息；
- `RouteProvider`：负责路线距离、时间、出行方式与顺路性判断；
- `MapView`：负责地图展示、点位渲染、基础路线显示和卡片点位联动；
- `PlanPlaceRef` 或等价视图引用：负责把 `TripPlan` 中的地点与 POI / 地图点位建立稳定关联。

这些边界当前只停留在设计层，不在 v1.2 落地。v1.2 仍坚持：

- 不接地图 SDK；
- 不渲染真实地图；
- 不在客户端保存地图私有状态；
- 不让地图层反向修改 `TripPlan`。

## 13. 错误与失败模式

| 路径 | 失败模式 | 处理 | 用户是否可见 | 测试 |
|---|---|---|---|---|
| 移动折叠 | section key 不存在 | 忽略无效 key，保留当前 UI | 不需要 | 纯函数或页面逻辑 |
| Day 导航 | dayNumber 无效 | 不滚动、不更新错误 Day | 不需要 | 单元测试 |
| 加入修改 | 重复动作 | 去重 | 计数不增加 | 单元测试 |
| 加入修改 | 同积木冲突 | 按冲突表替换 | 清单显示最新选择 | 单元测试 |
| 写入修改框 | 清单为空 | 禁用或轻提示 | 是 | 交互验收 |
| 写入修改框 | 超长 | 保持两边状态，不截断 | 是 | 单元测试 + 手测 |
| 重新生成 | 网络 / API 失败 | 沿用现有错误与旧方案 | 是 | 现有 API 回归 |
| 重新生成 | 响应 Schema 无效 | 沿用现有失败提示 | 是 | 现有测试 |
| 重新生成 | 成功后旧引用残留 | 成功回调清空 | 不应发生 | 交互验收 |

任何“无测试、无处理、用户又完全无感”的失败都不能进入完成状态。

## 14. 安全与隐私

- 不新增外部请求和密钥；
- 不新增 HTML 富文本渲染；
- 修改意图继续作为普通字符串通过 JSON 提交；
- 继续受现有 `TRIP_INPUT_LIMITS.modificationRequest` 限制；
- 不把 Pending Changes 放入 URL；
- 不把修改内容写入日志或第三方分析；
- React 默认转义用户输入，组件不得改用不安全 HTML 注入；
- v1.2 不引入新依赖，避免为折叠、抽屉或状态管理增加大型库。

## 15. 可访问性

- 所有可点击区域使用 `button`；
- 展开入口使用 `aria-expanded` 与可关联的内容区域；
- 修改篮数量变化使用不过度打断的 `aria-live="polite"`；
- 删除单项必须有包含对象名称的可访问标签；
- 抽屉若实现为对话框，需管理焦点、Escape 和返回焦点；
- 不仅靠颜色表达 active、selected、error；
- 触控目标建议不小于 44px；
- sticky / bottom entry 不遮挡键盘焦点和主要内容；
- 尊重 `prefers-reduced-motion`。

## 16. 性能与复杂度

v1.2 不增加服务端负载。前端复杂度控制：

- `mapTripPlanToCabinets` 继续使用 `useMemo`；
- Pending Changes 数量受修改文本 1000 字上限自然约束；
- 使用数组纯函数即可，不引入全局状态库；
- 不为隐藏模块复制 `TripPlan`；
- 折叠只影响渲染层，不触发网络请求；
- 不为小列表引入虚拟滚动。

## 17. 预期文件范围

以下是阶段 1—6 的允许范围，不代表阶段 0 已修改：

```text
app/
  plan/page.tsx
  result/page.tsx
  globals.css
components/trip/
  ParsedTripCard.tsx
  StepQuestionForm.tsx
  MissingFieldsSummary.tsx
  ResultDayNav.tsx
  DayCabinetSummary.tsx
  DayCabinet.tsx
  TimeSlotSection.tsx
  ItineraryBlock.tsx
  BlockActions.tsx
  ModificationQuickActions.tsx
  RegenerateBox.tsx
  PendingChangesPanel.tsx      # 建议新增
  ResultSectionDisclosure.tsx  # 仅在重复明显时新增
lib/trip/
  itinerary-view.ts
  modification-intents.ts
  pending-changes.ts           # 建议新增纯函数
tests/trip/
  itinerary-view.test.ts
  modification-intents.test.ts
  pending-changes.test.ts
docs/
  PRD_v1.2.md
  TECH_DESIGN_v1.2.md
  V1.2_PHASE_PLAN.md
  PRODUCT_ROADMAP.md
  MANUAL_ACCEPTANCE.md
README.md
```

复杂度门槛：

- 每个阶段尽量不超过 8 个业务文件；
- 新增核心抽象只允许 `PendingChange` 与其纯函数；
- `ResultSectionDisclosure` 只有在至少三个模块产生重复时才新增；
- 不引入全局 store、状态机库、抽屉库或 UI 框架。

## 18. 测试设计

### 18.1 测试图

```text
NEW UX
├─ /plan mobile question flow
├─ /result progressive sections
├─ cabinet visual hierarchy
├─ explicit block detail button
└─ Pending Changes
   ├─ add
   ├─ dedupe
   ├─ resolve conflict
   ├─ remove
   ├─ clear
   ├─ compile
   └─ write without submit

NEW DATA FLOW
block / quick action
→ deterministic request text
→ pending array
→ compiled modificationRequest
→ existing RegenerateBox
→ existing API
→ complete TripPlan

NO NEW
├─ API route
├─ provider call
├─ database
├─ background job
└─ prompt / schema change
```

### 18.2 单元测试

`pending-changes.test.ts` 至少覆盖：

- 首条加入；
- 多条不同 block 加入；
- 完全重复去重；
- remove / replace / lock 互斥替换；
- addSimilar 与 lock 可并存；
- 快捷修改去重；
- 删除单项；
- 清空；
- 稳定编译顺序；
- 空清单；
- 合并已有自由文本；
- 超长检测不截断；
- 输入数组不被修改。

现有测试回归：

- `itinerary-view.test.ts`；
- `modification-intents.test.ts`；
- `schema.test.ts`；
- `generate-trip.test.ts`；
- `result-storage.test.ts`；
- `markdown.test.ts`。

### 18.3 组件与手动测试

项目当前没有 DOM 测试环境。v1.2 不为单次改版引入大型 E2E 体系；优先把状态规则抽成纯函数单测，并在阶段 6 完成浏览器手测。

至少检查：

- 360px、390px、430px、768px、1280px；
- 2 天、3 天、7 天方案；
- 超长地点名、长攻略、空 Slot；
- iOS / Android 常见日期控件表现；
- 键盘 Tab、Enter、Space、Escape；
- sticky / bottom entry 与软键盘；
- 页面无横向滚动；
- 手机折叠不影响复制和导出；
- 桌面回归。

## 19. 部署与回滚

阶段 1—5 均应保持可独立回退：

- 不含数据库迁移；
- 不含 API 协议迁移；
- 不含 Schema 迁移；
- 出现问题可按阶段 Git revert；
- 阶段 6 构建通过后再部署 Netlify；
- 部署后先做 Mock 主流程与 360px / 1280px 冒烟。

## 20. 技术完成标准

1. 移动端与桌面端可使用不同布局，但共享领域数据与修改规则；
2. `TripPlan` 仍是页面、复制和导出的唯一真实来源；
3. `DayCabinetView` 与现有 Cabinet 组件得到复用；
4. Pending Changes 只存在于前端页面状态；
5. 最终仍合并为一个 `modificationRequest`；
6. `RegenerateBox` 仍是唯一提交入口；
7. `/api/generate-trip` 协议和 `TripPlan` Schema 未修改；
8. 未接真实 API，Provider 边界未被 UI 穿透；
9. 没有无提示截断、无提示覆盖或旧 block ref 漂移；
10. 自动化检查与响应式手动验收通过。
