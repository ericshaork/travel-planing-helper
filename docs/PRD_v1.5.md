# PRD v1.5：真实地图基础版

## 1. 一句话定义

把 `v1.4` 右侧的“地图占位 + 点位列表”升级成真实可看的高德地图基础版，让 `/result` desktop workspace 能按当前 Day 展示真实 marker，并和点位列表、itinerary block 形成基础联动。

## 2. 本轮用户价值

- 不再只看文字路线摘要，能直接看到当天地点大致落在哪些区域。
- 切换 Day 时，右侧地图和 marker 会同步切换。
- 点位列表、marker、当天 itinerary block 之间有基础联动，确认路线更直观。
- 就算地图加载失败，工作台主体也还能继续用。

## 3. 已完成能力

- 高德 JS SDK client-only loader
- `NEXT_PUBLIC_AMAP_JS_KEY` 与 `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE` 前端读取
- `NEXT_PUBLIC_AMAP_JS_KEY` 默认路径直接使用 `process.env.NEXT_PUBLIC_AMAP_JS_KEY`
- 基础地图组件与 loading / error / fallback
- `/result` desktop inspector 真实地图接入
- 当前 Day resolved 点位 marker 展示
- Day 切换时 marker 与视口同步
- marker 与右侧点位列表双向高亮
- itinerary block 与 marker / 点位详情联动
- 缺 key、脚本失败、无点位、未确认点位的降级策略
- 环境变量说明、Netlify 配置建议、手动验收清单

## 4. 核心场景

### 场景 1：进入 `/result` 查看当前 Day 地图

用户进入 `/result` 后，右侧能看到当前 Day 的真实地图和已确认点位 marker。

### 场景 2：切换 Day

用户点击 `Day 1 / Day 2 / Day 3` 后，marker、视口和点位摘要同步切换。

### 场景 3：点击 marker 或点位列表

点击 marker 或右侧点位列表后，对应对象高亮，并显示基础点位详情。

### 场景 4：点击中间 itinerary block

点击中间某个 itinerary block 后，若该地点已确认，会高亮对应 marker / 点位；若未确认，会显示明确提示。

### 场景 5：地图失败时继续看行程

若 key 缺失、脚本失败或浏览器环境异常，地图区域优雅降级，但中间行程、修改、导出、重新生成仍可正常使用。

## 5. 成功标准

- `/result` desktop 右侧显示真实高德地图
- 当前 Day 已确认点位可显示 marker
- 切换 Day 时 marker 与视口同步
- 点位列表与 marker 可互相高亮
- itinerary block 能驱动右侧地图工作台联动
- 地图失败时工作台主体仍可正常使用

## 6. 环境变量边界

- `NEXT_PUBLIC_AMAP_JS_KEY`：前端浏览器高德 JS SDK Key，会暴露给前端
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`：仅在高德 JS Key 配了安全密钥时使用
- `AMAP_API_KEY`：服务端 Web 服务 Key，只给 POI / Route 用，不可暴露

关键约束：

- `NEXT_PUBLIC_AMAP_JS_KEY` 和 `AMAP_API_KEY` 不能混用
- 没有 `NEXT_PUBLIC_AMAP_JS_KEY` 时，地图 fallback，但行程仍可用
- POI / Route 继续用 mock 时，底图依然可显示
- 若想提升真实点位与路线质量，需要 `AMAP_API_KEY` 和 amap provider 配置

## 7. v1.5 明确不做

- 地图选点写回行程
- 地图搜索地点
- 拖拽 marker
- 拖拽 itinerary block
- 自动重排
- 路线动画
- 登录、保存、数据库、分享
- 内容生态
- mobile 地图工作台重构
- API 变更
- `TripPlan` schema 变更
- `/api/generate-trip`、`/api/parse-trip`、`/api/enrich-trip` 逻辑改造

## 8. 已知 Polish

- 当前 active marker 视觉样式还偏工程态，比如红框、方框感偏重。
- 后续可以再做更自然的圆形编号 marker、品牌色 marker 和选中态优化。
- 这不是功能缺陷，不阻塞 `v1.5` 发布准备。
