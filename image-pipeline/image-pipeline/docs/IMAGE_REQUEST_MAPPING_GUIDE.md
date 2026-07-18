# IMAGE_REQUEST_MAPPING_GUIDE

## 1. 目标

本文件定义未来 stable `plan.json` 到 `image_request` 的抽象映射原则。

核心目标：

- 不绑定当前不稳定字段
- 不依赖当前 Explore 实现细节
- 让 Image Pipeline 可以在旅行计划内容结构升级后继续兼容

本文件讨论的核心关系是：

```text
Content Entity
    |
    v
Visual Subject
    |
    v
Image Request
```

## 2. 为什么需要抽象映射层

`plan.json` 的职责是表达旅行内容。

`image_request` 的职责是表达视觉资产需求。

这两者不是同一层抽象。

如果直接用上游字段名驱动图片请求，会带来几个问题：

- 上游 schema 一变，图片系统就要跟着重写
- 内容对象不一定天然等于视觉主体
- 同一个内容实体可能派生多种视觉资产
- 未来攻略内容加深后，字段会变多但图片系统不应失稳

因此中间必须有一层 `Visual Subject` 抽象。

## 3. 三层抽象定义

### 3.1 Content Entity

Content Entity 是上游旅行内容中的语义对象。

未来 stable `plan.json` 里可能出现的内容实体包括：

- trip
- destination
- travel concept
- route
- daily itinerary
- POI entity
- food entity
- experience entity
- scene unit

### 3.2 Visual Subject

Visual Subject 是从内容实体中提取出的视觉表达对象。

它的作用是回答：

- 这张图在表现什么
- 这张图要突出什么
- 这张图应该带有什么氛围或风格约束

Visual Subject 不需要完全等于原始内容实体。

例如：

- 一个 trip 可映射为 cover subject
- 一个 POI entity 可映射为 place subject
- 一个 daily itinerary 片段可映射为 scene subject
- 一个 experience entity 可映射为 experience subject

### 3.3 Image Request

Image Request 是最终进入图片系统的生成需求对象。

它在 Visual Subject 基础上继续补充：

- asset role
- usage
- style requirements
- output spec
- priority

## 4. 通用映射原则

### 4.1 语义优先，不做字段耦合

映射应基于语义角色，而不是基于某个字段名。

例如：

- 不是“读取某个固定字段生成 cover”
- 而是“识别 trip-level narrative subject 生成 cover”

### 4.2 一个内容实体可以生成多个视觉请求

同一个内容对象不一定只生成一张图。

例如：

- 一个 destination 可能用于 cover，也可能用于 place scene
- 一个 POI entity 可能有主图和备用图
- 一个 experience entity 可能有沉浸式体验图和氛围图

### 4.3 多个内容实体可以合成一个视觉主体

有些视觉主体天然是组合表达。

例如：

- cover 可能综合 destination、travel concept 和核心体验
- scene 可能综合 day index、route segment 和 time-of-day atmosphere

### 4.4 抽象映射优于结构映射

映射逻辑应围绕这些抽象问题：

- 视觉主体是谁
- 用户会在什么位置看到这张图
- 这张图是信息展示还是氛围增强
- 这张图需要更真实还是更艺术化

而不是围绕：

- 上游字段长什么样
- 当前 JSON key 叫什么

## 5. 五类图片的映射原则

### 5.1 cover

目标：

- 表达整个 trip 的第一视觉印象

Content Entity 可能来源：

- trip
- destination
- travel concept
- summary-level narrative

Visual Subject 应强调：

- 目的地身份
- 旅行主题
- 整体情绪和期待感

Image Request 应包含：

- `asset_role = cover`
- trip-level subject ref
- cover usage
- editorial style direction

说明：

cover 通常不是对某个单独实体的机械映射，而是 trip-level 聚合映射。

### 5.2 place

目标：

- 展示地点本身及其辨识度

Content Entity 可能来源：

- POI entity
- route landmark
- destination sub-location

Visual Subject 应强调：

- 地点身份
- 空间特征
- 建筑、人文或自然环境细节

Image Request 应包含：

- `asset_role = place`
- entity-level source ref
- location-aware style requirements

说明：

place 图是实体导向图片，最适合直接围绕单个地点语义生成。

### 5.3 food

目标：

- 展示食物特征、地域文化和用餐氛围

Content Entity 可能来源：

- food entity
- meal recommendation
- restaurant-linked food subject

Visual Subject 应强调：

- 食物主体
- 地方饮食文化
- 桌面或店内氛围

Image Request 应包含：

- `asset_role = food`
- food subject ref
- food photography style requirements

### 5.4 scene

目标：

- 增强 itinerary 阅读体验
- 表达某段时间、路线或一天中的情绪氛围

Content Entity 可能来源：

- daily itinerary
- route segment
- time-of-day narrative block
- transition moment

Visual Subject 应强调：

- 时间感
- 场景氛围
- 移动、停留、漫步、夜晚等旅行节奏

Image Request 应包含：

- `asset_role = scene`
- day or route context ref
- atmosphere-first visual intent

说明：

scene 图通常是叙事导向，不一定绑定单一地点，也不一定是具体景点照片。

### 5.5 experience

目标：

- 展示旅行中的参与感、互动感和记忆点

Content Entity 可能来源：

- experience entity
- activity block
- immersive moment

Visual Subject 应强调：

- 人的参与
- 行为和感受
- 沉浸式时刻

Image Request 应包含：

- `asset_role = experience`
- experience subject ref
- human-centered visual direction

## 6. Visual Subject 设计建议

Visual Subject 建议具备以下最小信息：

- `subject_type`
- `source_entity_type`
- `source_entity_ref`
- `title` or short descriptor
- `location_context`
- `time_context`
- `mood_context`
- `cultural_context`

这样做的好处：

- 能兼容不同版本内容 schema
- 能让 Prompt Builder 拿到足够稳定的信息
- 能避免 provider 直接接触业务结构

## 7. 如何在未来内容升级后保持兼容

未来旅行计划很可能会从轻量 Explore plan 升级成更详细攻略，包括：

- 更完整的 summary
- 更复杂的 daily itinerary
- 更丰富的 route
- 更多 POI、food、experience 节点
- 更多 narrative blocks

Image Pipeline 保持兼容的关键不是提前绑定所有字段，而是固定三件事：

1. 固定语义层

- trip
- place
- food
- scene
- experience

2. 固定映射层

- Content Entity
- Visual Subject
- Image Request

3. 固定请求层

- `image_request` 的抽象结构保持稳定

只要这三层稳定，上游即使增加字段、拆分字段或重构内容组织方式，Image Pipeline 也只需要更新语义提取器，而不是推翻整套图片请求体系。

## 8. 推荐映射流程

推荐流程如下：

```text
stable plan.json
    |
    v
semantic extraction
    |
    v
content entities
    |
    v
visual subject builder
    |
    v
image request builder
    |
    v
image_request
```

其中：

- semantic extraction 负责识别内容语义对象
- visual subject builder 负责转换视觉表达对象
- image request builder 负责补齐风格、用途、规格、优先级

## 9. Phase 0.2 结论

本阶段应固定以下原则：

- 不绑定当前 `plan.json` 字段
- 通过 `Visual Subject` 保护图片系统不受上游结构波动影响
- 将 cover、place、food、scene、experience 都视为语义角色，而不是字段名
- 将兼容性问题集中在映射层，而不是扩散到 provider 或 asset management

当前阶段不包括：

- 实际 parser 实现
- 实际 request builder 实现
- 任意图片生成逻辑
