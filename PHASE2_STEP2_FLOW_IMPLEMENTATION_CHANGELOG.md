# Phase 2 Step 2 Flow Implementation Changelog

## 新增文件

- `lib/projects/flow/flow-types.ts`
- `lib/projects/flow/flow-transition.ts`
- `lib/projects/flow/flow-context.ts`
- `lib/projects/flow/flow-service.ts`
- `tests/projects/flow.test.ts`

## Flow 状态设计

本阶段复用了 `lib/projects/types.ts` 里的 `TravelProjectFlowStage`，没有创建重复状态类型。

当前支持的 AI Flow stage：

- `source_received`
- `source_review`
- `clarifying`
- `proposal_ready`
- `proposal_adjusting`
- `generating`
- `workspace_ready`
- `abandoned`

## 状态转换规则

当前显式允许：

- `source_received -> source_review`
- `source_review -> clarifying`
- `clarifying -> proposal_ready`
- `proposal_ready -> proposal_adjusting`
- `proposal_ready -> generating`
- `proposal_adjusting -> proposal_ready`
- `proposal_adjusting -> generating`
- `generating -> workspace_ready`

额外允许：

- 任意规划中的 flow stage 进入 `abandoned`

明确禁止：

- 任意未定义跳转
- 例如 `source_received -> workspace_ready`

## Service 职责

`lib/projects/flow/flow-service.ts` 只依赖 `ProjectService`，不直接操作数据库。

已实现：

- `initializeFlow()`
  - 第一次有效 source 时创建 project
  - 初始化 stage 为 `source_received`

- `moveFlowStage()`
  - 获取当前项目
  - 校验合法转换
  - 更新 `current_flow_stage`
  - touch `last_activity_at`

- `abandonFlow()`
  - 把当前规划 flow 标记为 `abandoned`

- `resumeFlow()`
  - 根据当前 stage 给出恢复位置
  - 当前 `abandoned` 默认恢复到 `source_review`

## 测试结果

新增测试：

- 合法转换：`source_received -> source_review`
- 非法转换：`source_received -> workspace_ready`
- abandon：`clarifying -> abandoned`
- resume：`abandoned -> source_review`

## 未接入部分

本阶段没有接入：

- `/create`
- `/plan`
- `/workspace`
- `/trips`
- API routes
- `/api/generate-trip`
- LLM / prompt
- 前端 AI 聊天 UI

当前实现只提供 Flow Domain Layer，为下一步 AI Flow route 和 UI 接入做准备。
