# IMAGE_PROVIDER_INTERFACE

## 1. 目标

本文件定义 Image Pipeline 与图片模型之间的统一接口边界。

目标不是绑定任何单一模型，而是定义一层稳定的 Provider Adapter Contract，使 Wanderly 后续可以接入不同图片能力而不影响上层架构。

未来支持范围包括：

- OpenAI Image
- Flux
- Midjourney
- Stable Diffusion
- 国内图片模型

当前阶段只定义接口，不实现调用。

## 2. Provider 的职责边界

Provider 的唯一核心职责是：

- 接收标准化的图片生成请求
- 将请求翻译为具体模型可执行的生成任务
- 返回标准化的生成结果

Provider 不负责：

- 理解旅行计划
- 解析业务内容
- 决定生成哪些图片
- 生成业务逻辑
- 管理资产目录
- 决定审核规则
- 维护 asset manifest

边界原则：

- 业务语义属于 Image Pipeline 上层
- 模型适配属于 Provider Adapter Layer
- 文件和资产生命周期属于 Asset Management Layer

## 3. Provider Interface Position

Provider Interface 所在位置如下：

```text
stable plan.json
    |
    v
request generation
    |
    v
prompt generation
    |
    v
provider interface
    |
    v
generation result
    |
    v
asset management
```

这意味着 Provider 只接收已经准备好的生成请求，而不是原始旅行内容。

## 4. 统一输入格式

### 4.1 设计原则

统一输入格式应满足：

- 不依赖具体模型 prompt 语法
- 能表达资产类型
- 能表达主体信息
- 能表达风格信息
- 能表达输出规格
- 能附带 provider-specific options，但不让它污染主结构

### 4.2 推荐输入结构

推荐逻辑结构：

```json
{
  "request_id": "req_xxx",
  "asset_request_id": "assetreq_xxx",
  "asset_role": "cover",
  "subject": {},
  "prompt_spec": {},
  "output_spec": {},
  "options": {}
}
```

### 4.3 输入字段说明

- `request_id`
  整个请求批次中的请求 id，用于追踪和日志关联。

- `asset_request_id`
  单个图片请求 id，用于关联上游 `image_request`。

- `asset_role`
  资产角色，例如 `cover`、`place`、`food`、`scene`、`experience`。

- `subject`
  主体描述的标准化结构，包含地点、食物、体验、时间氛围、文化上下文等。

- `prompt_spec`
  由 Prompt Generation Layer 生成的标准化 prompt 表达，不要求等于最终模型 prompt。

- `output_spec`
  输出规格，例如比例、方向、最小尺寸、多候选数量。

- `options`
  预留给 provider-specific 参数，例如风格强度、采样策略、推理参数等，但这些参数不应反向污染统一接口。

## 5. 统一输出格式

### 5.1 设计原则

统一输出格式应满足：

- 能表达任务是否成功
- 能返回生成出的文件引用
- 能保留 provider 元数据
- 能表达失败原因
- 能表达同步或异步执行差异

### 5.2 推荐输出结构

```json
{
  "provider_id": "provider_xxx",
  "model_id": "model_xxx",
  "job_id": "job_xxx",
  "status": "completed",
  "files": [],
  "error": null,
  "raw": {}
}
```

### 5.3 输出字段说明

- `provider_id`
  Provider 标识，例如逻辑层的 provider adapter id。

- `model_id`
  模型标识。可选，因为不同平台对模型标识能力不同。

- `job_id`
  Provider 侧任务 id。用于异步轮询、失败追踪和审计。

- `status`
  标准化任务状态。

- `files`
  生成结果文件引用列表。这里应返回 provider output 的临时引用或已下载的中间引用，而不是直接承担最终资产目录管理职责。

- `error`
  失败信息对象，包含错误码、错误消息和是否可重试。

- `raw`
  原始 provider 响应快照或裁剪版元数据，用于审计和 debug。

## 6. 生命周期

### 6.1 标准生命周期

Provider 侧任务生命周期建议统一为：

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

其中：

- `queued` 表示任务已提交但尚未开始执行
- `running` 表示模型正在生成
- `completed` 表示已产出可消费结果
- `failed` 表示任务失败且本次无有效结果
- `cancelled` 表示任务被主动取消

### 6.2 同步与异步兼容

不同 provider 的执行方式可能不同：

- 有些接口是同步返回结果
- 有些接口是异步 job 轮询
- 有些平台甚至需要 webhook 或外部通知

统一接口应兼容三类模式。

因此建议：

- 始终保留 `job_id`
- 始终保留 `status`
- 将是否同步视为 provider 实现细节，而不是上层业务差异

## 7. 错误处理

### 7.1 错误分类

Provider 错误建议分为以下几类：

- validation error
- provider unavailable
- rate limited
- timeout
- policy blocked
- generation failed
- malformed response
- unknown error

### 7.2 错误对象建议

```json
{
  "code": "timeout",
  "message": "provider generation timed out",
  "retryable": true
}
```

字段说明：

- `code`
  标准化错误码，用于上层流程判断。

- `message`
  可读错误信息，用于日志、审计和人工排查。

- `retryable`
  标识本次失败是否适合自动重试。

### 7.3 错误处理原则

- Provider 只报告模型或平台层面的失败
- 业务层决定是否重试、替换 provider 或转人工审核
- 不要把 provider 自己的原始错误格式直接暴露为上层契约
- 允许保留 `raw` 作为附加调试信息

## 8. Provider Capability 抽象

不同 provider 的能力不同，因此建议引入 capability 抽象，用于描述一个 provider 支持什么能力。

例如：

- supports aspect ratio control
- supports multi-image candidates
- supports reference image input
- supports async jobs
- supports seed
- supports high resolution output

这样上层可以基于 capability 做路由或降级，但仍然不依赖某个厂商。

## 9. Provider Adapter Strategy

推荐每个 provider 都有独立 adapter：

- OpenAI Image adapter
- Flux adapter
- Midjourney adapter
- Stable Diffusion adapter
- Domestic provider adapter

统一要求：

- 输入走统一 request contract
- 输出走统一 result contract
- provider-specific 差异封装在 adapter 内部

这样后续即使替换模型，也不需要改：

- `image_request`
- style profile
- request mapping logic
- asset management conventions

## 10. Phase 0.2 结论

Phase 0.2 的 Provider Interface 应固定以下原则：

- Provider 只负责图片生成
- Provider 不理解旅行计划
- Provider 不管理资产目录
- 上层负责业务语义
- 下层负责模型适配
- 统一输入输出结构优先于单一厂商格式

当前阶段不包括：

- 实际 API 调用
- 任务重试实现
- provider routing 实现
- prompt 模板实现
