# TECH DESIGN v1.4：Desktop Workspace UI

## 1. 设计目标
`v1.4` 不改生成链路，只调整桌面端承载方式。

截至阶段 6.2：
1. `/` 是欢迎页 / Landing / 产品入口页。
2. `/create` 是创建新计划页，承接起稿入口。
3. `/plan` 是最终确认和覆盖页。
4. `/result` 才是真正的 desktop workspace。
5. landing、create、result 共用同一套 workspace 卡片语言，但语义各自分清。

## 2. 稳定边界
以下内容保持不变：
- `TripPlan` / `TripRequest`
- `/api/generate-trip`
- `/api/parse-trip`
- `/api/enrich-trip`
- `localStorage` key
- `PendingChanges` / `RegenerateBox` / `ExportActions` 数据链路
- mobile v1.3 主流程

## 3. 页面职责

### `/`
- 渲染 `WorkspaceLanding`
- 目标是欢迎、解释产品、给出主 CTA 和少量静态灵感
- 不直接渲染 `CreateModeSelector`
- 不直接渲染 `NaturalLanguageInput`
- 不直接渲染当前 Day 工作区
- 不直接渲染完整结果页 inspector

### `/create`
- 承接 `CreateModeSelector`
- AI 规划模式渲染 `NaturalLanguageInput`
- 自助探索模式只显示 v1.5 占位说明

### `/result`
- 保持完整 desktop workspace
- sidebar、top bar、中间当前 Day、右侧 inspector、Pending Changes、RegenerateBox、ExportActions 均保留

### `/workspace`
- 继续作为兼容入口重定向到 `/`

## 4. Landing 设计策略
- 不接真实 Explore、blog、视频或内容库
- 不抓图，不接外部图片 API
- 用静态灵感卡、渐变块、标签和旅行场景文案代替空白占位
- 右侧 Inspiration Board 必须始终有可读内容，不能再出现无标题无说明的空框

## 5. Sidebar 策略
- 保留 hover-expand rail
- 保留图形图标，不回退首字母导航
- active 状态使用更克制的轻底色 + 细 indicator
- hover 明显弱于 active
- landing 上的 `route / edit / export` 统一改成提示型入口

## 6. 视觉清理策略

### 阶段 6.2 已完成
- landing 的空白块改为有内容的静态灵感卡
- create 与 landing 的文案继续压低“AI 工具页”语气
- result 中 `WorkspacePlanSummary`、`WorkspaceDayPanel`、`WorkspaceUtilityPanel`、`WorkspaceInspector` 再做一轮主次清理
- 保留纸张感和暖米色，不大换主题

## 7. 阶段边界
- 真实地图仍放 v1.5
- 登录保存仍放 v1.6
- 内容库 / 旅行图片生态仍放 v1.7
- 阶段 7 再做总验收与部署准备
