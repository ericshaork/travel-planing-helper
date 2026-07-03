# TECH_DESIGN v1.1：点击式旅行积木编辑

## 1. 文档定位

本文是 MVP 1.1 的增量技术设计。MVP 1.0 的架构、Provider、API、Schema、安全与错误处理仍以 `docs/TECH_DESIGN.md` 为准。

v1.1 的技术目标不是重写生成链路，而是在现有结构上增加：

- `/plan` 可定位的缺失字段反馈；
- `TripPlan` 到“柜子 / 格子 / 积木”的展示映射；
- 手机端 Day 摘要、展开和导航状态；
- 点击操作到修改意图的确定性转换；
- 修改草稿的本地恢复；
- 继续使用完整重新生成的单一数据流。

## 2. 设计原则与边界

### 2.1 复用现有领域模型

继续复用：

- `TripPlan`
- `DailyItinerary`
- `ItineraryItem`
- `TripRequest`
- `GenerateTripRequest`
- `GenerateTripResponse`

v1.1 不为了 UI 名称新增第二套 AI 输出 Schema。`DayCabinet`、`TimeSlot` 和 `ItineraryBlock` 是展示层概念，不是新的持久化旅行方案。

### 2.2 当前完整 `TripPlan` 是单一真实来源

- 页面展示来自当前 `TripPlan`；
- 复制和 Markdown 导出来自当前 `TripPlan`；
- 点击操作只形成“下一次重排意图”；
- 客户端不直接删除、替换或新增 `ItineraryItem` 作为最终结果；
- 只有 `/api/generate-trip` 返回且通过 Schema 校验的完整新 `TripPlan` 才能覆盖当前方案。

### 2.3 点击编辑优先于聊天

v1.1 使用确定性模板把点击动作转成清楚的中文修改句。LLM 负责重新生成完整方案，不负责维持多轮聊天状态。`RegenerateBox` 是“确认和补充修改意图”的输入区，不升级为聊天窗口。

## 3. 现有实现基线

当前代码已经具备：

- `DailyItinerary.morning / afternoon / evening` 固定三段；
- 每段包含 `ItineraryItem[]`；
- `/api/generate-trip` 接受 `tripRequest`、`previousPlan`、`modificationRequest`；
- 返回完整 `TripPlan` 与可选 `appliedChanges`；
- `tripPlanSchema` 校验完整方案；
- `saveTripPlan` 成功后覆盖 `travel-planning:trip-plan`；
- `toTripMarkdown(tripPlan)` 直接从完整方案生成导出；
- `/plan` 已有 `MissingTripRequestField` 和 `TripRequestNormalizationIssue`；
- localStorage 读取均有 Schema 校验和损坏数据清理。

因此 v1.1 的最小技术路径是扩展视图状态和修改意图编排，而不是修改 Provider 或核心 API。

## 4. 数据映射设计

### 4.1 固定映射

```text
TripPlan
└─ dailyItinerary[]          → DayCabinet[]
   ├─ morning[]              → TimeSlot("morning", "上午")
   │  └─ ItineraryItem       → ItineraryBlock
   ├─ afternoon[]            → TimeSlot("afternoon", "下午")
   │  └─ ItineraryItem       → ItineraryBlock
   └─ evening[]              → TimeSlot("evening", "晚上")
      └─ ItineraryItem       → ItineraryBlock
```

建议定义纯展示映射类型，放在 `lib/trip/itinerary-view.ts`，不进入 `tripPlanSchema`：

```ts
export type TimeSlotKey = "morning" | "afternoon" | "evening";

export interface TimeSlotView {
  key: TimeSlotKey;
  label: "上午" | "下午" | "晚上";
  items: ItineraryBlockView[];
}

export interface ItineraryBlockRef {
  day: number;
  slot: TimeSlotKey;
  itemIndex: number;
  placeName: string;
  type: ItineraryItem["type"];
}

export interface ItineraryBlockView {
  ref: ItineraryBlockRef;
  item: ItineraryItem;
}

export interface DayCabinetView {
  itinerary: DailyItinerary;
  slots: TimeSlotView[];
  itemCount: number;
}
```

建议导出纯函数：

```ts
mapDailyItineraryToCabinet(day: DailyItinerary): DayCabinetView
mapTripPlanToCabinets(plan: TripPlan): DayCabinetView[]
```

### 4.2 为什么引用包含 day、slot、itemIndex 和 placeName

现有 `ItineraryItem` 没有稳定 ID。v1.1 不应为 UI 操作强行修改 AI 输出 Schema，因此使用当前方案内的复合引用：

