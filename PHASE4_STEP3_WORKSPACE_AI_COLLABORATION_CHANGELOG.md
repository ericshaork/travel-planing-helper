# Phase 4 Step 3 Workspace AI Collaboration

## 新增文件

- `lib/projects/workspace-ai/workspace-ai-types.ts`
- `lib/projects/workspace-ai/workspace-ai-service.ts`
- `lib/projects/workspace-ai/workspace-ai-client.ts`
- `app/api/projects/[projectId]/workspace-ai/route.ts`
- `tests/workspace-ai-version.test.ts`

## 修改文件

- `components/trip/RegenerateBox.tsx`

## 本次实现

- 为 Workspace 新增项目级 AI 修改服务层，负责读取当前 `projectId + versionId + TripPlan + TripRequest` 上下文。
- Workspace AI 修改请求会复用现有 `ConversationService` 生成助手回复，并复用现有 `planTrip` 进行完整重生成。
- 每次 AI 修改都会创建一个新的 `TravelProjectVersion`，`createdFrom` 记录为 `ai_adjust`，并自动切换为当前版本。
- 旧版本不会被覆盖，版本链继续保留。
- 当前数据库没有 `parent_version_id` 字段，因此父版本和修改原因先写入 `proposalSummary.workspaceAi` 元数据中，作为兼容性方案。
- `RegenerateBox` 现在优先走 `/api/projects/[projectId]/workspace-ai`；如果当前没有 project/version 上下文，则自动回退到旧 `/api/generate-trip`。

## 测试覆盖

- AI 修改会基于当前版本生成新版本。
- 新版本创建后，旧版本仍然存在。
- Workspace 会把 session 中的 `versionId` 切换到最新版本。
- 没有 project 上下文时，旧生成链路仍然可用。

## 未实现内容

- 暂未新增 Workspace 专属 AI UI 美化。
- 暂未提供版本历史展示或版本比较界面。
- 暂未为数据库增加显式 `parent_version_id` 字段。
