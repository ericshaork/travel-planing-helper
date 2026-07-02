# TECH_DESIGN v0.1 - AI 自由行出行规划网站

## 1. 技术设计目标

本技术设计文档服务于 MVP v0.1，实现一个面向自由行新手的 AI 出行规划网站。

MVP 的核心技术目标：

1. 支持用户输入一句旅行需求；
2. 支持分步补充核心字段；
3. 调用天气 API 获取目的地天气；
4. 调用 LLM 生成结构化旅行方案；
5. 将旅行方案渲染为卡片式结果页；
6. 支持复制和导出 Markdown；
7. 支持基于补充要求重新生成完整方案。

## 2. 推荐技术栈

### 2.1 前端

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui，可选

### 2.2 后端

MVP 推荐使用 Next.js API Routes / Route Handlers，减少前后端分离复杂度。

可选方案：

- Next.js Route Handlers：适合 MVP 快速开发；
- FastAPI：适合后续扩展成独立 AI 服务；
- Node.js + Express：也可行，但对于 Next.js 项目不是第一优先。

MVP 默认选择：

```text
Next.js + TypeScript + Route Handlers
```

### 2.3 AI 服务

- 业务层统一通过 `LLMProvider` 调用模型，不直接依赖具体模型平台；
- MVP 提供 `MockLLMProvider` 和 `OpenAICompatibleProvider`；
- `OpenAICompatibleProvider` 通过中立环境变量配置 `baseURL`、`apiKey` 和 `model`；
- MVP 优先适配国内免费或低成本的 OpenAI-Compatible 平台，例如 SiliconFlow、通义千问兼容接口和 DeepSeek 兼容接口；
- 代码中不得根据 SiliconFlow、通义、DeepSeek、OpenAI 等平台名称编写业务分支；
- 后续接入 OpenAI 官方 API 时同样通过环境变量切换，不改变业务代码；
- AI 输出必须使用结构化 JSON，并由服务端进行 Zod schema 校验；
- `USE_MOCK_AI=true` 时不需要 API Key，也能演示解析、生成和修改后重新生成的完整流程；
- 所有模型调用只能发生在 Route Handler 或带 `server-only` 保护的服务端模块中。

### 2.4 天气服务

推荐抽象为 `WeatherProvider`，避免业务代码绑定具体天气服务。

可选天气 API：

- QWeather / 和风天气：更适合国内城市；
- OpenWeatherMap：更适合国际城市和快速接入。

MVP 可以先实现一个 Provider，后续保留切换空间。

### 2.5 数据库

MVP v0.1 暂不需要用户登录和历史记录，因此可以不接数据库。

如果需要保存匿名生成记录或调试日志，可后续加入：

- PostgreSQL；
- Supabase；
- SQLite，仅本地开发或 Demo 用。

### 2.6 部署

推荐：

- Vercel：部署 Next.js 前端和 API Routes；
- 环境变量存储 API Key；
- GitHub 管理代码。

## 3. 系统架构

### 3.1 MVP 架构

```text
User Browser
  ↓
Next.js Frontend
  ↓
Next.js API Routes
  ↓
Travel Planning Service
  ↓
Weather Provider + LLMProvider
  ↓                    ↓
QWeather/Mock   OpenAI-Compatible/Mock
  ↓
Structured Trip Plan JSON
  ↓
Frontend Result Page
```

### 3.2 核心模块

| 模块 | 作用 |
|---|---|
| Frontend Pages | 首页、分步补充页、结果页 |
| Form State | 管理用户输入和补充信息 |
| Trip Parser | 从自然语言中解析旅行字段 |
| Weather Provider | 查询目的地天气 |
| LLMProvider | 统一模型调用边界，隔离具体模型平台 |
| MockLLMProvider | 无 API Key 时提供符合正式 Schema 的演示数据 |
| OpenAICompatibleProvider | 通过环境变量调用任意兼容接口 |
| Trip Planner Service | 整合用户需求、天气和 AI 输出 |
| Schema Validator | 校验 AI 输出 JSON |
| Export Utility | 复制和导出 Markdown |

