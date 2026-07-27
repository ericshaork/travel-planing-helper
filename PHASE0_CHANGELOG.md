# Phase 0 Changelog

## 修改文件

- `lib/projects/types.ts`
- `lib/projects/compat.ts`
- `lib/projects/session.ts`

## 修改原因

- 新增 `TravelProject` 相关架构类型，作为后续 v1.9 Project identity layer 的基础。
- 新增 legacy 到 `TravelProject` 的桥接视图，方便后续 Phase 1/2 在不打断当前 `TripPlan` 流程的前提下逐步接入。
- 新增独立 `project session` 本地存储扩展，用于未来记录 `projectId`、`versionId`、`flowStage`，同时保持现有 `workspace session` 和旧 localStorage key 不变。

## 后续 Phase 依赖关系

- Phase 1 可以直接复用 `lib/projects/types.ts` 里的核心类型定义，对接真实数据库表和服务层。
- Phase 1/2 可以复用 `lib/projects/compat.ts` 中的 legacy 映射逻辑，把现有 `TripPlan` / saved trip 转换为 `TravelProject` 视角。
- Phase 2/4 可以复用 `lib/projects/session.ts` 的 session 扩展，在新 AI Flow 和 Workspace 项目化过程中引入 `projectId` / `versionId` / `flowStage`，而不需要先破坏旧的 `workspace` 流程。
- 当前阶段没有修改 `TripPlan`、AI 生成逻辑、数据库 schema、路由结构和 Workspace UI，因此现有 `/create`、`/plan`、`/workspace`、`/trips` 应保持原样工作。