- `day`：限定哪一天；
- `slot`：限定上午 / 下午 / 晚上；
- `itemIndex`：区分同一时段的同名项；
- `placeName`：生成用户可读的修改句；
- `type`：辅助生成“景点 / 美食 / 交通”等措辞。

这些引用只对当前 `TripPlan` 有效。重新生成成功后必须清空旧引用，避免把上一版的 index 用到新方案。

### 4.3 空 Time Slot

即使某段数组为空，仍保留三个固定 `TimeSlot`。UI 可显示“这段先留白”，但不创建假的 `ItineraryItem`，也不要求 AI 补满。

## 5. 建议新增或调整的组件

建议新增：

| 组件 | 职责 |
|---|---|
| `MissingFieldsSummary.tsx` | 显示缺失数量与可点击字段入口 |
| `DayCabinet.tsx` | 组合一天的标题、路线、三个 Time Slot 和提醒 |
| `DayCabinetSummary.tsx` | 手机端折叠时显示 Day、主题与路线概览 |
| `TimeSlotSection.tsx` | 展示固定上午 / 下午 / 晚上及空状态 |
| `ItineraryBlock.tsx` | 展示单个 `ItineraryItem` |
| `BlockActions.tsx` | 四个积木操作及可访问状态 |
| `ResultDayNav.tsx` | Day 导航、当前 Day 和修改入口 |
| `ModificationQuickActions.tsx` | 五个快捷修改按钮 |
| `ModificationIntentPreview.tsx` | 展示、取消和检查待提交意图 |

建议调整：

| 文件 | 调整方向 |
|---|---|
| `app/plan/page.tsx` | 维护字段 ref、缺失摘要、步骤切换、滚动和聚焦 |
| `components/trip/StepQuestionForm.tsx` | 为字段增加稳定 id、字段级错误、高亮和 ref 注册 |
| `app/result/page.tsx` | 维护 active Day、移动端展开状态和 modification draft |
| `components/trip/RegenerateBox.tsx` | 改为受控或半受控输入，接收外部生成的修改意图 |
| `components/trip/DayItineraryCard.tsx` | 由新组件替代或收缩为兼容包装层 |
| `components/trip/AttractionCard.tsx` | 保留攻略展示，不建立第二套积木编辑状态 |

组件边界建议：

- 页面只组合状态与事件；
- 映射、约束合并和文案编译放在 `/lib/trip`；
- 展示组件不直接请求 API；
- `RegenerateBox` 继续负责确认、提交状态、错误和 `appliedChanges`；
- 积木按钮只触发 `onAction(intent)`。

## 6. `/plan` 缺失字段技术设计

### 6.1 统一字段元数据

建议在 `lib/trip/plan-fields.ts` 定义：

```ts
interface PlanFieldMeta {
  field: MissingTripRequestFieldName | string;
  label: string;
  step: number;
  elementId: string;
}
```

它统一服务于：

- 顶部摘要标签；
- `stepForMissingFields` / `stepForIssues`；
- 字段 id；
- 点击定位；
- 第一个错误排序。

不要在页面、摘要和表单中各维护一份字段到步骤的映射。

### 6.2 错误来源

页面将两类信息归一为可展示字段错误：

1. `getMissingTripRequestFields(draft)` 返回的缺失项；
2. `normalizeTripRequestDraft(draft)` 返回的 Schema / 组合问题。

归一结果建议：

```ts
interface PlanFieldError {
  field: string;
  message: string;
  step: number;
  elementId: string;
  kind: "missing" | "invalid";
}
```

### 6.3 点击定位流程

```text
点击 MissingFieldsSummary 项
→ 根据字段元数据切换 currentStep
→ 等待该步骤 DOM 提交
→ element.scrollIntoView({ block: "center" })
→ focus()
```

React 实现可用“待聚焦字段”状态加 `useEffect`，避免切换步骤后元素尚未挂载。提交失败复用同一流程定位排序后的第一个错误。

### 6.4 字段可访问性

每个字段需具备：

- 稳定 `id`；
- `aria-invalid={true}`；
- `aria-describedby` 指向错误文本；
- 错误文本 `role="alert"` 或由顶部统一 live region 通知；
- 不只依赖颜色表达错误；
- 焦点样式和错误高亮同时可见。

兴趣和风格属于按钮组，应把错误挂到 `fieldset` / `legend` 附近，而不是给每个按钮重复提示。

## 7. 轻量 constraints 设计

### 7.1 是否需要

建议新增轻量 constraints，但只作为“当前方案的未提交修改草稿”，不进入 `TripPlan`，也不直接扩展 API 请求。

原因：

