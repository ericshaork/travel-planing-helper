# 漫游草签 / AI 自由行规划

一个面向自由行新手的 Next.js 旅行规划网站。

当前状态：`v1.5` 已完成。

`v1.5` 把 `/result` 右侧从地图占位升级成了真实高德地图基础版，并补齐了 Day marker、点位列表联动、itinerary block 联动、降级策略、环境变量说明和部署准备文档。

## 当前入口

- `/`：Landing 欢迎页
- `/create`：创建新计划
- `/plan`：最终确认页
- `/result`：结果工作台
- `/workspace`：兼容入口，会回到主工作台流

## 当前能力

- 自然语言输入旅行需求
- `/plan` 分步补充信息
- `/result` 结构化展示方案
- 复制、导出 Markdown、重新生成
- mobile v1.3 分页流
- desktop v1.4 三栏 workspace
- v1.5 真实高德地图工作台

## v1.5 已完成

- 高德 JS SDK client-only loader
- 前端地图 env 读取修复
- `AmapBaseMap`、`MapLoading`、`MapErrorState`、`MapFallback`
- `/result` desktop inspector 真实地图接入
- 当前 Day marker 展示与视口同步
- marker 与右侧点位列表双向高亮
- itinerary block 与 marker / 点位详情联动
- 缺 key、脚本失败、无点位、未确认点位的稳定降级
- Netlify 环境变量与部署说明

## v1.5 明确不做

- 地图选点写回行程
- 地图搜索地点
- 拖拽 marker
- 拖拽 itinerary block
- 自动重排
- 路线动画
- 登录、保存、数据库
- 内容生态
- mobile 地图工作台重构
- API 变更
- TripPlan schema 变更

## 已知 Polish

- 当前 active marker 的视觉样式还偏工程态，后续可以再做更自然的圆形编号、品牌色和选中态 polish。
- 这属于视觉细化，不影响 `v1.5` 功能验收与发布准备。

## 高德 Key 边界

- `NEXT_PUBLIC_AMAP_JS_KEY`：浏览器端高德 JS SDK Key，会暴露给前端。
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`：只有高德 JS Key 配了安全密钥时才需要。
- `AMAP_API_KEY`：服务端高德 Web 服务 Key，只给 POI / Route Provider 用，不能暴露给前端。
- `NEXT_PUBLIC_AMAP_JS_KEY` 和 `AMAP_API_KEY` 不能混用。

如果没有 `NEXT_PUBLIC_AMAP_JS_KEY`，地图会走 fallback，但行程、点位列表、详情卡、导出和重新生成仍可正常使用。

如果 POI / Route 继续用 mock，真实地图底图仍可显示，但点位质量仍取决于 enrichment 数据。

## 环境变量

前端地图：

- `NEXT_PUBLIC_AMAP_JS_KEY`
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`

服务端高德：

- `AMAP_API_KEY`
- `USE_MOCK_POI`
- `POI_PROVIDER`
- `USE_MOCK_ROUTE`
- `ROUTE_PROVIDER`

AI：

- `USE_MOCK_AI`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS`

天气：

- `USE_MOCK_WEATHER`
- `WEATHER_PROVIDER`
- `QWEATHER_API_KEY`
- `QWEATHER_BASE_URL`

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 检查命令

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

## Netlify 部署准备

最小真实地图配置：

```env
NEXT_PUBLIC_AMAP_JS_KEY=你的高德 JS API Key
NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=你的高德安全密钥（如有）
```

如果要启用真实 POI / Route：

```env
USE_MOCK_POI=false
POI_PROVIDER=amap
USE_MOCK_ROUTE=false
ROUTE_PROVIDER=amap
AMAP_API_KEY=你的高德 Web 服务 Key
```

部署前建议：

1. 先跑 `lint / build / typecheck / test`
2. 在 Netlify 配好环境变量
3. 如刚改过环境变量，执行 `Clear cache and deploy`
4. 打开 `/result`，确认地图能加载或能稳定降级
5. 确认浏览器侧看不到 `AMAP_API_KEY`、`LLM_API_KEY`、`QWEATHER_API_KEY`

## 发布准备说明

建议命令：

```powershell
git status --short
git add .
git commit -m "feat: add real map workspace v1.5"
git push
git tag v1.5
git push origin v1.5
```

本轮不会代替用户执行 commit、tag 或 deploy。

## 相关文档

- [AGENTS.md](/C:/Users/10200/Desktop/travel_planing/AGENTS.md)
- [docs/PRD_v1.5.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.5.md)
- [docs/TECH_DESIGN_v1.5.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.5.md)
- [docs/V1.5_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.5_PHASE_PLAN.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