## 4. 项目结构

推荐项目结构：

```text
/app
  /page.tsx
  /plan/page.tsx
  /result/page.tsx
  /api
    /parse-trip/route.ts
    /generate-trip/route.ts
/components
  /layout
    Header.tsx
    Footer.tsx
  /trip
    NaturalLanguageInput.tsx
    ParsedTripCard.tsx
    StepQuestionForm.tsx
    InterestSelector.tsx
    TravelStyleSelector.tsx
    GenerateLoading.tsx
    TripSummaryCard.tsx
    WeatherAlertCard.tsx
    BudgetSummaryCard.tsx
    DayItineraryCard.tsx
    AttractionCard.tsx
    HotelAreaAdvice.tsx
    TransportAdvice.tsx
    ExportActions.tsx
    RegenerateBox.tsx
/lib
  /ai
    client.ts
    provider.ts
    types.ts
    mock.ts
    openai-compatible.ts
    prompts.ts
    parseTrip.ts
    generateTrip.ts
  /weather
    types.ts
    provider.ts
    qweather.ts
    mock.ts
    client.ts
  /trip
    schema.ts
    types.ts
    validators.ts
    markdown.ts
    defaults.ts
    storage.ts
    simpleParser.ts
  /utils
    format.ts
    errors.ts
    env.ts
/public
/styles
  globals.css
/docs
  PRD.md
  TECH_DESIGN.md
  MANUAL_ACCEPTANCE.md
/AGENTS.md
```

## 5. 页面设计

### 5.1 首页 `/`

职责：收集用户的一句话旅行需求。

组件：

- `NaturalLanguageInput`
- `InterestSelector`，可选快捷标签
- `TravelStyleSelector`，可选快捷标签

交互：

1. 用户输入一句话需求；
2. 点击“开始规划”；
3. 调用 `/api/parse-trip`；
4. 跳转到 `/plan` 并展示解析结果。

### 5.2 分步补充页 `/plan`

职责：展示已解析信息，并补充缺失字段。

组件：

- `ParsedTripCard`
- `StepQuestionForm`
- `InterestSelector`
- `TravelStyleSelector`

交互：

1. 展示系统识别出的字段；
2. 允许用户修改；
3. 对缺失必填字段进行追问；
4. 用户确认后调用 `/api/generate-trip`；
5. 跳转到 `/result`。

### 5.3 结果页 `/result`

职责：展示完整旅行方案。

组件：

- `TripSummaryCard`
- `WeatherAlertCard`
- `BudgetSummaryCard`
- `DayItineraryCard`
- `AttractionCard`
- `HotelAreaAdvice`
- `TransportAdvice`
- `ExportActions`
- `RegenerateBox`

交互：

1. 展示 AI 生成结果；
2. 用户可以复制完整方案；
3. 用户可以导出 Markdown；
4. 用户可以输入补充要求，再次调用 `/api/generate-trip` 重新生成完整方案。

## 6. API 设计

### 6.1 `POST /api/parse-trip`

功能：解析用户自然语言输入，提取结构化旅行需求。

请求：

```ts
interface ParseTripRequest {
  text: string;
}
```

响应：

```ts
interface ParseTripResponse {
  parsed: TripRequestDraft;
  missingFields: string[];
  followUpQuestions: string[];
}
```

### 6.2 `POST /api/generate-trip`

功能：根据完整用户需求，查询天气并生成旅行方案。

请求：

```ts
interface GenerateTripRequest {
  tripRequest: TripRequest;
  modificationRequest?: string;
  previousPlan?: TripPlan;
}
```

响应：

```ts
interface GenerateTripResponse {
  tripPlan: TripPlan;
  appliedChanges?: string[];
  warnings?: string[];
}
```

当 `modificationRequest` 和 `previousPlan` 存在时，该接口基于原始需求、上一版方案和新增要求返回完整新方案。MVP 不返回局部 patch，也不建立连续聊天记忆。

## 7. 数据结构设计

