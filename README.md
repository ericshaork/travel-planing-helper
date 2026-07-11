# 漫游草签 / AI 自由行规划助手

一个面向自由行新手的 Next.js 旅行规划网站。它先帮用户把旅行需求整理清楚，再结合 AI、天气、POI、路线和地图能力，生成一版可继续修改、保存和导出的旅行方案。

## 当前状态

当前仓库主线已完成到 `v1.6`：

- `/` 欢迎页
- `/create` 创建页
- `/plan` 最终确认页
- `/result` 结果工作台
- AI 生成旅行计划
- 和风天气
- 高德 POI / Route / JS 地图
- `/api/enrich-trip` 路线洞察
- Email magic link 登录
- Supabase 持久化保存
- `/trips` 我的行程
- 已保存计划的打开、更新、删除

## 下一阶段

下一阶段是 `v1.7 UI / UX polish`。

当前仅进入 `v1.7 phase 0`：

- 做 UI/UX 审计
- 冻结视觉方向
- 产出问题清单、PRD 和阶段计划

本阶段不代表 UI 大修已经完成，也不改业务链路。

## 当前主链路

项目当前核心流程仍然是：

`/create -> /plan -> /result`

同时保留：

- `/login` 登录入口
- `/trips` 已保存行程列表
- `/workspace` 兼容入口

## 已完成版本概览

- `v1.0`：AI 生成旅行计划、主链路、复制与 Markdown 导出
- `v1.1`：积木式行程查看、快捷修改、Pending Changes 初版
- `v1.2`：Mobile Flow First、Day Cabinet、移动端工作台收敛
- `v1.2.5`：接入真实 AI，修复移动端表单体验
- `v1.3`：POI / Route / Weather 增强、路线洞察
- `v1.4`：Desktop workspace UI、landing、create、desktop result
- `v1.5`：高德前端地图接入、marker 联动、地图降级
- `v1.6`：登录、保存、我的行程、Supabase 持久化
- `v1.7`：规划中，定位为 UI/UX 大修

## v1.7 当前明确做什么

- `/result` 布局与导航修复
- 地图区域放大与展开方案评估
- 天气展示重构为更偏旅行建议的表达
- marker / icon / 状态表达统一
- 欢迎页氛围与视觉层级增强
- mobile 回归检查

## v1.7 当前明确不做什么

- 地图选点
- 拖拽编辑
- 自动重排
- 分享协作
- 内容生态
- 登录系统大改
- 数据库结构变更
- AI / Weather / Map / Route 主链路改造

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

如果 `typecheck` 依赖 `.next/types`，请先执行：

```powershell
npm.cmd run build
npm.cmd run typecheck
```

## 相关文档

- [docs/UI_AUDIT_v1.7.md](/C:/Users/10200/Desktop/travel_planing/docs/UI_AUDIT_v1.7.md)
- [docs/PRD_v1.7.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.7.md)
- [docs/V1.7_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.7_PHASE_PLAN.md)
- [docs/PRD_v1.6.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.6.md)
- [docs/TECH_DESIGN_v1.6.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.6.md)
- [docs/V1.6_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.6_PHASE_PLAN.md)
- [docs/SUPABASE_SETUP_v1.6.md](/C:/Users/10200/Desktop/travel_planing/docs/SUPABASE_SETUP_v1.6.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
