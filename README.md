# 漫游草稿 / AI 自由行规划

一个面向自由行新手的 Next.js 旅行规划网站。

你先用一句话说想去哪、玩几天、预算和偏好，系统先给你一版结构化自由行草稿；拿到结果后，还可以继续补信息、点积木修改、收集待修改项，再统一重新生成。

当前稳定实现已完成到 `v1.3`。这一版的重点不是重做整站 UI，而是把地点、路线、天气和节奏判断补成更可信的派生层。

## 当前能力

### `v1.0`

- 首页自然语言输入
- `/plan` 分步补信息
- `/result` 结构化结果展示
- 复制完整方案
- Markdown 导出
- 简单重新生成
- `localStorage` 保存草稿与结果

### `v1.1`

- 缺失字段摘要
- 字段级错误提示
- Day Cabinet / Time Slot / Itinerary Block
- Block Actions 与 Quick Actions

### `v1.2`

- Mobile Flow First
- `/plan` mobile 三步问卷
- `/result` mobile 分页浏览
- Cabinet Identity 视觉升级
- Pending Changes 修改篮
- edit 页轻工作台雏形

### `v1.2.5`

- mobile 固定选项改为网格
- 真实 Qwen 通过 `OpenAICompatibleProvider` 接入
- `parse-trip` 支持 JSON 提取、normalize、repair
- `generate-trip` 支持 unwrap、normalize、repair
- `LLM_TIMEOUT_MS` 可配置
- `USE_MOCK_AI=true` 时可切回 Mock

### `v1.3`

- 阶段 1：POI / Route Provider 抽象与 Mock 已完成
- 阶段 2：`AmapPoiProvider` 已接入
- 阶段 3：`AmapRouteProvider` 已接入，支持 `driving` / `walking`
- 阶段 4：行程节奏判断与 `TripEnrichment` 派生层已完成
- 阶段 5：天气派生摘要与天气影响提示已完成
- 阶段 6：`/result` 已接入轻量 route insight 展示与 `/api/enrich-trip`
- 阶段 7：总体验收、文档同步、部署前检查已完成

## 本地运行

安装依赖：

```powershell
npm.cmd install
```

启动开发环境：

```powershell
npm.cmd run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 常用命令

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 环境变量

仓库提供了完整示例：[`/.env.example`](/C:/Users/10200/Desktop/travel_planing/.env.example)

真实 Key 只放 `.env.local` 或部署平台环境变量，不要提交到仓库。

### AI

Mock：

```env
USE_MOCK_AI=true
```

真实 AI：

```env
USE_MOCK_AI=false
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=qwen-plus
LLM_TIMEOUT_MS=120000
```

说明：

- `LLM_BASE_URL` 填 OpenAI-compatible Base URL
- `LLM_API_KEY` 只在服务端读取
- `LLM_TIMEOUT_MS` 默认 120000，可按模型速度调整

### POI

Mock：

```env
USE_MOCK_POI=true
POI_PROVIDER=mock
```

真实高德 POI：

```env
USE_MOCK_POI=false
POI_PROVIDER=amap
AMAP_API_KEY=你的高德 Web 服务 Key
```

### Route

Mock：

```env
USE_MOCK_ROUTE=true
ROUTE_PROVIDER=mock
```

真实高德 Route：

```env
USE_MOCK_ROUTE=false
ROUTE_PROVIDER=amap
AMAP_API_KEY=你的高德 Web 服务 Key
```

说明：

- POI 和 Route 当前共用一个 `AMAP_API_KEY`
- Mock 模式零 Key 可跑
- `transit` 当前不会接真实公交规划，仍会 warning 并降级

### Weather

Mock：

```env
USE_MOCK_WEATHER=true
WEATHER_PROVIDER=mock
```

真实和风天气：

```env
USE_MOCK_WEATHER=false
WEATHER_PROVIDER=qweather
QWEATHER_BASE_URL=
QWEATHER_API_KEY=
```

说明：

- Mock 模式不需要 `QWEATHER_API_KEY`
- 真实天气只走服务端请求

## v1.3 结果页与 enrichment

`v1.3` 新增了独立的派生层入口：

- `POST /api/enrich-trip`
- 输入：`tripPlan` 与可选 `tripRequest`
- 输出：`enrichment` + `weatherSummary`

设计边界：

- 不改 `TripPlan` schema
- 不改 `/api/generate-trip`
- 不改 `/api/parse-trip`
- `/result` 先展示主链路 `TripPlan`，再异步拉 enrichment
- enrichment 失败时只降级 route insight，不影响主方案阅读、复制、导出和重新生成

当前展示方式：

- desktop：在每日行程旁补一个轻量 route insight 侧栏
- mobile：保留原分页结构，新增独立 `route` 页
- 当前“地图”仍以点位列表和路线摘要为主，不接前端地图 SDK

## 安全边界

- `AMAP_API_KEY`、`QWEATHER_API_KEY`、`LLM_API_KEY` 都只在服务端读取
- Provider 与 client 选择逻辑都放在 `server-only` 模块
- 前端页面不会直接 import 高德、天气或 LLM provider
- 浏览器只请求站内 `/api/*`
- `.env.local` 已在 [`.gitignore`](/C:/Users/10200/Desktop/travel_planing/.gitignore) 中忽略

## 当前明确不做

- 不进入 `v1.4`
- 不做完整 Desktop Workspace UI
- 不做完整 Mobile Workspace UI
- 不接前端地图 SDK
- 不把 enrichment 结果写回 planner 主 schema
- 不做登录、收藏、数据库、支付或多人协作

## 相关文档

- [AGENTS.md](/C:/Users/10200/Desktop/travel_planing/AGENTS.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
- [docs/PRD_v1.3.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.3.md)
- [docs/TECH_DESIGN_v1.3.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.3.md)
- [docs/V1.3_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.3_PHASE_PLAN.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
