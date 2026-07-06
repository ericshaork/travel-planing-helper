# PRD v1.4：Desktop Workspace UI

## 1. 一句话定义
把 `/result` 升级成桌面端旅行规划工作台，同时把 `/`、`/create`、`/plan`、`/result` 的页面语义拉清楚：欢迎页负责引导，创建页负责起稿，确认页负责覆盖，结果页负责进入真正的 workspace。

## 2. 当前入口语义
- `/`：欢迎页 / Landing / 产品入口页
- `/create`：创建新计划页
- `/plan`：最终确认和覆盖页
- `/result`：结果工作台
- `/workspace`：兼容入口，重定向到 `/`

## 3. 阶段 6.2 目标
- 修掉 landing 右侧空白卡 / 半成品感
- 在不接内容生态的前提下，增加少量静态灵感卡和视觉元素
- 降低 landing 与 create 的纯 AI 工具感
- 统一 landing / result 的卡片主次和节奏
- 不新增业务功能
- 不改 API/schema

## 4. 用户体验要求

### `/`
- 第一眼像产品欢迎页，而不是表单页或后台页
- 有主 CTA、示例 prompt、少量静态灵感卡和清晰流程说明
- 不直接展示 `NaturalLanguageInput`
- 不直接展示 `CreateModeSelector`
- 不直接展示当前 Day 工作区
- 不直接展示完整路线检查器

### `/create`
- 继续展示 `CreateModeSelector`
- “先排一版” 可用
- “我想自己慢慢挑” 仍是 v1.5 占位
- 创建链路继续走 `parse-trip -> /plan -> /result`

### `/result`
- 保留 sidebar、top bar、中间当前 Day、右侧 inspector、Pending Changes、RegenerateBox、ExportActions
- 在不减功能的前提下继续压缩碎片感

## 5. 图片与内容边界
- 本轮不接真实 Explore
- 不接 blog / 视频 / 内容库
- 不接外部图片 API
- 不抓取图片
- 如果没有可确认授权的本地图片，就优先使用静态灵感卡、渐变块和标签

## 6. 本轮不做
- 不接真实地图 SDK
- 不做 marker 联动和地图选点
- 不做登录、保存、Explore、Saved 真实功能
- 不改 `TripPlan` schema
- 不改 `/api/generate-trip`
- 不改 `/api/parse-trip`
- 不改 `/api/enrich-trip`

## 7. 后续阶段
- 阶段 7：总验收与部署准备
- v1.5：真实地图能力
- v1.6：登录与保存
- v1.7：内容库、旅行图片和更完整的灵感层
