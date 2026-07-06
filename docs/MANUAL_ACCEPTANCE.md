# MANUAL_ACCEPTANCE

## 1. 验收记录

- 验收日期：
- 验收人：
- 构建版本：
- 浏览器与版本：
- 设备 / 分辨率：
- 测试地址：
- AI 模式：`Mock / Real`
- POI 模式：`Mock / Amap`
- Route 模式：`Mock / Amap`
- Weather 模式：`Mock / Real`

## 2. 部署前四项检查

先确认以下命令全部通过：

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

## 3. 主链路回归

- [ ] 首页能正常输入一句话需求
- [ ] `/api/parse-trip` 正常返回
- [ ] `/plan` 分步补全流程正常
- [ ] `/api/generate-trip` 正常返回
- [ ] `/result` 能展示完整 `TripPlan`
- [ ] copy / export / regenerate 正常
- [ ] Pending Changes 流程正常
- [ ] 旧方案失败时不会静默覆盖

建议至少跑这三条：

```text
我想 7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。
我想从广州去成都玩 4 天，喜欢美食和城市漫步，不想去太商业化的景点。
我想去杭州玩两天，不想早起，预算 1500，想轻松一点。
```

## 4. mobile / desktop 展示回归

### 4.1 Mobile

- [ ] 首页首屏能直接看到输入框和主按钮
- [ ] 示例与偏好折叠区正常展开 / 收起
- [ ] `/plan` 仍是三步问卷
- [ ] mobile 固定选项仍为网格，不回退为横向滚动
- [ ] `/result` 仍是分页浏览
- [ ] mobile 新增 `route` 页签
- [ ] mobile `route` 页能切换不同 Day
- [ ] mobile `route` 页不会把 overview 拉成长页

### 4.2 Desktop

- [ ] 桌面端结果页仍以主行程阅读为主
- [ ] 每日行程右侧出现轻量 route insight 面板
- [ ] 切换不同 Day 时，route insight 会跟随更新
- [ ] route insight 失败时，主行程区仍可正常阅读和操作

建议至少看这些宽度：

- [ ] `390px`
- [ ] `768px`
- [ ] `1280px`

## 5. v1.3 enrichment 验收

- [ ] `/api/enrich-trip` 成功时返回 `enrichment` 与 `weatherSummary`
- [ ] enrichment 失败时只显示“路线洞察暂不可用”之类的降级提示
- [ ] enrichment 失败不影响 `TripPlan` 主内容
- [ ] copy / export / regenerate / pending changes 不受 enrichment 失败影响
- [ ] 路线摘要、节奏提醒、天气影响、点位列表都能正常展示
- [ ] 当前“地图”仍是轻量点位列表与摘要，不依赖前端地图 SDK

## 6. Provider / Mock / Real 配置验收

### 6.1 AI

- [ ] `USE_MOCK_AI=true` 时主链路可跑
- [ ] 真实 AI 模式缺 Key 时有明确错误

### 6.2 POI

- [ ] `USE_MOCK_POI=true` 时零 Key 可跑
- [ ] `POI_PROVIDER=mock` 时返回 MockPoiProvider
- [ ] `POI_PROVIDER=amap` 且关闭 mock 时可走真实高德 POI
- [ ] 缺少 `AMAP_API_KEY` 时有明确错误

### 6.3 Route

- [ ] `USE_MOCK_ROUTE=true` 时零 Key 可跑
- [ ] `ROUTE_PROVIDER=mock` 时返回 MockRouteProvider
- [ ] `ROUTE_PROVIDER=amap` 且关闭 mock 时可走真实高德 Route
- [ ] 缺少 `AMAP_API_KEY` 时有明确错误
- [ ] `transit` 当前会 warning 并降级，不会假装已实现真实公交规划

### 6.4 Weather

- [ ] `USE_MOCK_WEATHER=true` 时零 Key 可跑
- [ ] `WEATHER_PROVIDER=qweather` 且关闭 mock 时可走真实天气
- [ ] 缺少 `QWEATHER_API_KEY` 时有明确错误

## 7. 安全边界检查

- [ ] `.env.local` 未提交到仓库
- [ ] `.env.example` 不含真实 Key
- [ ] `AMAP_API_KEY` 只在服务端读取
- [ ] `QWEATHER_API_KEY` 只在服务端读取
- [ ] `LLM_API_KEY` 只在服务端读取
- [ ] 前端页面未直接 import server-only provider
- [ ] `app/result/page.tsx` 仅通过站内 API 拉 enrichment
- [ ] `/api/enrich-trip` 响应中不返回任何敏感环境变量
- [ ] 日志与错误文案中不打印真实 Key

## 8. Netlify 环境变量

Netlify 部署时应在 Environment Variables 中配置：

- [ ] `USE_MOCK_AI`
- [ ] `LLM_BASE_URL`
- [ ] `LLM_API_KEY`
- [ ] `LLM_MODEL`
- [ ] `LLM_TIMEOUT_MS`
- [ ] `USE_MOCK_POI`
- [ ] `POI_PROVIDER`
- [ ] `USE_MOCK_ROUTE`
- [ ] `ROUTE_PROVIDER`
- [ ] `USE_MOCK_WEATHER`
- [ ] `WEATHER_PROVIDER`
- [ ] `AMAP_API_KEY`
- [ ] `QWEATHER_BASE_URL`
- [ ] `QWEATHER_API_KEY`

同时确认：

- [ ] 不把真实 Key 写进仓库
- [ ] 浏览器只请求本站 `/api/*`

## 9. 已知不做项复核

- [ ] 未改 `TripRequest` / `TripPlan` schema
- [ ] 未改 `/api/generate-trip`
- [ ] 未改 `/api/parse-trip`
- [ ] 未接前端高德地图 SDK
- [ ] 未做地图选点写回行程
- [ ] 未做完整 Desktop Workspace UI
- [ ] 未做完整 Mobile Workspace UI
- [ ] 未进入 `v1.4`

## 10. 验收结论

- 结论：通过 / 有条件通过 / 不通过

阻塞项：

-

非阻塞问题：

-
