# 漫游草签 / AI 自由行规划

一个面向自由行新手的 Next.js 旅行规划网站。

当前 `v1.4` 正在把 desktop 结果页升级成工作台体验，同时保留原有创建、补充和生成链路。

## 当前入口

- `/`：工作台 landing
- `/create`：创建新计划
- `/plan`：补充信息
- `/result`：查看结果
- `/workspace`：兼容入口，会重定向到 `/`

## 当前能力

- 自然语言输入旅行需求
- `/plan` 分步补充信息
- `/result` 结构化展示方案
- 复制、导出 Markdown、重新生成
- mobile v1.3 分页流
- desktop v1.4 三栏 workspace 壳层

## v1.4 边界

- 不改 `TripPlan` schema
- 不改 `/api/generate-trip`
- 不改 `/api/parse-trip`
- 不改 `/api/enrich-trip`
- 不做真实地图 SDK
- 不做登录、保存、数据库
- 不做移动端大改

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 常用命令

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

## 相关文档

- [AGENTS.md](/C:/Users/10200/Desktop/travel_planing/AGENTS.md)
- [docs/PRD_v1.4.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.4.md)
- [docs/TECH_DESIGN_v1.4.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.4.md)
- [docs/V1.4_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.4_PHASE_PLAN.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
