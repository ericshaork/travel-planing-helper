# TECH_DESIGN v1.3：真实性增强基础层设计

## 1. 文档定位

`v1.3` 的目标不是重写 `TripPlan` 和结果页，而是在现有主链路之外，补一层更可信的基础数据能力：

- 真实 POI 解析
- 真实路线距离 / 通勤时间
- 行程节奏判断
- 天气摘要与天气影响分析
- 为后续地图展示准备可复用输入

当前范围始终保持：

- 不改 `TripPlan` schema
- 不改 `/api/generate-trip`
- 不改 `/api/parse-trip`
- 不直接进入完整地图 UI 或 workspace UI

## 2. 阶段实现状态

### 阶段 1：Provider 架构与 Mock

- `PoiProvider`
- `RouteProvider`
- `MockPoiProvider`
- `MockRouteProvider`
- `getPoiProvider()` / `getRouteProvider()`

### 阶段 2：真实 Amap POI

- `AmapPoiProvider`
- 服务端 `fetch` 调高德 Web 服务
- 空结果返回 warning
- Key 仅在服务端环境变量中读取

### 阶段 3：真实 Amap Route

- `AmapRouteProvider`
- 当前支持 `driving` / `walking`
- `transit` 暂时 warning + fallback
- Route 与 POI 共用 `AMAP_API_KEY`

### 阶段 4：Trip Enrichment

- `TripEnrichment`
- `DayRouteSummary`
- `PaceWarning`
- `MapPoint`
- `extractPlaceNamesFromTripPlan()`
- `analyzeDayPace()`
- `enrichTripPlanWithRoutes()`

### 阶段 5：Weather Derived Layer

- `WeatherImpact`
- `WeatherDaySummary`
- `TripWeatherSummary`
- `buildTripWeatherSummary()`
- `analyzeWeatherImpact()`

### 阶段 6：结果页 route insight

- `POST /api/enrich-trip`
- `buildTripResultEnrichment()`
- `/result` desktop 轻量双栏雏形
- mobile 独立 `route` 页

### 阶段 7：总验收与部署准备

- 文档同步
- 安全边界复核
- `.env.example` 完整性复核
- 手动验收清单补全
- 四项检查复跑

## 3. Provider 与 Derived Layer 边界

### 3.1 WeatherProvider

```ts
export interface WeatherProvider {
  getForecast(input: WeatherQuery): Promise<WeatherForecast>;
}
```

职责：

- 请求 mock 或真实天气数据
- 输出统一 `WeatherForecast`
- 不直接改 `TripPlan`
- 不承担结果页展示逻辑

### 3.2 POI / Route Provider

```ts
export interface PoiProvider {
  searchPoi(request: PoiSearchRequest): Promise<PoiSearchResult>;
}

export interface RouteProvider {
  estimateRoute(request: RouteEstimateRequest): Promise<RouteEstimateResult>;
}
```

职责：

- 对外部能力做统一抽象
- mock 与真实 provider 共用相同输入输出类型
- 对外部 API 返回先做转换，再进入业务层

### 3.3 Derived Layer

派生层只消费 provider 输出，不反向污染主 schema。

关键类型：

```ts
type TripEnrichment = {
  daySummaries: DayRouteSummary[];
  mapPoints: MapPoint[];
  warnings: PaceWarning[];
};

type TripWeatherSummary = {
  city: string;
  available: boolean;
  overview: string;
  daySummaries: WeatherDaySummary[];
  impacts: WeatherImpact[];
  warnings: string[];
  alerts: WeatherAlert[];
};
```

设计原则：

- 纯派生
- 可降级
- 不影响主链路
- 为 UI 提供稳定、短句化、可测试的数据

## 4. 阶段 5 天气规则

### 4.1 影响类型

当前仅做保守判断：

- `rain`
- `heat`
- `cold`
- `wind`
- `unavailable`

### 4.2 阈值规则

- 降雨：天气文本命中雨类关键词，或降水概率 `>= 60`
- 高温：`tempMax >= 32` 给 warning，`tempMax >= 35` 给 critical
- 低温：`tempMin <= 5` 给 warning
- 大风：风力等级 `>= 6` 或命中大风关键词
- 天气不可用：给一条保守 `info`

### 4.3 文案边界

- 文案必须短
- 文案必须保守
- 不编造官方实时预警
- 没有数据时明确提示出发前再确认

## 5. 阶段 6 展示层接线

新增最小服务端派生入口：

```ts
POST /api/enrich-trip
```

请求：

```ts
{
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
}
```

响应：

```ts
{
  enrichment: TripEnrichment;
  weatherSummary: TripWeatherSummary;
}
```

接线原则：

- 不改 `TripPlan` schema
- 不改 `/api/generate-trip`
- 不改 `/api/parse-trip`
- `/result` 先读本地 `tripPlan`，再异步请求 enrichment
- enrichment 失败时只降级 route insight，不影响原结果页主链路

展示策略：

- desktop：仅在 `lg` 及以上补一个轻量 route insight 面板
- mobile：保留原分页结构，新增独立 `route` 页
- 当前“地图”仍是点位列表和路线摘要，不接前端地图 SDK

## 6. 环境变量与 client 选择逻辑

### 6.1 AI

- `USE_MOCK_AI=true` -> Mock AI
- 否则读取 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`

### 6.2 POI

- `USE_MOCK_POI=true` -> `MockPoiProvider`
- `POI_PROVIDER=mock` -> `MockPoiProvider`
- `POI_PROVIDER=amap` 且关闭 mock -> `AmapPoiProvider`
- 缺 `AMAP_API_KEY` -> 明确配置错误

### 6.3 Route

- `USE_MOCK_ROUTE=true` -> `MockRouteProvider`
- `ROUTE_PROVIDER=mock` -> `MockRouteProvider`
- `ROUTE_PROVIDER=amap` 且关闭 mock -> `AmapRouteProvider`
- 缺 `AMAP_API_KEY` -> 明确配置错误

### 6.4 Weather

- `USE_MOCK_WEATHER=true` -> `MockWeatherProvider`
- `WEATHER_PROVIDER=mock` -> `MockWeatherProvider`
- `WEATHER_PROVIDER=qweather` 且关闭 mock -> `QWeatherProvider`
- 缺 `QWEATHER_API_KEY` -> 明确配置错误

## 7. 安全边界

- 所有外部 provider 模块都使用 `server-only`
- 高德、和风、LLM Key 只在服务端环境变量中读取
- 不把 Key 传给前端
- 不在错误文案或日志中输出真实 Key
- `app/result/page.tsx` 只请求 `/api/enrich-trip`
- 前端页面不直接 import POI / Route / Weather provider

## 8. 测试策略

- provider 测试全部使用 mock / stub fetch
- 不真实调用高德或和风外网
- 派生层测试覆盖：
  - 点位解析
  - 路线估算与 fallback
  - 节奏判断
  - 天气影响分析
  - `/api/enrich-trip` 成功与降级

## 9. 当前明确不做

- 不改 `TripPlan` schema
- 不改 `/api/generate-trip`
- 不改 `/api/parse-trip`
- 不做拖拽
- 不接前端高德地图 SDK
- 不做地图选点写回行程
- 不做完整 workspace UI
- 不进入 `v1.4`