### 7.1 旅行需求草稿

```ts
export interface TripRequestDraft {
  departureCity?: string;
  destinationCity?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  budget?: number;
  currency?: string;
  interests?: string[];
  travelStyles?: string[];
  mustVisitPlaces?: string[];
  avoidPlaces?: string[];
  accommodationPreference?: string;
  localTransportPreference?: string;
  schedulePreference?: string;
  specialRequirements?: string;
}
```

### 7.2 完整旅行需求

```ts
export interface TripRequest {
  departureCity: string;
  destinationCity: string;
  startDate?: string;
  endDate?: string;
  days: number;
  budget: number;
  currency: string;
  interests: string[];
  travelStyles: string[];
  mustVisitPlaces: string[];
  avoidPlaces: string[];
  accommodationPreference?: string;
  localTransportPreference?: string;
  schedulePreference?: string;
  specialRequirements?: string;
}
```

### 7.3 天气数据

```ts
export interface WeatherForecast {
  city: string;
  forecastDays: WeatherDay[];
  alerts?: WeatherAlert[];
}

export interface WeatherDay {
  date: string;
  dayWeather: string;
  nightWeather?: string;
  tempMax?: number;
  tempMin?: number;
  precipitationProbability?: number;
  wind?: string;
  summary: string;
}

export interface WeatherAlert {
  title: string;
  level?: string;
  description: string;
  startTime?: string;
  endTime?: string;
}
```

### 7.4 旅行方案

```ts
export interface TripPlan {
  tripTitle: string;
  summary: string;
  destination: string;
  days: number;
  travelStyleSummary: string;
  weatherSummary: WeatherSummary;
  budgetSummary: BudgetSummary;
  hotelAreaAdvice: HotelAreaAdvice[];
  transportAdvice: TransportAdvice;
  dailyItinerary: DailyItinerary[];
  generalTips: string[];
  warnings: string[];
}
```

### 7.5 每日行程

```ts
export interface DailyItinerary {
  day: number;
  date?: string;
  theme: string;
  routeOrder: string[];
  routeReason: string;
  morning: ItineraryItem[];
  afternoon: ItineraryItem[];
  evening: ItineraryItem[];
  dailyTips: string[];
}

export interface ItineraryItem {
  timeLabel?: string;
  placeName: string;
  type: 'attraction' | 'food' | 'transport' | 'hotel' | 'free_time' | 'shopping' | 'other';
  reason: string;
  suggestedDuration?: string;
  guide: string[];
  transportFromPrevious?: string;
  weatherImpact?: string;
  backupPlan?: string;
  matchedInterests?: string[];
}
```

### 7.6 预算摘要

```ts
export interface BudgetSummary {
  totalEstimate: string;
  transport: string;
  hotel: string;
  food: string;
  tickets: string;
  localTransport: string;
  flexibleSpending: string;
  note: string;
}
```

### 7.7 住宿建议

```ts
export interface HotelAreaAdvice {
  area: string;
  reason: string;
  suitableFor: string;
  transportationConvenience: string;
  possibleDownside?: string;
  suggestedPlatforms: string[];
}
```

### 7.8 往返交通建议

```ts
export interface TransportAdvice {
  summary: string;
  options: TransportOption[];
  suggestedPlatforms: string[];
  note: string;
}

export interface TransportOption {
  mode: 'flight' | 'train' | 'high_speed_rail' | 'bus' | 'ship' | 'other';
  pros: string[];
  cons: string[];
  recommendation: string;
}
```

## 8. AI Provider 与 Prompt 设计

### 8.1 LLMProvider

业务层只能调用统一的 `LLMProvider`。Provider 接收任务类型、消息和结构化输出要求，具体平台的请求细节封装在 Provider 内部。

MVP 实现：

- `MockLLMProvider`：使用简单规则和固定生成逻辑，覆盖自然语言解析、缺失字段与追问、行程生成、天气失败 warning、修改后重新生成，以及复制和 Markdown 导出所需的完整数据结构；
- `OpenAICompatibleProvider`：调用环境变量配置的 OpenAI-Compatible `/chat/completions` 接口，不绑定特定厂商。

