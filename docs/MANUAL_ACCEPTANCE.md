# MANUAL ACCEPTANCE

## 0. 当前范围

当前手动验收主范围仍覆盖 `v1.6` 完成态：

- 现有旅行生成主链路
- 登录
- 保存当前方案
- 我的行程
- 从历史计划回到现有工作台
- 更新已保存计划
- 删除已保存计划

当前不在本轮范围内：

- 分享 trip
- 多版本历史
- 数据库驱动版 `/result`
- `v1.7` UI 实现落地

## 1. 先跑四项检查

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

## 2. Supabase 基础检查

- [ ] `.env.local` 已配置 `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` 已配置 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `.env.local` 已配置 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] migration 已执行
- [ ] `profiles` 表存在
- [ ] `trip_plans` 表存在
- [ ] `profiles` 已开启 RLS
- [ ] `trip_plans` 已开启 RLS
- [ ] `trip_plans_delete_own` policy 存在
- [ ] Data API 已开启
- [ ] Exposed tables 包含 `profiles`
- [ ] Exposed tables 包含 `trip_plans`
- [ ] Authentication Site URL 已配置
- [ ] Authentication Redirect URL 已配置

## 3. 主链路回归

- [ ] `/` 正常打开
- [ ] `/create -> /plan -> /result` 仍可用
- [ ] `/result` 复制 / 导出 / 重新生成正常
- [ ] 地图、天气、route inspector 未因 `v1.6` 回归损坏
- [ ] mobile 没有严重破版

## 4. 登录验收

- [ ] 未登录时仍可访问生成主链路
- [ ] `/login` 可发送 magic link
- [ ] 登录后 Header 显示邮箱或登录态
- [ ] 刷新后登录状态保留
- [ ] 退出登录后不再显示用户信息

## 5. 保存验收

- [ ] 未登录时在 `/result` 点击保存会跳转 `/login?returnTo=/result`
- [ ] 登录后在 `/result` 可以保存当前计划
- [ ] 点击保存后命中 `POST /api/trips`
- [ ] Supabase `trip_plans` 新增一条记录
- [ ] 保存成功后按钮状态正确

## 6. 我的行程验收

- [ ] 未登录访问 `/trips` 时看到登录引导
- [ ] 登录引导跳转 `/login?returnTo=/trips`
- [ ] 已登录且无数据时显示空状态
- [ ] 已登录且有数据时显示 trip list
- [ ] 列表只显示轻量字段，不暴露完整大 JSON

## 7. 打开历史验收

- [ ] `/trips` 卡片有“打开到工作台”
- [ ] 点击后请求 `GET /api/trips/[tripId]`
- [ ] API 只允许当前登录用户读取自己的 trip
- [ ] 返回内容包含 `trip_request_json`
- [ ] 返回内容包含 `trip_plan_json`
- [ ] 返回内容包含 `enrichment_json`
- [ ] 返回内容包含 `weather_summary_json`
- [ ] 客户端会恢复到既有 localStorage key
- [ ] 恢复后跳转到 `/result`
- [ ] 刷新后仍能继续显示当前恢复结果

## 8. 更新验收

- [ ] 登录
- [ ] 创建并保存一条新计划
- [ ] 回到 `/trips` 打开这条计划
- [ ] 回到 `/result`
- [ ] 对计划做修改或重新生成
- [ ] 按钮显示“更新已保存计划”或等价状态
- [ ] 点击后命中 `PATCH /api/trips/[tripId]`
- [ ] 同一条记录的 `updated_at` 更新
- [ ] 不会新增重复记录，除非用户重新走新建流

## 9. 删除验收

- [ ] 打开 `/trips`
- [ ] 点击某条计划的删除
- [ ] 出现确认框
- [ ] 取消时不删除
- [ ] 确认时命中 `DELETE /api/trips/[tripId]`
- [ ] 删除成功后列表移除
- [ ] Supabase 对应记录消失
- [ ] 删除当前工作台关联计划时，会清理本地 `savedTripId`
- [ ] 不能删除其他用户的计划

## 10. 安全检查

- [ ] 浏览器端不暴露 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 浏览器端不暴露 `AMAP_API_KEY`
- [ ] 浏览器端不暴露 `LLM_API_KEY`
- [ ] 浏览器端不暴露 `QWEATHER_API_KEY`
- [ ] 保存、更新、删除都使用 `bearer token + anon key + RLS`
- [ ] 服务端不信任前端传入的 `user_id`

## 11. v1.7 待验收占位

这一节先作为 `v1.7` 手动验收占位，当前不代表已经完成。

后续应至少覆盖：

- [ ] `/result` 左侧导航不再遮挡主内容
- [ ] desktop 三栏布局空间更稳定
- [ ] 地图区块可读性明显提升
- [ ] 天气模块优先表达“下雨 / 带伞 / 户外适宜度”
- [ ] marker / icon / button / chip 状态表达更统一
- [ ] landing 氛围更完整，但不影响首屏理解
- [ ] `/create /plan /result /trips /login` 全流程无明显视觉回归
- [ ] mobile 无严重破版

## 12. v1.9 Revision Mode 文案与信息层级验收

本节只验收 Revision Mode 的文案与信息表达，不涉及 AI 调用逻辑、revision 数据结构、版本系统与 Workspace。