- 单一字符串不方便去重、取消或处理互斥操作；
- “不要”和“一定保留”需要冲突处理；
- 用户刷新结果页后应能恢复尚未提交的点击意图；
- 最终仍可统一编译为现有 `modificationRequest`，不改变服务端协议。

### 7.2 建议结构

放在 `lib/trip/modification.ts`：

```ts
export type StyleAdjustment =
  | "relaxed"
  | "less_walking"
  | "lower_budget"
  | "more_food_or_night_market"
  | "no_early_start";

export interface PreferredAddition {
  mode: "replace" | "similar" | "food_or_night_market";
  source?: ItineraryBlockRef;
}

export interface ModificationConstraints {
  version: 1;
  avoidPlaces: ItineraryBlockRef[];
  lockedPlaces: ItineraryBlockRef[];
  preferredAdditions: PreferredAddition[];
  styleAdjustments: StyleAdjustment[];
}
```

字段语义：

- `avoidPlaces`：来自“不想要这个”；
- `lockedPlaces`：来自“一定保留”；
- `preferredAdditions(mode: "replace")`：来自“换一个”；
- `preferredAdditions(mode: "similar")`：来自“加类似”；
- `styleAdjustments`：来自五个快捷修改；
- `food_or_night_market`：快捷新增美食 / 夜市。

如果实现中发现 `preferredAdditions` 同时承载替换与新增不够清楚，可改名为 `changeRequests`；但 v1.1 不应把它扩张成通用工作流 DSL。

### 7.3 冲突与去重

纯函数 `applyBlockAction` 负责：

- 同一 block 的“不想要”移除其“锁定”；
- 同一 block 的“一定保留”移除其“不要”；
- “换一个”与“不想要”二选一，以最后一次明确操作为准；
- “加类似”可以与“保留”并存；
- 重复点击同一动作可切换取消；
- 快捷修改按枚举去重。

所有规则必须有单元测试，不把冲突处理散落在按钮组件中。

## 8. constraints 的 localStorage 设计

### 8.1 新 key

建议：

```text
travel-planning:modification-draft
```

存储 envelope：

```ts
interface StoredModificationDraft {
  version: 1;
  planSignature: string;
  constraints: ModificationConstraints;
  freeformText: string;
  updatedAt: string;
}
```

### 8.2 planSignature

现有 `TripPlan` 没有 ID。建议根据当前方案中稳定、非敏感的字段生成本地签名，例如：

- `tripTitle`
- `destination`
- `days`
- 每天的 `day`
- 各时段 `placeName`

签名只用于判断修改草稿是否属于当前方案，不用于安全校验。可使用本地确定性序列化加轻量 hash，不引入新依赖。

### 8.3 读写规则

- 写入前通过独立 Zod Schema 校验；
- 页面加载时，签名匹配才恢复；
- JSON 损坏、版本不支持或签名不匹配时删除；
- 新行程生成成功后清空旧 modification draft；
- 用户主动“清空修改”时删除；
- 重新生成失败时保留，方便重试；
- 首页开始一张新草稿时一并清理；
- 不保存聊天历史，因为 v1.1 没有聊天系统。

## 9. constraints 合并为 modificationRequest

### 9.1 单向编译

建议纯函数：

```ts
compileModificationRequest(
  constraints: ModificationConstraints,
  freeformText: string,
): string
```

编译顺序保持稳定：

1. 必须保留；
2. 不要 / 替换；
3. 新增类似或美食夜市；
4. 全局节奏、步行、预算和作息；
5. 用户自由补充。

稳定顺序便于预览、去重、测试和失败重试。

### 9.2 文案模板

示例：

```text
必须保留：第 1 天上午的鼓浪屿，重排时不要删除。
不要安排：删除第 2 天晚上的某夜市，也不要移到其他时段。
替换：把第 3 天下午的某景点换成同区域、强度相近的替代安排。
新增：在不让行程过满的前提下，增加一个与沙坡尾类似的体验。
整体调整：行程轻松一点；减少不必要步行；不要安排过早出发。
补充：第二天晚上想早点回酒店。
```

每条 block 文案必须带 Day、时间段、地点和动作。不要只写“换掉这个”。

### 9.3 长度控制

编译后必须检查现有 `TRIP_INPUT_LIMITS.modificationRequest`：

- UI 显示当前长度；
- 超限时阻止提交；
- 提示用户取消部分意图或缩短自由文本；
- 不静默截断，因为截断可能丢掉“必须保留”等关键约束；
- v1.1 不通过提高上限来掩盖无限堆积意图。

## 10. 点击积木操作到 RegenerateBox

推荐数据流：

