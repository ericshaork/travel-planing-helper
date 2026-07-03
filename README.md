# 漫游草签：AI 自由行规划

一个面向自由行新手的 AI 旅行规划网站。

你先用一句话说想去哪、玩几天、预算和偏好，系统先给你一版完整行程；拿到结果后，不用从零重写提示词，也不用硬啃一份死板攻略，可以继续点几下，把它改成更适合自己的版本。

当前仓库对应 MVP 1.1。

## 现在已经有的能力

- 首页自然语言输入，支持真实示例和兴趣 / 风格快捷标签
- `POST /api/parse-trip` 解析旅行需求，提取目的地、出发地、天数 / 日期、预算和偏好
- `/plan` 分步补充旅行信息
- `/plan` 缺失信息增强提示
  - 顶部缺失摘要
  - 字段级错误
  - 点击缺失项定位
  - 提交失败自动滚到首个错误
  - 柔和高亮，不打断已有输入
- `POST /api/generate-trip` 生成完整 `TripPlan`
- `WeatherProvider` 抽象、Mock Weather、QWeather
- `LLMProvider` 抽象、MockLLMProvider、OpenAI-Compatible Provider
- `/result` 结果页总览、天气、预算、住宿、交通、注意事项
- 每天按 Day Cabinet / 上午 / 下午 / 晚上展示行程
- 移动端默认多日摘要，点某天展开
- 顶部 `ResultDayNav` 粘性导航，可回总览 / 指定 Day / 修改区
- 积木操作
  - 不要这个
  - 换一个
  - 一定保留
  - 加类似
- 五种快捷修改
  - 轻松一点
  - 少走路
  - 预算低一点
  - 加美食 / 夜市
  - 不早起
- 所有修改都只会先生成 `modificationRequest`
- 用户确认后继续复用现有 `/api/generate-trip`，重新生成完整 `TripPlan`
- 复制完整方案
- Markdown 导出
- 重新生成失败时保留旧方案
- `appliedChanges` 展示本轮修改结果
- `localStorage` 恢复草稿、需求和最近一次结果
- GitHub + Netlify 部署流程

## MVP 1.1 的核心定位

不是聊天机器人，也不是纯攻略展示页。

它更像一个可编辑的 AI 旅行积木板：

- AI 先给你一版能走的方案
- 你再通过点击和少量补充文字把它改成自己的版本
- 每次修改都还是回到完整重排，避免前端局部拼补造成行程不一致

## 当前主流程

```text
首页输入
  -> /api/parse-trip
  -> /plan 补充与确认
  -> /api/generate-trip
  -> /result 查看、复制、导出、继续修改
  -> 复用 /api/generate-trip 重新生成完整方案
```

## 明确还没做

MVP 1.1 仍然不做这些：

- 拖拽排序
- 自定义时间轴
- 新增 / 删除时间格子
- 地图 API
- 真实距离和通勤计算
- 实时开放时间
- 真实票务 / 酒店库存 / 预订 / 支付
- 登录、收藏、数据库、历史版本
- 真正局部 Patch
- 完整聊天系统
- 多人协作

这些能力的路线图见 [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Zod
- Vitest

MVP 仍然不使用数据库，临时状态保存在浏览器 `localStorage`。

## 本地运行

先安装依赖并复制环境变量示例：

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可用：

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm test
npm run start
```

Windows 下把 `npm` 换成 `npm.cmd` 即可。

## 环境变量

`.env.example` 默认启用 Mock AI 和 Mock Weather，不需要真实 Key 也能跑通完整流程。

常用变量：

| 变量 | 说明 |
|---|---|
| `LLM_BASE_URL` | OpenAI-Compatible API 根地址 |
| `LLM_API_KEY` | 真实模型模式使用 |
| `LLM_MODEL` | 真实模型模式使用 |
| `USE_MOCK_AI` | `true` 时使用 `MockLLMProvider` |
| `WEATHER_PROVIDER` | 当前支持 `qweather` |
| `QWEATHER_BASE_URL` | 可选，QWeather 根地址 |
| `QWEATHER_API_KEY` | 真实天气模式使用 |
| `USE_MOCK_WEATHER` | `true` 时使用 `MockWeatherProvider` |

## 质量检查

提交前至少运行：

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 文档入口

- [AGENTS.md](/C:/Users/10200/Desktop/travel_planing/AGENTS.md)
- [docs/PRD.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD.md)
- [docs/TECH_DESIGN.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN.md)
- [docs/PRODUCT_ROADMAP.md](/C:/Users/10200/Desktop/travel_planing/docs/PRODUCT_ROADMAP.md)
- [docs/PRD_v1.1.md](/C:/Users/10200/Desktop/travel_planing/docs/PRD_v1.1.md)
- [docs/TECH_DESIGN_v1.1.md](/C:/Users/10200/Desktop/travel_planing/docs/TECH_DESIGN_v1.1.md)
- [docs/V1.1_PHASE_PLAN.md](/C:/Users/10200/Desktop/travel_planing/docs/V1.1_PHASE_PLAN.md)
- [docs/MANUAL_ACCEPTANCE.md](/C:/Users/10200/Desktop/travel_planing/docs/MANUAL_ACCEPTANCE.md)