进入方式：`/create` 生成 V1 方案后进入 AI 修改模式，页面根节点为 `[data-revision-mode="on"]`。

### 12.1 页面顶部（`revision-mode-header`）

- [ ] 眉标为「和 Wanderly 一起打磨这份旅行手记」，不再是「继续整理这段旅程」
- [ ] 主标题为「正在调整：{方案标题} V{n}」，版本号与左侧当前方案一致
- [ ] 讨论模式副标题为「告诉 AI 哪里想改变，它会帮你重新整理这一版旅程。」
- [ ] 右上角状态标记：讨论模式显示「AI 调整模式」，编辑模式显示「计划编辑模式」
- [ ] 目的地 / 天数、方案摘要、每日路线摘要按有值才展示（摘要与路线仅讨论模式展示，编辑模式由右侧档案卡承载）

### 12.2 初始五问区域（`revision-initial-thoughts`）

- [ ] 标题为「初始旅行想法」
- [ ] 说明文案明确「在这份基础上继续打磨，不会重新创建旅行」
- [ ] 用户不会误以为正在重新走创建流程

### 12.3 输入框与示例（`chat-workspace-composer` / `revision-quick-chips`）

- [ ] placeholder 为「告诉我想调整哪里……」，不再是创建阶段语气
- [ ] 示例提示含「更换景点 / 调整节奏 / 增加美食 / 修改预算」四项
- [ ] 点击示例把起手句填入输入框，不直接发送
- [ ] 发送中示例按钮为禁用态

### 12.4 左侧版本栏（`chat-workspace-sidebar`）

- [ ] 条目主标为 `V1 / V2 / V3`，不是「第 n 版」
- [ ] 当前版本状态为「当前方案」
- [ ] 真实版本不足 3 条时用占位补齐，占位状态为「等待调整」，虚线不可点击
- [ ] 已有多版时按版本号升序排列，真实版本都可点击

### 12.5 模式切换（`revision-mode-actions`）

- [ ] 进入 Revision Mode 默认停在「继续和 AI 讨论（当前）」
- [ ] 左栏标题随模式切换：讨论模式「旅行手札 / 正在和 AI 讨论选中的这一版」，编辑模式「旅行计划档案 / 点一版…带进工作台」（`data-sidebar-mode`）
- [ ] 点击「进入计划编辑」切到编辑模式，右侧换成旅行计划档案卡（`revision-edit-mode-panel`）
- [ ] 编辑模式下点「回到和 AI 讨论」或顶部「继续和 AI 讨论」可切回，聊天记录不丢
- [ ] 两个按钮的当前态带「（当前）」后缀且 `aria-pressed` 正确

### 12.6 版本选择与右侧联动（编辑模式）

- [ ] 点击左侧任一真实版本，右侧标题、summary、每日路线同步切换
- [ ] 点击占位版本无反应，不会把选中项切走
- [ ] 选中历史版本时右侧标注「历史版本」，选中当前版本标注「当前方案」
- [ ] 切换版本不修改任何一版内容，不产生新版本

### 12.7 进入工作台（`revision-action-enter-workspace`）

- [ ] 按钮文案为「进入工作台编辑「{方案标题} V{n}」」，版本号跟随左侧选中项变化
- [ ] 无可选版本时按钮禁用
- [ ] 点击后进入 `/workspace`，加载的是选中的那一版，不是永远的当前版
- [ ] 选 V1 进入工作台后再返回，左侧选中态仍是 V1
- [ ] 全程不创建新版本、不应用 AI 修改建议

### 12.8 截图位置

截图统一放在 `docs/screenshots/v1.9-revision-mode/`，命名如下：

- `01-header.png` — 顶部标题与副标题
- `02-initial-thoughts.png` — 初始旅行想法区域
- `03-composer.png` — 输入框 placeholder 与示例提示
- `04-sidebar.png` — 左侧 V1/V2/V3 版本栏
- `05-enter-workspace.png` — 编辑模式档案卡与进入工作台按钮
- `06-mobile.png` — 移动端整体无破版
- `07-chat-reply.png` — 普通讨论 reply 回复
- `08-modification-suggestion.png` — 修改建议卡片
- `09-edit-mode-switch.png` — 选中历史版本后右侧联动

### 12.9 AI 讨论上下文（服务端）

- [ ] 输入「第二天不要大雁塔，换轻松一点」，AI 回复点名 Day2 与当前计划里的真实地点，不是泛泛建议
- [ ] 该地点即使排在某时段第二位，AI 也能识别（prompt 展开每个时段全部地点）
- [ ] 追问「预算 3000 够吗」时 AI 引用五问里填的预算与同行人
- [ ] 修改类问题返回 `modification_suggestion` 卡片，咨询类问题返回普通 reply
- [ ] 全程不返回完整 tripPlan，不生成新版本

### 12.10 说明

`isRevisionMode` 由组件内部 effect 驱动，`renderToStaticMarkup` 进不去该状态，因此组件级串联仍以手动验收为准；版本选择、每日路线、handoff、label 等纯逻辑已由 `tests/revision-mode.test.ts` 覆盖。

## 13. 结论

- 结论：通过 / 有条件通过 / 不通过
- 阻塞项：
- 非阻塞项：
