# PROMPT_BUILDER_SPEC

## 1. 目标

本文件定义 Image Pipeline 中 Prompt Builder 的职责、输入、输出和中间表示规范。

Prompt Builder 的定位是：

- 接收已经规范化的视觉主体信息
- 应用 style profile、composition 和 context
- 输出 provider 无关的 `Normalized Prompt Spec`

它不负责直接调用图片模型，也不负责资产管理。

整体关系如下：

```text
Visual Subject
    +
Style Profile
    +
Composition
    +
Context
    |
    v
Normalized Prompt Spec
    |
    v
Provider
```

## 2. Prompt Builder 职责

Prompt Builder 的核心职责包括：

- 将视觉主体转换为可生成的结构化视觉描述
- 将品牌风格与资产类型风格注入请求
- 将构图约束和上下文约束统一整理
- 输出 provider-agnostic 的 prompt spec
- 为不同模型留出翻译空间，而不是直接产出某个厂商专属 prompt

Prompt Builder 不负责：

- 理解原始旅行计划
- 决定生成哪些图片
- 管理 provider 生命周期
- 维护资产目录
- 决定审核结果

边界原则：

- 内容语义由 Request Mapping Layer 提供
- 风格语义由 Style Profile 提供
- Prompt Builder 只负责生成“可翻译的视觉描述”

## 3. 输入

Prompt Builder 的输入由四部分组成：

- Visual Subject
- Style Profile
- Composition
- Context

### 3.1 Visual Subject

Visual Subject 用于表达“这张图的主体是什么”。

建议至少包括：

- `subject_type`
- `source_entity_type`
- `source_entity_ref`
- `title`
- `summary`
- `location_context`
- `time_context`
- `mood_context`
- `cultural_context`
- `must_include`

它提供的是内容层抽象，不直接绑定上游 `plan.json` 字段。

### 3.2 Style Profile

Style Profile 用于表达“这张图应该是什么视觉语言”。

建议至少包括：

- `style_profile_id`
- `asset_role`
- `style_family`
- `style_keywords`
- `mood_keywords`
- `composition_rules`
- `avoid_rules`
- `color_tendency`
- `realism_level`

Style Profile 是品牌和资产类型风格的稳定来源。

### 3.3 Composition

Composition 用于表达“这张图如何组织画面”。

建议至少包括：

- framing
- subject emphasis
- foreground and background relation
- perspective hints
- negative space preference
- focal hierarchy

Composition 可以来自：

- asset role 默认规则
- style profile 规则
- 业务使用场景规则

### 3.4 Context

Context 用于表达“这张图处于什么使用和叙事情境中”。

建议至少包括：

- `usage`
- `destination`
- `audience`
- `travel_concept`
- `day_index`
- `part_of_day`
- `season`
- `locale`
- `output_spec`

Context 的作用是帮助 Prompt Builder 生成更完整的视觉意图，而不是替代主体本身。

## 4. 输出

Prompt Builder 的输出是 `Normalized Prompt Spec`。

它不是最终给某个模型的 prompt 字符串，而是一个结构化、provider 无关的中间表示。

推荐逻辑形态：

```json
{
  "spec_version": "1.0.0",
  "asset_role": "cover",
  "subject": {},
  "style": {},
  "composition": {},
  "context": {},
  "constraints": {},
  "rendering_intent": {}
}
```

## 5. Prompt 结构

### 5.1 Subject Block

作用：

- 描述图像主体
- 明确重点对象
- 提供可视化所需的内容事实

建议字段：

- `primary_subject`
- `secondary_subjects`
- `identity_markers`
- `location_markers`
- `activity_markers`
- `cultural_markers`

### 5.2 Style Block

作用：

- 描述风格语言
- 提供品牌调性和资产类型调性

建议字段：

- `style_profile_id`
- `style_family`
- `style_keywords`
- `mood_keywords`
- `realism_level`
- `color_tendency`

### 5.3 Composition Block

作用：

- 描述画面组织方式
- 帮助不同 provider 在不同语法下保持一致视觉目标

建议字段：

- `shot_type`
- `framing`
- `focus_priority`
- `foreground_background_balance`
- `visual_density`
- `text_safe_area`

### 5.4 Context Block

作用：

- 提供补充叙事语义
- 提供面向产品使用位置的约束

建议字段：

- `usage`
- `audience`
- `destination`
- `time_context`
- `trip_context`
- `experience_context`

### 5.5 Constraints Block

作用：

- 限制不该出现的内容
- 统一 provider 翻译时的边界

建议字段：

- `must_include`
- `avoid`
- `safety_notes`
- `cultural_notes`
- `quality_requirements`

### 5.6 Rendering Intent Block

作用：

- 表达输出目标，而不是模型实现细节

建议字段：

- `aspect_ratio`
- `orientation`
- `min_width`
- `min_height`
- `variant_count`
- `delivery_priority`

## 6. Provider 无关设计

Prompt Builder 必须保持 provider 无关。

原因包括：

- 不同模型对 prompt 语言的接受方式不同
- 有些模型偏自然语言
- 有些模型偏参数化结构
- 有些 provider 支持额外控制项，有些不支持

因此 Prompt Builder 的职责不是“写一句最终 prompt”，而是“定义清晰的视觉目标”。

上层固定的是：

- subject meaning
- style meaning
- composition meaning
- context meaning

下层 provider adapter 再决定：

- 如何翻译成自然语言 prompt
- 如何映射到 provider-specific 参数
- 如何做降级或裁剪

## 7. 如何支持不同模型

### 7.1 一套上层语义，多套下层翻译

推荐策略：

- Prompt Builder 只生成一套 `Normalized Prompt Spec`
- 每个 Provider Adapter 负责把 spec 翻译成自己的输入格式

例如：

- OpenAI Image adapter 可以偏自然语言翻译
- Flux adapter 可以偏结构化提示加权
- Midjourney adapter 可以偏风格关键词重组
- Stable Diffusion adapter 可以偏 prompt plus parameter 形式
- 国内模型 adapter 可以按平台语法裁剪和重排

### 7.2 支持能力差异

不同 provider 能力不同，Prompt Builder 不应假设全部能力都可用。

因此推荐：

- Prompt Builder 输出完整意图
- Provider Adapter 根据 capability 做保留、裁剪或降级

例如：

- 某 provider 不支持精确尺寸控制
- 某 provider 不支持多候选
- 某 provider 不支持复杂构图控制

这些差异应由 Adapter 处理，而不是污染 Prompt Builder 上层接口。

## 8. Prompt Builder 推荐流程

推荐流程如下：

```text
visual subject intake
    |
    v
style profile merge
    |
    v
composition enrichment
    |
    v
context injection
    |
    v
constraints normalization
    |
    v
normalized prompt spec
```

每一步的目的：

- intake：接收主体语义
- merge：注入品牌和资产类型风格
- enrichment：补足构图信息
- injection：补足使用上下文
- normalization：把要求整理成稳定中间结构

## 9. 设计原则总结

Prompt Builder 的关键原则是：

- 不绑定当前 `plan.json`
- 不绑定任意单一 provider
- 不直接承担模型调用责任
- 优先输出结构化视觉意图
- 让不同模型通过 adapter 去适配

## 10. 当前阶段不包括

当前阶段不包括：

- 实际 prompt 模板实现
- prompt 文本生成实现
- provider-specific 翻译实现
- 图片生成调用