Provider 选择规则：

1. `USE_MOCK_AI=true` 时使用 `MockLLMProvider`，不读取 API Key；
2. `USE_MOCK_AI=false` 时使用 `OpenAICompatibleProvider`；
3. 真实模式缺少 `LLM_BASE_URL`、`LLM_API_KEY` 或 `LLM_MODEL` 时返回服务端友好配置错误；
4. 客户端组件不得导入 Provider、环境变量或模型请求客户端。

### 8.2 结构化输出处理

为兼容不同国内平台，MVP 不强依赖某个平台专有的 Structured Outputs。真实模型输出按以下流程处理：

1. Prompt 明确要求只返回 JSON；
2. 服务端提取 JSON；
3. 使用 Zod 校验；
4. 校验失败时最多调用模型修复一次；
5. 再次失败则返回统一的 `AI_OUTPUT_INVALID` 错误。

Mock 输出也必须经过相同的正式 Schema 校验，前端不得为 Mock 数据建立专用渲染分支。

### 8.3 解析 Prompt

目标：从自然语言中提取旅行需求字段。

要求：

- 只提取用户明确提供的信息；
- 不要编造日期、预算、城市；
- 识别缺失字段；
- 返回 JSON。

### 8.4 生成 Prompt

目标：基于完整用户需求和天气数据生成旅行方案。

核心约束：

1. 不要安排过满；
2. 尊重用户必去和不想去地点；
3. 景点顺序尽量顺路；
4. 根据天气提醒调整户外景点；
5. 预算必须符合用户范围；
6. 对不确定信息注明建议出行前再次确认；
7. 不要编造实时票价、酒店价格、开放状态；
8. 输出结构化 JSON。

### 8.5 重新生成 Prompt

目标：通过 `/api/generate-trip` 的可选 `previousPlan` 和 `modificationRequest`，基于原始需求、原始方案和用户新增修改要求重新生成完整方案。

要求：

- 保留未被修改的原始约束；
- 明确应用用户新增要求；
- 不做局部 patch，直接返回完整新方案；
- 返回 appliedChanges 字段说明修改点。

## 9. 天气 Provider 设计

### 9.1 Provider 接口

```ts
export interface WeatherProvider {
  getForecast(input: WeatherQuery): Promise<WeatherForecast>;
}

export interface WeatherQuery {
  city: string;
  startDate?: string;
  endDate?: string;
  days: number;
}
```

### 9.2 Provider 实现

MVP 实现 `QWeatherProvider` 和开发环境使用的 `MockWeatherProvider`。两者通过服务端天气 Provider 工厂切换，AI Mock 与天气 Mock 相互独立。

- `USE_MOCK_WEATHER=true` 时使用 Mock 天气；
- 配置 QWeather Key 且关闭 Mock 时使用 `QWeatherProvider`；
- 开发环境没有 QWeather API Key 时自动降级为 Mock 天气并返回提示，不能阻断本地演示；
- 如果天气 API 不支持用户日期范围，需要返回可获取范围内的数据，并在结果中提示天气数据限制。

### 9.3 天气失败处理

如果天气服务失败：

- API 不应整体失败；
- 返回基础行程；
- 在 `warnings` 中添加“实时天气获取失败”的提示；
- AI 生成时不应声称已经获取实时天气。
- 浏览器不得直接请求 QWeather 或任何其他天气平台。

## 10. 状态管理

MVP 可使用前端本地状态和 `localStorage` 保存临时数据。

需要保存：

- 原始自然语言输入；
- 解析后的 `TripRequestDraft`；
- 完整的 `TripRequest`；
- 最近生成的 `TripPlan`。

修改要求仅用于当次重新生成请求；MVP 不保存修改对话或历史版本。重新生成成功后直接覆盖最近的 `TripPlan`。

后续如果增加登录和历史记录，再迁移到数据库。

## 11. 组件设计

