# 漫游草稿 / AI 自由行规划

一个面向自由行新手的 Next.js 旅行规划网站。

你先用一句话说想去哪、玩几天、预算和偏好，系统先给你一版结构化自由行草稿；拿到结果后，可以继续补信息、点积木修改、收集待修改项，再统一重新生成。

当前版本：`MVP v1.2`

当前开发阶段：`MVP v1.2.5 阶段 3`

阶段 3 只做三件事：

- 记录真实 Qwen 冒烟结果
- 同步阶段文档和人工验收清单
- 做部署前检查和发布准备

不做新功能，不进入 `v1.3`。

## 当前能力

`v1.0`

- 首页自然语言输入
- `/plan` 分步补信息
- `/result` 结构化行程展示
- 复制完整方案
- Markdown 导出
- 简单重新生成
- `localStorage` 保存解析结果和方案草稿

`v1.1`

- `/plan` 缺失字段摘要
- 字段级错误提示
- 点击缺失项定位
- Day Cabinet / Time Slot / Itinerary Block 结果结构
- BlockActions 和 QuickActions 进入修改流

`v1.2`

- Mobile Flow First
- `/plan` mobile 三步问卷
- `/result` mobile 分页浏览
- Cabinet Identity 视觉升级
- Pending Changes 修改篮
- edit 页轻工作台

`v1.2.5`

- mobile 固定选项从横向滚动改为网格
- 真实 Qwen 通过 `OpenAICompatibleProvider` 接入
- `parse-trip` 支持 JSON extract / normalize / repair
- `generate-trip` 支持 unwrap / normalize / repair
- `LLM_TIMEOUT_MS` 可配置
- 首页三个示例已完成真实 Qwen 主链路冒烟
- `RegenerateBox` 单条修改已完成真实冒烟
- `Pending Changes` 三条修改已完成真实冒烟
- `USE_MOCK_AI=true` Mock 回归通过

## 当前明确不做

`v1.2.5` 不做：

- 高德地图、POI、路线规划、地图工作台
- 保存分享、登录、数据库、已有计划导入
- 拖拽积木、手动加减格子、局部 patch
- 新 API 协议
- `TripRequest` / `TripPlan` schema 改动

## 本地运行

安装依赖：

```powershell
npm.cmd install
```

启动开发环境：

```powershell
npm.cmd run dev
```

打开 `http://localhost:3000`

## 常用命令

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 环境变量

仓库默认是 Mock 模式：

```env
USE_MOCK_AI=true
USE_MOCK_WEATHER=true
```

开启真实 Qwen：

```env
USE_MOCK_AI=false
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=qwen-plus
LLM_TIMEOUT_MS=120000
USE_MOCK_WEATHER=true
```

测试更快的模型也可以用：

```env
LLM_MODEL=qwen-turbo
```

切回 Mock：

```env
USE_MOCK_AI=true
```

说明：

- 真实值放在 `.env.local`，不要提交到仓库
- `LLM_API_KEY` 只在服务端使用，不出现在浏览器
- `LLM_BASE_URL` 可以填兼容接口根路径，也可以填完整 `/chat/completions`
- `LLM_TIMEOUT_MS` 默认 `120000`
- Netlify 部署时，把这些值配置到 Environment Variables，不要写进代码

## 真实 AI 冒烟结果

当前已记录通过：

- 首页示例一：`parse-trip -> /plan -> generate-trip -> /result`
- 首页示例二：`parse-trip -> /plan -> generate-trip -> /result`
- 首页示例三：`parse-trip -> /plan -> generate-trip -> /result`
- `RegenerateBox` 单条修改
- `Pending Changes` 三条修改
- `USE_MOCK_AI=true` Mock 回归

## 相关文档

- [AGENTS.md](/C:/Users/10200/Desktop/travel_planing/AGENTS.md)
- [docs/PRD_v1.2.5.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.2.5.md)
- [docs/TECH_DESIGN_v1.2.5.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.2.5.md)
- [docs/V1.2.5_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.2.5_PHASE_PLAN.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
