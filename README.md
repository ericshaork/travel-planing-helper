# 漫游草签：AI 自由行规划

一个面向自由行新手的 AI 旅行规划网站。

你先用一句话说想去哪、玩几天、预算和偏好，系统先给你一版完整行程；拿到结果后，不用从零重写提示词，也不用硬啃一份死板攻略，可以继续按步骤补信息、点积木修改、收集待修改项，再决定要不要重排。

当前版本：MVP v1.2

## 当前版本概览

v1.2 的主题是：

> Mobile Flow First + Cabinet Identity + Pending Changes + 轻工作台雏形

这一版的重点不是新增真实地图或真实 AI，而是把已有生成与编辑能力整理成一个更适合手机、也更容易继续修改的版本。

## v1.0 已有能力

- 首页自然语言输入；
- `/plan` 分步补信息；
- Mock AI / Mock Weather 主流程；
- `/result` 生成并展示完整行程；
- 复制完整方案；
- Markdown 导出；
- 简单重新生成。

## v1.1 已有能力

- `/plan` 缺失字段摘要；
- 字段级错误、点击定位、首错滚动；
- Day Cabinet 行程展示；
- BlockActions 积木操作：
  - 不要这个
  - 换一个
  - 一定保留
  - 加类似
- QuickActions 快捷修改：
  - 轻松一点
  - 少走路
  - 预算低一点
  - 加美食 / 夜市
  - 不早起

## v1.2 新增能力

- Mobile Flow First：
  - 首页 mobile 首屏聚焦输入；
  - `/plan` mobile 改成三步问卷式；
  - `/result` mobile 改成分页式浏览。
- `/plan` 手机端问卷体验：
  - 每步只聚焦当前任务；
  - 日期提示改成中文友好文案；
  - 手机端草稿摘要改为紧凑折叠。
- `/result` 手机端分页：
  - `overview`
  - `day-${number}`
  - `budget`
  - `more`
  - `edit`
- Cabinet Identity 视觉升级：
  - Day Summary 更像小柜门 / 抽屉入口；
  - DayCabinet 更像单日三层柜；
  - ItineraryBlock 更像可操作积木；
  - “查看详情 / 收起详情”入口更明显。
- Pending Changes 修改篮：
  - BlockActions 先加入修改篮；
  - 可连续收集多个积木修改；
  - 可删除、清空、写入修改框；
  - 写入后不自动提交；
  - RegenerateBox 仍是唯一提交入口。
- 轻工作台雏形：
  - ResultDayNav 显示待修改数量；
  - Day 页提示“已选 N 项待修改”；
  - edit 页整理为“修改工作台”；
  - overview 页强化下一步入口；
  - desktop 修改区关系更清楚。

## 当前仍然使用 Mock AI / Mock Weather

仓库默认仍以 Mock 模式为主，方便本地零 Key 跑通完整流程：

- `USE_MOCK_AI=true`
- `USE_MOCK_WEATHER=true`

也就是说，当前 v1.2 仍然不是“真实 AI + 真实地图 + 真实天气”的版本。v1.2.5 才会进入真实 AI 冒烟接入。

## 本地运行

先安装依赖：

```bash
npm install
```

Windows PowerShell：

```powershell
npm.cmd install
```

开发启动：

```powershell
npm.cmd run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 环境变量

当前 `.env.example` 默认启用 Mock AI 和 Mock Weather。

重点变量：

| 变量 | 当前用途 |
|---|---|
| `USE_MOCK_AI` | `true` 时使用 Mock AI 主流程 |
| `USE_MOCK_WEATHER` | `true` 时使用 Mock Weather 主流程 |
| `LLM_BASE_URL` | 预留给后续真实模型接入 |
| `LLM_API_KEY` | 预留给后续真实模型接入 |
| `LLM_MODEL` | 预留给后续真实模型接入 |
| `WEATHER_PROVIDER` | 当前支持 `qweather` |
| `QWEATHER_BASE_URL` | 真实天气模式可配置 |
| `QWEATHER_API_KEY` | 真实天气模式可配置 |

说明：

- `LLM_BASE_URL / LLM_API_KEY / LLM_MODEL` 目前主要为后续 v1.2.5 真实 AI 接入预留；
- 当前版本即使没有真实 Key，也应该能靠 Mock 模式跑通首页 → `/plan` → `/result` 主流程。

## 当前明确不做

v1.2 仍然没有做这些：

- 未接真实 AI；
- 未接高德地图；
- 未做地图；
- 未保存分享；
- 未登录数据库；
- 未做已有计划导入；
- 未拖拽积木；
- 未手动加减格子；
- 未做商业预订闭环；
- 未做局部 Patch；
- 未改 `/api/generate-trip` 协议；
- 未改 `TripPlan` schema。

## 已知限制

- Mock AI 下，3 条以上 Pending Changes 同时重排可能不稳定；
- 当前 Pending Changes 更适合单条或两条连续修改；
- 真实 AI 接入后，需要重点复测多条修改场景。

## 部署与检查

部署前至少运行：

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

当前 v1.2 的目标是：

- 可以部署到 Netlify；
- 可以进行朋友二轮测试；
- 不误称已经接入真实 AI、真实地图或保存分享。

## 相关文档

- [AGENTS.md](/C:/Users/10200/Desktop/travel_planing/AGENTS.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
- [docs/PRD_v1.2.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.2.md)
- [docs/TECH_DESIGN_v1.2.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.2.md)
- [docs/V1.2_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.2_PHASE_PLAN.md)
- [docs/COMPETITOR_INSIGHTS.md](/C:/Users/10200/Desktop/travel_planing/docs/COMPETITOR_INSIGHTS.md)