### 11.1 输入相关组件

| 组件 | 作用 |
|---|---|
| `NaturalLanguageInput` | 首页一句话输入 |
| `InterestSelector` | 兴趣标签选择 |
| `TravelStyleSelector` | 出行风格选择 |
| `ParsedTripCard` | 展示系统识别出的字段 |
| `StepQuestionForm` | 分步补充缺失字段 |

### 11.2 结果相关组件

| 组件 | 作用 |
|---|---|
| `TripSummaryCard` | 旅行总览 |
| `WeatherAlertCard` | 天气提醒 |
| `BudgetSummaryCard` | 预算摘要 |
| `DayItineraryCard` | 每日行程 |
| `AttractionCard` | 单个景点/活动详情 |
| `HotelAreaAdvice` | 住宿区域建议 |
| `TransportAdvice` | 往返交通建议 |
| `ExportActions` | 复制和导出 Markdown |
| `RegenerateBox` | 补充要求后重新生成 |

## 12. UI Design Guidelines

### 12.1 设计目标

产品不是企业 SaaS，也不是炫技型 AI 工具。界面应像一个懂旅行的朋友整理出的旅行手账：轻松、可信、有生活感，用户可以快速看懂并照着执行。

设计决策优先级：

1. 信息清楚；
2. 自由行新手容易理解和操作；
3. 内容有旅行场景感；
4. 视觉有定制感；
5. 装饰和动画。

任何装饰都不能牺牲结果页的阅读、复制、响应式布局和基础无障碍体验。

### 12.2 视觉系统

- 主色调优先使用米白、纸张色、浅沙色、浅灰绿和墨色文字，不使用默认 Tailwind 蓝紫色板作为主视觉；
- 颜色、间距、圆角、阴影、边框和纹理等视觉常量集中在 `styles/globals.css` 或统一 theme 配置中，使用语义化变量，避免散落硬编码；
- 背景可使用低对比度纸张纹理、轻微噪点或柔和渐变，但不能影响文字对比度；
- 卡片可借鉴行程便签、车票、小票、地图标注等形式，保持足够留白、稳定的标题层级和清晰的阅读顺序；
- 布局允许轻微不对称，但表单、路线、预算和操作区必须保持可预测的对齐与交互位置；
- 组件需要定制样式，不直接呈现 Shadcn 或 Material UI 默认外观。

### 12.3 视觉禁止项

不得使用：

- 大面积紫色、靛蓝色或蓝紫渐变；
- Hero + 三张功能卡片的传统 SaaS 首页；
- 完美居中的大标题、副标题、CTA 套路；
- 玻璃拟态卡片堆叠；
- 一屏三个等宽功能模块；
- AI 光效、发光球、科技网格等无实际信息价值的背景；
- Emoji 作为主要功能图标；
- Lorem Ipsum 或空泛占位文案。

### 12.4 首页结构

首页保持单一主任务，不做传统 SaaS 三段式。推荐阅读顺序：

1. 偏口语的开场标题，例如“攻略太多？先扔给我。”；
2. 一句话旅行需求输入框；
3. 几个真实、具体、可直接使用的示例输入；
4. 兴趣和风格快捷标签；
5. 简短说明会生成每日路线、天气提醒和预算估算，同时说明实时信息需要用户再次核实。

输入框应是页面视觉与交互中心，但不要使用夸张 Hero、空泛卖点或大面积装饰抢占注意力。

### 12.5 结果页

结果页固定保持以下信息顺序：

1. 旅行总览；
2. 天气提醒；
3. 预算摘要；
4. 每日行程；
5. 景点攻略；
6. 住宿区域建议；
7. 交通建议；
8. 复制、导出和重新生成操作区。

可使用行程手账、城市便签、每日路线卡、小票式预算和天气提醒贴纸等视觉隐喻。视觉差异用于帮助用户识别信息类型，不能打乱 DOM 阅读顺序、降低文字对比度或妨碍复制。

### 12.6 文案与状态反馈

界面文案应口语化、句子短、具体、有场景感，可以轻微幽默，但不要油腻或过度营销。

