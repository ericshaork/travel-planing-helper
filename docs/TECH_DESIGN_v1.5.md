# TECH DESIGN v1.5：真实地图基础版

## 1. 设计目标

`v1.5` 不重做结果页，而是在现有 `v1.4` desktop workspace 上，把右侧 inspector 里的地图占位替换成真实高德地图基础版，并保持现有数据链路和工作台节奏不被打断。

## 2. 已有基础

- `app/result/page.tsx` 维护当前 Day、active point、active itinerary block
- `WorkspaceInspector` 已接收 `DayRouteInsight`
- `TripEnrichment` 已提供 `mapPoints`、`daySummaries`、`warnings`
- 服务端已有高德 POI / Route Web 服务能力，但不等于前端 JS 地图

## 3. Key 边界与安全

### 服务端 Web 服务 Key

- `AMAP_API_KEY` 只用于服务端 POI / Route
- 不能暴露给浏览器

### 前端 JS SDK Key

- `NEXT_PUBLIC_AMAP_JS_KEY`
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`

约束：

- `NEXT_PUBLIC_AMAP_JS_KEY` 允许暴露给浏览器
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE` 仅用于前端安全配置
- 与 `AMAP_API_KEY` 不是同一用途，不能混用

## 4. 接入策略

### 4.1 Client-only

- 地图组件必须是 client component
- 不在 SSR 阶段访问 `window`、`document`、`window.AMap`
- 地图脚本加载、实例化和 marker 操作都放在客户端

### 4.2 Loader

地图脚本加载层负责：

- 避免重复插入 script
- 复用单例 Promise
- 处理缺 key、脚本失败、SSR 不可用
- 处理安全码注入
- 开发环境输出安全诊断日志

### 4.3 前端 env 读取修复

`getAmapClientEnv()` 默认路径直接读取：

- `process.env.NEXT_PUBLIC_AMAP_JS_KEY`
- `process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`

这样可以避免 Next.js client bundle 因动态 env 读取而拿不到变量。

## 5. 关键组件

- `lib/map/amap-env.ts`
- `lib/map/amap-types.ts`
- `lib/map/amap-loader.ts`
- `components/map/AmapBaseMap.tsx`
- `components/map/MapLoading.tsx`
- `components/map/MapErrorState.tsx`
- `components/map/MapFallback.tsx`
- `components/map/map-utils.ts`
- `components/workspace/InspectorMapPreview.tsx`
- `components/workspace/InspectorPointList.tsx`
- `components/workspace/InspectorPointDetailCard.tsx`
- `lib/trip/map-point-match.ts`

## 6. 状态流

### 地图加载态

- `loading`
- `ready`
- `error`

### 错误码

- `missing_js_key`
- `ssr_unavailable`
- `script_load_failed`
- `amap_not_available`

### 交互态

- `activeWorkspaceDayNumber`
- `activeMapPointId`
- `activeItineraryBlockId`

Day 是一级主状态，point / block 是二级局部状态。切换 Day 或重新生成后，会清理不属于当前上下文的 active 状态。

## 7. Marker 与联动

- 只为 `resolved` 且坐标有效的点创建 marker
- 多点优先 `setFitView`
- 单点使用 `setZoomAndCenter`
- 无 marker 时仍显示基础底图
- 全 unresolved 时不强行落图，而是显示提示
- 点击 marker、点位列表、itinerary block 会复用同一套 active state

## 8. 降级策略

- 缺 `NEXT_PUBLIC_AMAP_JS_KEY`：显示缺 key 文案
- SDK 脚本失败：显示脚本失败文案
- 无 marker：显示“这一天暂时没有可落图点位”
- 全 unresolved：显示“这一天的地点还没确认到具体位置”
- 地图失败不影响右侧点位列表、详情卡、路线统计和中间行程主体

## 9. 手动验收重点

- `/result` desktop 真图加载
- Day 切换时 marker 同步
- marker / 点位列表 / itinerary block 联动
- 缺 key 与脚本失败时稳定降级
- mobile 路由流保持现状
- 浏览器端不能看到 `AMAP_API_KEY`、`LLM_API_KEY`、`QWEATHER_API_KEY`

## 10. v1.5 明确不做

- 地图选点
- 搜索地点
- 拖拽 marker
- 拖拽 itinerary block
- 自动重排
- 路线动画
- 登录保存
- 内容生态
- mobile 地图工作台重构
- API / schema 变更

## 11. 已知 Polish

- marker 选中态样式还可以继续打磨
- 这属于视觉 polish，不属于 `v1.5` 验收阻塞项
