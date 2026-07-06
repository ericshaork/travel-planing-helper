# MANUAL ACCEPTANCE

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

## 3. 主链路回归
- [ ] `/` 是欢迎页 / Landing，而不是创建表单页
- [ ] 点击“创建新计划”会进入 `/create`
- [ ] `/create` 仍能正常完成起稿
- [ ] `/plan` 仍是最终确认页
- [ ] `/result` 仍能展示完整 `TripPlan`
- [ ] copy / export / regenerate 正常
- [ ] Pending Changes 流程正常

## 4. Landing 验收
- [ ] landing 右侧没有无标题无说明的空白框
- [ ] landing 至少有 2-3 张可读的静态灵感卡
- [ ] landing 不直接展示 `CreateModeSelector`
- [ ] landing 不直接展示 `NaturalLanguageInput`
- [ ] landing 上的 `route / edit / export` 只给提示，不会跳去奇怪区域
- [ ] 本轮没有接入真实 Explore / 图片 API / 抓图逻辑

## 5. Desktop Workspace 回归
- [ ] `/result` 仍是三栏工作台
- [ ] 当前 Day 仍是中间主视角
- [ ] 右侧 inspector 仍会跟随 active Day
- [ ] Utility Panel 仍保留预算、天气、住宿、交通等入口
- [ ] sidebar active 清晰但不过重

## 6. Mobile 回归
- [ ] `/` 在 mobile 上仍然是轻量欢迎页
- [ ] `/create` 在 mobile 上仍可起稿
- [ ] `/result` 在 mobile 上仍保持既有 flow
- [ ] desktop 三栏没有下放到 mobile

## 7. 已知不做项复核
- [ ] 未接前端地图 SDK
- [ ] 未做地图选点写回行程
- [ ] 未做登录和保存
- [ ] 未接外部内容生态
- [ ] 未改 API/schema

## 8. 验收结论
- 结论：通过 / 有条件通过 / 不通过

阻塞项：
- 

非阻塞问题：
- 