避免“赋能”“智能化解决方案”“一站式”“革新你的旅行体验”“AI 驱动的下一代平台”“无缝衔接”“极致体验”等发布会式表达。

Loading 使用分步骤、可理解的文案：

- “先看天气”；
- “再排路线”；
- “避开绕路”；
- “把攻略压缩一下”。

错误提示应说明发生了什么以及系统如何继续，例如：

- “天气接口刚刚没接上，先给你一版不含实时天气的。”；
- “这个预算有点紧，我会按省一点的方式排。”；
- “模型刚刚没吐出合格格式，再试一次。”。

### 12.7 组件、图标与动画

- 不引入大型 UI 框架套模板；Tailwind 用于实现定制设计，不使用默认模板感配色；
- 功能图标优先使用 Iconify，同一页面保持统一图标集和线条风格，不使用 Emoji 代替图标；
- 动画只用于状态变化、展开收起和轻量反馈，时长短、节奏自然，不使用机械线性动画；
- 支持 `prefers-reduced-motion`，不让动画成为理解流程的必要条件；
- 焦点状态、点击区域、文字对比度和移动端可读性必须优先于装饰效果。

## 13. 校验与错误处理

### 13.1 输入校验

必须校验：

- 出发城市不能为空；
- 目的地城市不能为空；
- 日期和天数至少提供一个；
- 预算必须为正数；
- 兴趣偏好至少提供一个；
- 出行风格至少提供一个。

### 13.2 AI 输出校验

AI 输出必须通过 schema 校验。

如果校验失败：

1. 尝试让模型修复 JSON；
2. 如果仍失败，返回用户友好错误；
3. 不要把原始错误堆栈展示给用户。

### 13.3 API 错误处理

统一返回格式：

```ts
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

常见错误码：

- `INVALID_INPUT`
- `WEATHER_API_FAILED`
- `AI_GENERATION_FAILED`
- `AI_OUTPUT_INVALID`
- `UNKNOWN_ERROR`

## 14. 环境变量

`.env.local` 示例：

```env
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
USE_MOCK_AI=true

WEATHER_PROVIDER=qweather
QWEATHER_BASE_URL=
QWEATHER_API_KEY=
USE_MOCK_WEATHER=true
```

要求：

- 不允许在代码中硬编码 API Key；
- 不允许在业务代码中硬编码模型平台、Base URL 或模型名；
- `.env.local` 不提交到 GitHub；
- 提供不包含真实 Base URL、Key 或固定模型名的 `.env.example`。

## 15. 安全与合规注意事项

1. 不要保存用户敏感信息；
2. 不要承诺实时票价、酒店价格和景点开放时间一定准确；
3. 对天气和预算估算添加免责声明；
4. 不做下单、不做支付、不做真实预订；
5. API Key 只在服务端使用，不暴露到前端；
6. 对用户输入做基础长度限制，防止过长请求。
7. Provider、环境变量和模型请求客户端使用 `server-only` 保护；
8. 浏览器网络请求只能访问本站 `/api/*`，不能直接请求模型或天气平台。

## 16. MVP 验收技术标准

1. 项目可以本地启动；
2. 首页可以输入一句旅行需求；
3. `/api/parse-trip` 可以返回结构化字段；
4. 分步补充页可以编辑和补充字段；
5. `/api/generate-trip` 可以调用天气 API 和 LLM；
6. 结果页可以展示结构化旅行方案；
7. 复制功能可用；
8. 导出 Markdown 功能可用；
9. `/api/generate-trip` 支持基于上一版方案和修改要求返回完整新方案；
10. API Key 不暴露在前端；
11. AI 输出有 schema 校验；
12. 天气 API 失败时仍可生成基础方案。
13. `USE_MOCK_AI=true` 且无模型 Key 时可以跑通完整流程；
14. 无 QWeather Key 时可以使用独立的 Mock 天气完成本地演示；
15. 切换 OpenAI-Compatible 模型平台只需要修改环境变量。
