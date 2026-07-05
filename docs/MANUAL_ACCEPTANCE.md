# MANUAL_ACCEPTANCE

## 1. 验收记录

- 验收日期：
- 验收人：
- 构建版本：
- 浏览器与版本：
- 设备 / 分辨率：
- 测试地址：
- AI 模式：`Mock / Real`
- 天气模式：`Mock / Real`

## 2. 部署前四项检查

先确认以下命令全部通过：

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 3. v1.2 mobile 基本流

- [ ] 首页 mobile 首屏能直接看到输入框和主按钮
- [ ] 示例和偏好折叠区正常展开 / 收起
- [ ] `/plan` 仍是三步问卷
- [ ] mobile 固定选项仍为网格，不回退横向滚动
- [ ] `/result` mobile 仍是分页浏览

## 4. v1.2.5 真实 AI 冒烟

### 4.1 首页三个示例

- [ ] 示例一通过：`parse-trip -> /plan -> generate-trip -> /result`
- [ ] 示例二通过：`parse-trip -> /plan -> generate-trip -> /result`
- [ ] 示例三通过：`parse-trip -> /plan -> generate-trip -> /result`

示例文本：

```text
7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。
从广州去成都玩 4 天，喜欢美食和城市漫步，不想去太商业化的景点。
想去杭州玩两天，预算 1500，不想早起，想轻松一点。
```

### 4.2 首次生成

- [ ] `/api/parse-trip` 正常返回
- [ ] `/plan` 补全流程正常
- [ ] `/api/generate-trip` 正常返回
- [ ] `/result` 可正常展示完整 TripPlan

### 4.3 修改流

- [ ] `RegenerateBox` 单条修改通过
- [ ] `Pending Changes` 三条修改通过
- [ ] 旧方案失败时不会被静默覆盖

### 4.4 Mock 回归

- [ ] `USE_MOCK_AI=true` 后主链路通过
- [ ] Mock 模式下无需真实 Key

## 5. 真实 AI 配置检查

本地 `.env.local` 预期：

```env
USE_MOCK_AI=false
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=qwen-plus
LLM_TIMEOUT_MS=120000
USE_MOCK_WEATHER=true
```

检查项：

- [ ] `.env.local` 未提交到仓库
- [ ] `.env.example` 不含真实 Key
- [ ] `USE_MOCK_AI=true` 可切回 Mock

## 6. Netlify 环境变量

Netlify 部署时应在 Environment Variables 中配置：

- [ ] `USE_MOCK_AI`
- [ ] `LLM_BASE_URL`
- [ ] `LLM_API_KEY`
- [ ] `LLM_MODEL`
- [ ] `LLM_TIMEOUT_MS`
- [ ] `USE_MOCK_WEATHER`
- [ ] `WEATHER_PROVIDER`
- [ ] `QWEATHER_BASE_URL`
- [ ] `QWEATHER_API_KEY`

同时确认：

- [ ] 不把真实 Key 写进仓库
- [ ] 浏览器只请求本站 `/api/*`

## 7. 已知不做项复核

- [ ] 未接高德地图、POI、路线规划
- [ ] 未做保存分享
- [ ] 未做拖拽和格子编辑
- [ ] 未改 API 协议
- [ ] 未改 `TripRequest` / `TripPlan` schema
- [ ] 未进入 `v1.3`

## 8. 验收结论

- 结论：通过 / 有条件通过 / 不通过

阻塞项：

- 

非阻塞问题：

- 