```text
BlockActions
→ emit(blockRef, action)
→ applyBlockAction(currentConstraints)
→ compileModificationRequest()
→ ModificationIntentPreview
→ RegenerateBox textarea / preview
→ 用户编辑或补充
→ 用户点击确认
→ submit regeneration
```

`RegenerateBox` 建议支持受控输入：

```ts
interface RegenerateBoxProps {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
  modificationRequest: string;
  onModificationRequestChange: (value: string) => void;
  onRegenerated: (response: GenerateTripResponse) => void;
}
```

如果保留内部状态，则至少提供 `prefillRequest` 与明确同步规则；优先受控方案，避免点击积木后外部意图和 textarea 内部文本分叉。

点击积木后可：

- 在按钮附近显示“已加入修改”；
- 更新顶部或粘性修改入口的数量；
- 不强制立刻滚到底部，避免打断浏览；
- 用户点击“查看修改”或顶部“修改”后定位 `RegenerateBox`。

## 11. 继续复用 `/api/generate-trip`

请求保持不变：

```ts
{
  tripRequest,
  previousPlan: tripPlan,
  modificationRequest: compiledRequest
}
```

响应保持不变：

```ts
{
  tripPlan: TripPlan,
  appliedChanges?: string[],
  warnings?: string[]
}
```

v1.1 不新增：

- `/api/regenerate-trip`
- `/api/patch-trip`
- `/api/chat`
- constraints 专用服务端协议

现有 Prompt 可能需要小幅强化：

- 明确识别“必须保留”“不要安排”“替换”“增加类似”；
- 保留未被修改的约束；
- 返回完整方案；
- `appliedChanges` 使用用户能核对的具体描述；
- 仍不得编造实时信息。

Prompt 调整统一放在 `lib/ai/prompts.ts`。

## 12. 为什么不做局部 Patch

局部 Patch 会引入当前阶段不需要的复杂度：

- 删除一个地点后，路线顺序、交通说明、天气替代、预算和当天提醒可能同时失效；
- 客户端很难验证局部修改后的完整 `TripPlan` 仍自洽；
- Patch 与完整方案会形成两个数据源；
- Mock、真实模型、复制和导出都需要新增兼容分支；
- 需要稳定 item ID、Patch Schema、冲突合并和回滚机制；
- 当前朋友反馈要求的是“更容易表达修改”，不是“毫秒级局部编辑”。

完整重新生成虽然成本更高，但延续了 1.0 已验证的安全边界，也让服务端能统一重排路线、预算、天气和说明。

## 13. 为什么 v1.1 不做拖拽、时间轴和地图 API

### 拖拽

拖拽需要排序语义、跨时段移动、键盘替代操作、触屏冲突、回滚和新的 Prompt 表达。它不能直接解决用户“不知道怎样说修改要求”的首要问题。

### 精确时间轴

现有 `timeLabel` 是可选文本，不足以支持冲突检测和分钟级计算。时间轴需要新的时间模型、开放时间和通勤数据，属于 2.0 工作台能力。

### 地图 API

地图接入需要 POI 标准化、坐标、歧义处理、配额、错误降级和距离可信边界。真实性增强应在 v1.3 独立验证，不能与 v1.1 的编辑心智模型混在一起。

## 14. 手机端 Day 摘要与展开设计

### 14.1 状态

结果页只维护展示状态：

```ts
activeDay: number
expandedDay: number
```

桌面端可以渲染全部展开；手机端默认：

- `activeDay` 为第一个有效 Day；
- 只展开 `expandedDay`；
- 其他 Day 显示 `DayCabinetSummary`；
- 点击摘要或导航更新二者并滚动定位。

### 14.2 不破坏现有结果页

- 不修改 `tripPlan.dailyItinerary`；
- 不过滤或丢弃折叠 Day 的数据；
- 使用语义化按钮和 `aria-expanded`；
- Day 内容保持在正常 DOM 阅读顺序；
- JavaScript 状态异常时仍至少能显示完整内容；
- 顶部总览、天气、预算顺序保持不变；
- 住宿、交通、注意事项和导出仍位于每日行程之后；
- “修改”入口只定位，不创建第二个 `RegenerateBox`。

### 14.3 导航定位

为 Day Cabinet 使用稳定锚点：

```text
result-day-1
result-day-2
...
result-modification
```

粘性导航要避免遮挡标题，可使用 `scroll-margin-top`。如果 sticky 在小屏幕占用过多高度，应优先做紧凑横向滚动或换行，不牺牲内容区域。

## 15. 复制与 Markdown 导出

`ExportActions` 与 `toTripMarkdown` 的输入保持：

```ts
tripPlan: TripPlan
```

明确规则：

