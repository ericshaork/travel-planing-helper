# PRODUCT ROADMAP

## 1. 文档目的

这份 roadmap 用来冻结阶段目标，避免把多个方向揉进同一轮开发。

当前产品已经从“能生成一版行程”走到“有地图、有天气、有保存能力的旅行工作台”。下一步不是继续加复杂功能，而是先把观感、层级和可用性修稳。

## 2. 已完成版本

### `v1.0`

- AI 生成旅行计划
- `/create -> /plan -> /result` 主流程
- 复制方案
- Markdown 导出
- 简单重新生成

### `v1.1`

- 积木式行程查看
- 快捷修改
- Pending Changes 初步能力

### `v1.2`

- Mobile Flow First
- Day Cabinet
- Pending Changes 修改篮
- 轻工作台结构

### `v1.2.5`

- 接入真实 AI
- 修复移动端表单体验
- 真实生成 / 重新生成可用

### `v1.3`

- 高德 POI / Route 服务端接入
- 和风天气增强
- `/api/enrich-trip`
- 路线洞察

### `v1.4`

- desktop workspace UI
- hover sidebar
- landing
- `/create`
- `/result` 三栏工作台

### `v1.5`

- 高德 JS SDK loader
- 前端地图 env 读取修复
- 基础地图组件
- `/result` desktop 真实地图接入
- marker 与 itinerary / inspector 联动
- 地图降级

### `v1.6`

- Supabase Auth
- email magic link 登录
- 保存当前计划
- `/trips` 我的行程
- 打开历史计划回到现有 `/result`
- 更新已保存计划
- 删除计划
- `profiles` / `trip_plans` / RLS

## 3. 规划中版本

### `v1.7`

主题：UI / UX 大修

重点方向：

- `/result` 布局与导航修复
- 左侧导航遮挡修复
- 地图区域放大与可展开方案评估
- 天气展示从气象字段转向旅行建议
- marker / active marker 视觉优化
- 图标系统统一
- 欢迎页视觉氛围强化
- 保存 / 打开 / 更新等状态表达优化
- mobile 回归检查

### `v1.8`

主题：内容生态

重点方向：

- 灵感卡
- 路线模板
- 内容种子与内容编排
- Trae 内容流水线接入

### `v1.9`

主题：移动端工作台深度优化

重点方向：

- mobile workspace 结构重整
- 小屏修改入口优化
- 移动端地图 / route / edit 的信息密度重排

### `v2.0+`

主题：高级编辑与协作

重点方向：

- 地图选点
- 拖拽
- 自动重排
- 分享
- 协作

## 4. 当前仍然不做

- 多人协作
- 公开分享
- 多版本历史
- 地图选点写回行程
- 拖拽式编辑
- 自动重排
- 支付与订单能力
