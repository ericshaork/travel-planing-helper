# 漫游草稿：AI 自由行规划

面向自由行新手的城市行程规划网站。用户先用一句话说清大致想法，再分步补齐缺失信息，系统结合天气数据与 LLM，生成结构化的 Day by Day 行程、预算估算、住宿区域和交通建议。

当前仓库实现的是 MVP 1.0，对应 `docs/PRD.md` 定义的 v0.1 产品范围。

## MVP 1.0 已有功能

- 首页自然语言输入、真实示例和兴趣/风格快捷标签；
- 解析并展示出发地、目的地、天数、预算和偏好；
- `/plan` 分步补齐、修改并标准化旅行需求；
- 独立的 `LLMProvider` 与 `WeatherProvider`；
- Mock AI、OpenAI-Compatible 模型、Mock 天气和 QWeather；
- 天气失败时继续生成，并显示可信的降级说明；
- 结构化 `TripPlan` 与 Zod 校验；
- 卡片式旅行总览、天气、预算、每日行程、景点、住宿和交通建议；
- 复制完整方案与 UTF-8 Markdown 下载；
- 基于原始需求、当前方案和修改要求重新生成完整方案；
- 使用 `localStorage` 恢复草稿、需求和最近一次结果；
- 360px、390px、430px 和桌面宽度的响应式布局。

完整流程：

```text
首页输入
  → /api/parse-trip
  → /plan 补充并确认
  → /api/generate-trip
  → /result 查看、复制或导出
  → 复用 /api/generate-trip 简单重新生成
```

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Next.js Route Handlers
- Zod
- Vitest

MVP 不使用数据库，临时状态保存在浏览器 `localStorage`。

## 环境要求

- Node.js 20.9 或更高版本
- npm 10 或更高版本

## 本地运行

安装依赖并复制环境变量示例：

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

Windows PowerShell 如果因执行策略无法运行 `npm.ps1`，使用：

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

`.env.example` 默认开启 AI 与天气 Mock，不需要任何真实 API Key，即可跑通完整网站流程。

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm test
npm run start
```

Windows 可将 `npm` 替换为 `npm.cmd`。

## 环境变量

| 变量 | 默认/空值行为 | 说明 |
|---|---|---|
| `LLM_BASE_URL` | 空 | OpenAI-Compatible API 根地址；Provider 会追加 `/chat/completions` |
| `LLM_API_KEY` | 空 | 仅真实模型模式需要 |
| `LLM_MODEL` | 空 | 仅真实模型模式需要 |
| `USE_MOCK_AI` | `true` | `true` 使用 `MockLLMProvider` |
| `WEATHER_PROVIDER` | `qweather` | MVP 当前支持 QWeather |
| `QWEATHER_BASE_URL` | 空 | 可选的 QWeather API 根地址 |
| `QWEATHER_API_KEY` | 空 | 仅真实天气模式需要 |
| `USE_MOCK_WEATHER` | `true` | `true` 使用 `MockWeatherProvider` |

这些变量只能由服务端模块读取。不要使用 `NEXT_PUBLIC_` 前缀存放任何 Key。

## Mock AI / Mock Weather

本地演示推荐配置：

```env
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
USE_MOCK_AI=true

WEATHER_PROVIDER=qweather
QWEATHER_BASE_URL=
QWEATHER_API_KEY=
USE_MOCK_WEATHER=true
```

AI Mock 与天气 Mock 相互独立，可以分别切换。Mock 输出仍会经过正式 Zod Schema，不需要前端专用分支。

## 切换真实 OpenAI-Compatible 模型

项目不默认绑定 OpenAI 官方 API，也不在业务代码中判断具体平台。选择支持 OpenAI-Compatible `/chat/completions` 协议的平台，在 `.env.local` 中填写该平台提供的配置：

```env
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
USE_MOCK_AI=false
```

重启开发服务器后生效。真实模式缺少任一 LLM 配置时，服务端会返回友好配置错误，不会把 Key 或第三方响应细节发给浏览器。

## 切换真实天气

当前真实天气实现为 QWeather：

```env
WEATHER_PROVIDER=qweather
QWEATHER_BASE_URL=
QWEATHER_API_KEY=
USE_MOCK_WEATHER=false
```

`QWEATHER_BASE_URL` 可留空使用 Provider 默认地址。没有 Key、城市无法识别、请求超时或超出可预报范围时，天气层返回 warning 或降级结果，行程生成不会因此中断。

## 状态与安全边界

浏览器只请求本站：

- `POST /api/parse-trip`
- `POST /api/generate-trip`

模型和天气平台请求只发生在 Route Handler 或带 `server-only` 保护的服务端模块中。

本地状态使用以下 key：

- `travel-planning:parsed-trip`
- `travel-planning:trip-draft`
- `travel-planning:trip-request`
- `travel-planning:trip-plan`

读取时会经过 Schema 校验，损坏或过期格式的数据会被清理。

## 当前不做

- 登录、注册、收藏、历史版本和数据库；
- 地图实时路线与拖拽排序；
- 真实票务、酒店价格、库存、预订、支付或下单；
- 多轮聊天、连续记忆、局部 Patch、RAG、Function Calling 或 Agent；
- 多模型路由、多人协作和 App；
- 流式生成。

## 已知限制

- Mock 自然语言解析采用简单规则，不明确的信息不会猜测，需要用户在 `/plan` 补齐；
- 行程、预算、交通和住宿内容都是规划建议或估算，不代表实时票价、余票、库存和开放状态；
- QWeather 官方预警接口暂未接入，`alerts` 当前保留扩展结构但可能为空；
- 真实 QWeather Key 的线上联调，以及不同 OpenAI-Compatible 平台的兼容性，需要在部署环境单独验证；
- 天气可预报范围有限，远期日期会显示 warning，不会伪装成实时天气；
- 数据只保存在当前浏览器，清除站点数据或更换设备后无法恢复；
- 重新生成会覆盖最近结果，不保存历史版本，也不能局部回滚；
- 部分手机浏览器对文件下载限制较多，移动端优先使用“复制完整方案”；
- 复制功能在生产环境应通过 HTTPS 使用。

## 部署前 Checklist

- [ ] 使用受支持的 Node.js 版本完成 `npm install`；
- [ ] `npm run lint`、`npm run typecheck`、`npm run build`、`npm test` 全部通过；
- [ ] 在部署平台配置服务端环境变量，不提交 `.env.local`；
- [ ] 确认 `.env.example` 没有真实 Key、真实 Base URL 或固定模型名；
- [ ] 决定生产环境使用 Mock 还是真实 Provider，并验证对应配置；
- [ ] 使用真实 Provider 时完成一次 `/api/generate-trip` 冒烟测试；
- [ ] 确认生产站点启用 HTTPS，复制功能可用；
- [ ] 用浏览器 Network 检查前端没有直接请求模型或天气平台；
- [ ] 检查错误响应不包含堆栈、Key 或第三方原始响应；
- [ ] 按 `docs/MANUAL_ACCEPTANCE.md` 跑完桌面端和移动端流程；
- [ ] 在 360px、390px、430px 和普通桌面宽度检查无横向滚动；
- [ ] 确认预算、天气、票价和开放状态免责声明可见；
- [ ] 准备部署回滚方式，但本仓库阶段 9 不执行实际部署。

## 项目文档

- [开发规范](./AGENTS.md)
- [产品需求](./docs/PRD.md)
- [技术设计](./docs/TECH_DESIGN.md)
- [MVP 1.0 手动验收](./docs/MANUAL_ACCEPTANCE.md)
