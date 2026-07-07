# MANUAL ACCEPTANCE

## 0. 当前说明

- 当前仓库处于 `v1.5` 完成态
- `/result` desktop 已接入真实高德地图
- 当前 Day marker、点位列表联动、itinerary block 联动已落地
- 本文档用于最终人工回归和发布前检查

## 1. 验收记录

- 验收日期：
- 验收人：
- 构建版本：
- 浏览器与版本：
- 设备 / 分辨率：
- 测试地址：

## 2. 部署前四项检查

先确认以下命令全部通过：

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

## 3. 基础路由回归

- [ ] `/` 是 Landing，而不是创建表单页
- [ ] 点击“创建新计划”会进入 `/create`
- [ ] `/create` 能正常完成起草
- [ ] `/plan` 仍是最终确认页
- [ ] `/result` 能展示完整 `TripPlan`
- [ ] `/workspace` 兼容入口正常
- [ ] copy / export / regenerate 正常
- [ ] Pending Changes 流程正常

## 4. 创建流程回归

- [ ] “AI 帮我先排一版”路径正常
- [ ] “自己探索”入口仍保留 v1.5 占位语义，不误导为真实 Explore
- [ ] `parse-trip -> /plan -> /result` 主链路正常
- [ ] `/plan` 修改能覆盖 `/create` 初始草稿

## 5. 地图无 Key 场景

- [ ] 去掉 `NEXT_PUBLIC_AMAP_JS_KEY` 后，`/result` 右侧显示友好 fallback
- [ ] 点位列表仍可用
- [ ] 详情卡仍可用
- [ ] 路线统计、route legs、warning stack 仍可用
- [ ] 行程仍可导出和重新生成

## 6. 地图有 Key 场景

- [ ] `/result` desktop inspector 显示真实地图
- [ ] 当前 Day resolved 点位显示 marker
- [ ] 切换 Day 后 marker 同步更新
- [ ] 多点时视口能覆盖当前 Day marker
- [ ] 单点时地图能聚焦到该点
- [ ] 没有 marker 时不会出现空白地图
- [ ] 全 unresolved 时显示“这一天的地点还没确认到具体位置”
- [ ] 地图脚本失败时不影响行程主体

## 7. 阶段 4 联动验收

- [ ] 点击 marker 后，右侧点位列表对应项高亮
- [ ] 点击右侧已确认点位后，地图对应 marker 高亮
- [ ] 右侧显示当前 active 点位详情
- [ ] 点击未确认点位后，显示“待确认 / 无法在地图中定位”提示
- [ ] 切换 Day 后，active 点位会清空或合理重置
- [ ] 地图 fallback 时，点位列表和详情卡仍可查看

## 8. 阶段 5 联动验收

- [ ] 点击中间 itinerary block 后，右侧 marker / 点位列表 / 详情卡同步到对应地点
- [ ] 点击已确认 block 时，地图 marker 高亮
- [ ] 点击待确认 block 时，详情卡显示“待确认 / 无法在地图中定位”
- [ ] 点击未匹配 block 时，详情卡显示“暂时没有匹配到地图点”
- [ ] `BlockActions` 只会加入 Pending Changes，不会误触 block 选中
- [ ] 切换 Day 后，block 选中态和 active point 会清理
- [ ] 重新生成后，block 选中态和 active point 会清理
- [ ] mobile 路由页未被这轮联动改坏

## 9. 桌面布局检查

- [ ] 1280 宽度下布局正常
- [ ] 1440 宽度下布局正常
- [ ] 1920 宽度下布局正常
- [ ] sidebar、topbar、current day workspace、inspector 层级正常
- [ ] 右侧地图栏不会挤爆布局

## 10. Mobile 回归

- [ ] `/` 在 mobile 上仍是轻量欢迎页
- [ ] `/create` 在 mobile 上可起草
- [ ] `/plan` 在 mobile 上可用
- [ ] `/result` 在 mobile 上保持既有 flow
- [ ] desktop 三栏没有被强行下放到 mobile

## 11. 安全检查

- [ ] 浏览器中不会出现 `AMAP_API_KEY`
- [ ] 浏览器中不会出现 `LLM_API_KEY`
- [ ] 浏览器中不会出现 `QWEATHER_API_KEY`
- [ ] `NEXT_PUBLIC_AMAP_JS_KEY` 出现在前端是正常行为

## 12. 环境变量确认

前端地图：

- [ ] `NEXT_PUBLIC_AMAP_JS_KEY`
- [ ] `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`

服务端高德：

- [ ] `AMAP_API_KEY`
- [ ] `USE_MOCK_POI`
- [ ] `POI_PROVIDER`
- [ ] `USE_MOCK_ROUTE`
- [ ] `ROUTE_PROVIDER`

AI：

- [ ] `USE_MOCK_AI`
- [ ] `LLM_BASE_URL`
- [ ] `LLM_API_KEY`
- [ ] `LLM_MODEL`
- [ ] `LLM_TIMEOUT_MS`

天气：

- [ ] `USE_MOCK_WEATHER`
- [ ] `WEATHER_PROVIDER`
- [ ] `QWEATHER_API_KEY`
- [ ] `QWEATHER_BASE_URL`

## 13. Netlify 部署前确认

- [ ] 已配置 `NEXT_PUBLIC_AMAP_JS_KEY`
- [ ] 如需要，已配置 `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`
- [ ] 如使用真实 POI / Route，已配置 `AMAP_API_KEY`
- [ ] 如使用真实 POI / Route，已配置 `USE_MOCK_POI=false`、`POI_PROVIDER=amap`
- [ ] 如使用真实 Route，已配置 `USE_MOCK_ROUTE=false`、`ROUTE_PROVIDER=amap`
- [ ] 如继续使用 mock，已明确保留 mock 配置
- [ ] 改完环境变量后，已执行 `Clear cache and deploy`

## 14. 已知不做项复核

- [ ] 未做地图选点写回行程
- [ ] 未做搜索地点
- [ ] 未做拖拽 marker
- [ ] 未做拖拽 itinerary block
- [ ] 未做自动重排
- [ ] 未做路线动画
- [ ] 未做登录和保存
- [ ] 未做内容生态
- [ ] 未改 API / schema

## 15. 验收结论

- 结论：通过 / 有条件通过 / 不通过

阻塞项：

- 

非阻塞问题：

- 
