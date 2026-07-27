# Phase 1 Step 2B Implementation Changelog

## 1. 新增文件

### API Routes

- `app/api/projects/route.ts`
- `app/api/projects/[projectId]/route.ts`
- `app/api/projects/[projectId]/state/route.ts`
- `app/api/projects/[projectId]/versions/route.ts`
- `app/api/projects/[projectId]/versions/[versionId]/route.ts`
- `app/api/projects/[projectId]/sources/route.ts`
- `app/api/projects/[projectId]/messages/route.ts`

### Project Data Layer

- `lib/projects/schema.ts`
- `lib/projects/rows.ts`
- `lib/projects/repository.ts`
- `lib/projects/server.ts`
- `lib/projects/service.ts`

### Tests

- `tests/projects/service.test.ts`
- `tests/api/projects.test.ts`

## 2. 修改文件

- `lib/supabase/types.ts`

修改内容：

- 新增 `TravelProject*` 相关 Supabase row / insert / update 类型：
  - `TravelProjectRow`
  - `TravelProjectInsert`
  - `TravelProjectUpdate`
  - `TravelProjectVersionRow`
  - `TravelProjectVersionInsert`
  - `TravelProjectSourceRow`
  - `TravelProjectSourceInsert`
  - `TravelProjectMessageRow`
  - `TravelProjectMessageInsert`

## 3. API 列表

### Project

- `POST /api/projects`
  - 创建 `TravelProject`

- `GET /api/projects/[projectId]`
  - 获取项目详情
  - 返回：
    - `project`
    - `currentVersion`
    - `sources`

- `PATCH /api/projects/[projectId]/state`
  - 更新：
    - `lifecycle_state`
    - `current_flow_stage`
    - `last_activity_at`

### Version

- `POST /api/projects/[projectId]/versions`
  - 创建版本

- `GET /api/projects/[projectId]/versions`
  - 获取版本列表

- `GET /api/projects/[projectId]/versions/[versionId]`
  - 获取指定版本详情

### Source

- `POST /api/projects/[projectId]/sources`
  - 追加来源记录

- `GET /api/projects/[projectId]/sources`
  - 获取来源列表

### Message

- `POST /api/projects/[projectId]/messages`
  - 追加项目消息

- `GET /api/projects/[projectId]/messages`
  - 获取项目消息列表

## 4. Service 职责

`lib/projects/service.ts` 负责业务语义，不直接处理 HTTP。

已实现能力：

- `createProject()`
  - 创建 project
  - 同时创建首条 source

- `getProject()`
  - 聚合读取：
    - project
    - current version
    - sources

- `updateProjectState()`
  - 更新项目状态字段

- `createProjectVersion()`
  - 查询当前最大 `version_number`
  - 计算下一版本号
  - 创建新版本
  - `setAsCurrent=true` 时更新 `current_version_id`
  - 更新 `last_activity_at`

- `listProjectVersions()`
- `getProjectVersion()`

- `addProjectSource()`
- `listProjectSources()`

- `appendProjectMessage()`
  - 保存消息
  - 更新 `last_activity_at`

- `listProjectMessages()`

## 5. Repository 职责

`lib/projects/repository.ts` 只负责数据库操作，不包含业务规则。

已实现方法：

### Project

- `insertProject`
- `getProjectById`
- `updateProjectState`

### Version

- `insertVersion`
- `listVersions`
- `getVersionById`

### Source

- `insertSource`
- `listSources`

### Message

- `insertMessage`
- `listMessages`

说明：

- repository 不负责生成 `version_number`
- repository 不负责更新 `current_version_id`
- repository 不判断状态流转

这些都保留在 service 层

## 6. Row Mapping 职责

`lib/projects/rows.ts` 负责：

- Supabase row -> domain model
- insert payload 规范化

已实现：

- `projectRowToDomain`
- `versionRowToDomain`
- `sourceRowToDomain`
- `messageRowToDomain`
- `buildVersionInsertRow`
- `buildSourceInsertRow`
- `buildMessageInsertRow`

## 7. Schema 职责

`lib/projects/schema.ts` 负责 API 输入校验。

已实现：

- `createProjectInputSchema`
- `updateProjectStateInputSchema`
- `createVersionInputSchema`
- `createSourceInputSchema`
- `createMessageInputSchema`
- `listMessagesQuerySchema`
- `projectIdParamSchema`
- `projectVersionParamsSchema`

## 8. 测试结果

已验证：

### Service

- 创建 project 成功
- 创建 version 时 `version_number` 递增正确
- 追加 message 后会更新 `last_activity_at`

### API

- 创建 project 成功
- 获取 project 详情成功
- 创建 version 成功
- 保存 message 成功
- 当底层返回 `null` 时，不会暴露其他用户 project，接口返回 404

运行结果：

- `npm.cmd run test -- tests/projects/service.test.ts tests/api/projects.test.ts`
  - `2 passed / 8 passed`

- `npm.cmd run build`
  - 通过

## 9. 未接入模块

本阶段明确没有接入：

- `/create`
- `/plan`
- `/workspace`
- `/trips`
- `/api/generate-trip`
- Explore 创建入口
- AI Flow
- My Trips

也没有修改：

- `trip_plans`
- `TripPlan` 结构
- 旧 `trips` API 行为
- Workspace 状态逻辑

## 10. 当前结论

这一步完成后，Wanderly 已具备独立的 `TravelProject` 数据访问能力：

- Route
- Service
- Repository
- Database

完整分层已建立。

同时现有用户体验保持不变，旧旅行流程未被替换。
