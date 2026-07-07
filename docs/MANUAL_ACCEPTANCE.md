# MANUAL ACCEPTANCE

## 0. 当前范围

当前手动验收范围覆盖到 `v1.6 phase 8`：

- 现有旅行生成主链路
- 登录
- 保存当前方案
- 我的行程列表
- 从历史计划回到现有工作台
- 更新已保存计划
- 删除已保存计划

当前不在本轮范围内：

- 分享 trip
- 多版本历史
- 数据库驱动版 `/result`
- v1.7 UI 大修

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
- [ ] 点击后会请求 `GET /api/trips/[tripId]`
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

## 11. 结论

- 结论：通过 / 有条件通过 / 不通过
- 阻塞项：
- 非阻塞项：
