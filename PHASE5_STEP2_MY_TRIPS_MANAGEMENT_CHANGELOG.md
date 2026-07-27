# Phase 5 Step 2 My Trips Management

## 修改文件

- `app/api/projects/[projectId]/route.ts`
- `app/trips/page.tsx`
- `components/trips/SavedTripCard.tsx`
- `lib/projects/schema.ts`
- `lib/projects/service.ts`
- `lib/projects/trips/client.ts`
- `lib/projects/trips/repository.ts`
- `lib/projects/trips/service.ts`
- `tests/my-trips-management.test.ts`

## 新增能力

- My Trips 中的 `TravelProject` 现在支持重命名。
- My Trips 中的 `TravelProject` 现在支持归档，归档后不会删除任何版本、消息或来源记录。
- 已归档项目仍然可以继续从 My Trips 打开，并恢复到 `/workspace`。

## API 变化

- `PATCH /api/projects/[projectId]`
  - 支持 `title` 修改
  - 支持 `lifecycleState` 修改
  - 保持现有 project route 风格，权限仍依赖当前用户与 RLS

## 生命周期说明

- 本阶段只实现最小状态管理：
  - 活跃项目可改名
  - 活跃项目可进入 `archived`
- 不做真实删除
- 不影响 `versions / sources / messages / workspace context`

## 测试覆盖

- rename 成功
- archive 成功
- archived 项目仍可恢复
- 无权限用户无法修改项目
- 旧 `trip_plans` fallback 不受影响
