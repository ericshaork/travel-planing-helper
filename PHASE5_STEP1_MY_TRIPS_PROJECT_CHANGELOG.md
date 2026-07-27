# Phase 5 Step 1 My Trips Project Integration

## 修改文件

- `app/api/trips/route.ts`
- `app/trips/page.tsx`
- `components/trips/SavedTripCard.tsx`
- `lib/trips/types.ts`
- `lib/trips/metadata.ts`
- `lib/trips/open-flow.ts`
- `lib/projects/trips/repository.ts`
- `lib/projects/trips/service.ts`
- `lib/projects/trips/types.ts`
- `tests/my-trips-project.test.ts`

## 数据来源变化

- `/api/trips` 现在会优先读取 `TravelProject` 作为 My Trips 列表来源。
- 当用户还没有任何 `TravelProject` 时，接口会自动回退到旧 `trip_plans`，保证老用户历史数据仍可见。
- Project 列表项会携带 `projectId`、`currentVersionId`、`lifecycleState` 等最小上下文，但不复制 `TripPlan` 全量结构。

## 兼容策略

- 点击 Project 类型行程时，不再走旧 saved trip 恢复流程，而是写入 `project session` 后直接进入 `/workspace`。
- 旧 saved trip 仍继续使用原来的打开与恢复逻辑。
- Project 项目在当前阶段不支持在 My Trips 中直接重命名或删除，页面会明确给出提示，避免误走旧 API。

## 测试覆盖

- Project summary 列表返回正常。
- current version 信息会进入 summary。
- 没有 TravelProject 时，旧 `trip_plans` fallback 正常。
- 点击 Project 项目后，Workspace project context 可恢复。