- 不从 DOM 抽取；
- 不读取 Day 展开状态；
- 不把 constraints、按钮状态和未提交修改写入导出；
- 重新生成成功后，`saveTripPlan` 与 React state 同步更新；
- 导出立即使用新 state；
- 失败时 state 和 localStorage 都保留旧方案；
- 每个 Day 无论 UI 是否折叠，都完整导出。

## 16. 预期文件变更

以下是实现阶段建议，不代表阶段 0 已修改：

```text
app/
  plan/page.tsx
  result/page.tsx
components/trip/
  StepQuestionForm.tsx
  RegenerateBox.tsx
  MissingFieldsSummary.tsx
  DayCabinet.tsx
  DayCabinetSummary.tsx
  TimeSlotSection.tsx
  ItineraryBlock.tsx
  BlockActions.tsx
  ResultDayNav.tsx
  ModificationQuickActions.tsx
  ModificationIntentPreview.tsx
lib/trip/
  itinerary-view.ts
  modification.ts
  modification-schema.ts
  storage.ts
  normalize.ts
lib/ai/
  prompts.ts
styles/
  globals.css
tests/
  trip/itinerary-view.test.ts
  trip/modification.test.ts
  trip/modification-storage.test.ts
  （现有相关回归测试）
```

不建议在 v1.1 修改 `TripPlan` Schema、Weather Provider 或新建 API route。

## 17. 测试策略

### 17.1 单元测试

#### `/plan`

- 缺失字段到步骤 / elementId 的映射；
- 多个错误按页面阅读顺序排序；
- 日期组合问题定位；
- 修改后错误清理。

#### 映射

- 每个 `DailyItinerary` 生成三个固定 Time Slot；
- morning / afternoon / evening 不串位；
- 空数组保留空格子；
- block ref 对 day、slot、index、placeName 正确；
- 映射不修改原对象。

#### constraints

- 四个积木动作正确写入；
- 同一 block 的互斥操作正确解决；
- 重复动作去重或取消；
- 五个快捷修改去重；
- 编译顺序稳定；
- 文案包含 Day、时段和地点；
- 自由文本合并；
- 超长不静默截断。

#### storage

- 有效草稿保存和恢复；
- 损坏 JSON 清理；
- Schema 不匹配清理；
- planSignature 不匹配清理；
- 重排成功后清理；
- 重排失败后保留。

### 17.2 组件与交互测试

- 点击缺失摘要切换步骤、滚动并聚焦；
- `aria-invalid` 和错误说明关联；
- Day 导航选中态；
- 手机摘要展开 / 收起；
- 四个按钮不直接请求 API；
- 点击操作更新预览与 textarea；
- 取消意图同步更新；
- “修改”入口定位；
- 提交期间按钮禁用；
- `appliedChanges` 与错误状态可读。

项目当前以 Vitest 为主。如果暂未配置 DOM 测试环境，阶段 1—6 可先把核心逻辑抽成纯函数单测，同时在阶段 7 补充必要的浏览器手动验收；不要为了 v1.1 引入重量级 E2E 基础设施，除非实现中已有明确收益。

### 17.3 API 与 Provider 回归

- 原始生成请求仍可用；
- 重新生成请求结构不变；
- Mock AI 能理解标准模板意图；
- 真实 Provider 输出仍通过 Schema；
- 天气失败不阻断；
- API 错误不泄露第三方细节。

### 17.4 导出回归

- 展开一个 Day 时仍导出全部 Day；
- 未提交修改不进入导出；
- 成功重排后导出新方案；
- 失败后导出旧方案；
- 中文、文件名和 UTF-8 不回归。

### 17.5 响应式与可访问性

至少检查：

- 360px、390px、430px、1280px；
- 3 天和 7 天方案；
- 超长地点名与长攻略；
- 空 Time Slot；
- 键盘 Tab、Enter、Space；
- 焦点可见；
- `prefers-reduced-motion`；
- sticky Day 导航不遮挡目标内容；
- 无横向页面滚动。

## 18. 回归命令

每个实现阶段至少运行与改动直接相关的测试，阶段 7 运行全量：

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 19. 技术完成标准

v1.1 技术完成必须满足：

1. 核心 `TripPlan` Schema 未因展示概念被重复建模；
2. 点击动作可确定性生成、合并、取消和恢复；
3. constraints 只作为当前方案的修改草稿；
4. `/api/generate-trip` 协议保持兼容；
5. 重新生成仍返回完整方案；
6. 手机展开状态不影响数据和导出；
7. 失败时旧方案与修改草稿都安全保留；
8. 不包含拖拽、时间轴、地图、数据库和聊天历史；
9. 自动化检查与手动回归通过。
