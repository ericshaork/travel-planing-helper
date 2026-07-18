# IMAGE_PIPELINE_ARCHITECTURE

## 1. 定位

Image Pipeline 是 Wanderly 中独立的视觉资产生产模块。

它的职责不是生成旅行计划，也不是承担前端图片管理系统的职责。

它只负责在上游旅行内容稳定之后，基于稳定输入生成和管理视觉资产需求与视觉资产结果。

边界定义：

- 不是旅行计划生成器
- 不是前端图片管理系统
- 不修改 `travel-content-pipeline`
- 不依赖当前不稳定的 `plan.json` 字段

输入：

- 稳定后的 `plan.json`

输出：

- `image_request`
- `asset_manifest`
- visual assets

核心原则：

- `travel-content-pipeline` 负责内容语义
- `image-pipeline` 负责视觉资产语义
- 两者通过稳定的内容输入和资产输出解耦协作

## 2. 系统分层

整体分层如下：

```text
Input Layer
    |
    v
Request Generation Layer
    |
    v
Prompt Generation Layer
    |
    v
Provider Adapter Layer
    |
    v
Asset Management Layer
```

### 2.1 Input Layer

职责：

- 接收稳定后的 `plan.json`
- 校验输入来源、版本和基本元信息
- 建立 trip 级别上下文，例如 trip id、locale、source version
- 将输入交给下游解析层，而不是在入口处写死业务逻辑

输出：

- source document metadata
- raw plan payload
- pipeline execution context

### 2.2 Request Generation Layer

职责：

- 将旅行内容解析为视觉需求
- 从抽象语义中提取 destination、POI、food、scene、experience
- 构建 provider-agnostic 的 `image_request`
- 决定哪些资产是必须生成的，哪些是可选或后置生成的

这一层应当面向抽象语义，而不是面向某一版 Explore 字段名。

输出：

- normalized `image_request`

### 2.3 Prompt Generation Layer

职责：

- 将视觉需求转换为结构化 prompt spec
- 读取和应用 style profile
- 将主体信息、风格信息、构图信息分开管理
- 生成适用于多种模型的中间表达，而不是直接耦合单一模型 prompt 格式

输出：

- prompt spec
- style profile reference
- composition hints
- output spec

### 2.4 Provider Adapter Layer

职责：

- 屏蔽不同图片模型和平台的差异
- 将统一的 prompt spec 翻译为 provider-specific request
- 接收生成结果并归一化
- 支持未来替换 OpenAI Image、Flux、Midjourney、Stable Diffusion、国内模型

这一层只定义接口边界，不在当前阶段实现实际调用。

输出：

- normalized generation result
- provider metadata
- temporary file references or storage references

### 2.5 Asset Management Layer

职责：

- 管理生成后的图片文件和派生文件
- 记录状态、版本、替换关系、审核状态
- 生成和维护 `asset_manifest`
- 为前端或下游内容系统提供稳定的资产读取入口

输出：

- persisted visual assets
- `asset_manifest`
- asset-level lookup references

## 3. 数据流

未来数据流如下：

```text
Travel Plan Generator
    |
    v
plan.json
    |
    v
image_request
    |
    v
image generation
    |
    v
asset_manifest
    |
    v
visual assets
```

### 3.1 为什么两个 Pipeline 要解耦

原因一：内容系统和视觉系统演化节奏不同。

`travel-content-pipeline` 当前仍在进行 V2 内容质量重构，而 Image Pipeline 需要先建立稳定架构。如果把视觉逻辑提前嵌入内容流程，后续上游字段变化会直接拖垮图片系统。

原因二：内容 schema 和视觉 schema 关注点不同。

内容系统描述的是旅行方案、路线、POI、体验和叙事结构。视觉系统描述的是图片类型、来源对象、风格要求、尺寸、优先级和资产状态。两者应各自维护独立 schema。

原因三：模型和资产管理具备独立替换需求。

图片模型、审核方式、存储方式、版本策略都可能独立演化，不应与内容生产逻辑耦合。

原因四：便于测试和分阶段推进。

解耦后可以先完成：

- 架构设计
- schema 设计
- 目录规范
- provider interface 设计

在 `plan.json` 稳定之前，不需要进入任何图片生产阶段。

### 3.2 解耦后的协作方式

建议协作方式：

1. Travel Plan Generator 只负责产出稳定内容 artifact。
2. Image Pipeline 读取稳定 artifact，并构建 `image_request`。
3. Image Pipeline 输出 `asset_manifest` 和 visual assets。
4. 后续由绑定层或消费层将视觉资产关联回旅行内容。

这能确保两个模块都可以独立迭代、独立测试、独立替换。
