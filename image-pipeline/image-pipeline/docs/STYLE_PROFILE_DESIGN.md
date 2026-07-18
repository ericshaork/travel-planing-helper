# STYLE_PROFILE_DESIGN

## 1. 目标

本设计用于定义 Wanderly Image Pipeline 的风格体系。

style profile 的职责不是直接绑定某一种图片模型，而是作为视觉意图的稳定中间层：

```text
style profile
    |
    v
prompt builder
    |
    v
model
```

这样可以让 Wanderly 在不修改上游业务语义的前提下，替换不同模型、不同 prompt 模板和不同 provider。

## 2. 设计原则

style profile 应满足以下原则：

- 独立于具体模型
- 独立于当前不稳定的 plan 字段
- 面向视觉角色而不是面向单次 prompt 文案
- 既能表达品牌感，也能表达资产类型差异
- 能被 prompt builder 稳定消费

## 3. style_profile_id 设计

每一个 style profile 都应拥有稳定标识。

推荐格式：

`brand_family_variant_version`

示例：

`wanderly_editorial_travel_v1`

含义：

- `wanderly`: 品牌命名空间
- `editorial_travel`: 风格家族
- `v1`: 版本号

后续可扩展：

- `wanderly_editorial_travel_v2`
- `wanderly_realistic_place_v1`
- `wanderly_food_story_v1`

## 4. Profile 结构建议

一个 style profile 建议包含以下字段：

- `style_profile_id`
- `asset_role`
- `positioning`
- `style_keywords`
- `mood_keywords`
- `composition_rules`
- `subject_treatment`
- `avoid_rules`
- `color_tendency`
- `realism_level`

说明：

- `asset_role` 用于约束适用资产类型
- `style_keywords` 用于表达风格方向
- `mood_keywords` 用于表达情绪和观感
- `composition_rules` 用于指导构图
- `subject_treatment` 用于说明主体应如何呈现
- `avoid_rules` 用于过滤不符合 Wanderly 的表现方式

## 5. Wanderly 总体品牌方向

Wanderly 的整体视觉气质应融合：

- 旅行杂志
- 私人手帐

这意味着风格体系既要有 editorial 感，也要保留记忆感、温度感和旅行中的在场感。

统一要求：

- 不要过于模板化旅游海报
- 不要过于廉价的 AI 质感
- 不要过度 stock photo 化
- 强调地点个性、文化细节和旅行体验

## 6. Asset Role Style Profiles

### 6.1 cover

定位：

- 旅行杂志封面

关键词：

- watercolor
- hand drawn
- collage
- vintage travel poster
- oriental travel aesthetic

建议表达：

- 强调目的地识别度
- 具有封面感和叙事钩子
- 允许适度艺术化和拼贴感
- 适合首图、卡片和详情页头图

推荐 profile 示例：

- `wanderly_editorial_travel_v1`

### 6.2 place

定位：

- 地点视觉

关键词：

- realistic photography
- location identity
- cultural detail

建议表达：

- 优先突出地点辨识度
- 强调空间气质、建筑特征、街道细节或地貌特征
- 保持真实摄影感，可接受轻微艺术化处理
- 避免普通游客打卡照和低辨识度风景图

推荐 profile 示例：

- `wanderly_place_identity_v1`

### 6.3 food

定位：

- 美食摄影

关键词：

- professional food photography
- regional culture
- atmosphere

建议表达：

- 食物主体清晰
- 强调地方文化和餐桌氛围
- 可以体现器皿、店内环境、光线和上菜场景
- 避免电商式孤立摆拍

推荐 profile 示例：

- `wanderly_food_story_v1`

### 6.4 scene

定位：

- 旅行氛围

关键词：

- travel diary
- emotional atmosphere
- daily moment

建议表达：

- 强调晨间、午后、傍晚、夜晚等时间氛围
- 更像旅行中会记住的一瞬间，而不是景点宣传图
- 支持路线阅读时的节奏感和沉浸感

推荐 profile 示例：

- `wanderly_scene_diary_v1`

### 6.5 experience

定位：

- 旅行体验

关键词：

- immersive
- human activity
- memory

建议表达：

- 强调人的参与感
- 更关注旅行体验中的动作、关系、感受和记忆点
- 可表现互动、手作、行走、观看、用餐、休憩等体验瞬间

推荐 profile 示例：

- `wanderly_experience_memory_v1`

## 7. Prompt Builder 与 Style Profile 的关系

style profile 不直接等于最终 prompt。

它应先被 Prompt Builder 消化，再由 Prompt Builder 结合主体信息输出结构化 prompt spec。

关系如下：

```text
source subject
    +
style profile
    +
output spec
    |
    v
prompt builder
    |
    v
normalized prompt spec
    |
    v
model adapter
```

在这个设计中：

- style profile 提供稳定风格约束
- prompt builder 负责拼装、裁剪和翻译
- model adapter 负责适配具体模型语法

## 8. 为什么不要绑定具体模型

原因一：未来 provider 会变化。

OpenAI Image、Flux、Midjourney、Stable Diffusion 和国内模型的输入习惯并不一致。

原因二：同一风格在不同模型中需要不同表达方式。

如果 style profile 直接写成某个模型专用 prompt，后续替换 provider 的成本会很高。

原因三：品牌风格应高于模型实现。

Wanderly 需要先定义自己想要什么视觉语言，再由不同模型去逼近它，而不是反过来被模型能力约束品牌表达。

## 9. 当前 Phase 0 的定位

当前阶段只定义：

- style profile 结构
- asset role 的风格方向
- style_profile_id 规则
- style profile 到 prompt builder 的关系

当前阶段不包括：

- 具体 prompt 模板实现
- 具体 provider prompt 转换
- 任何图片模型 API 调用
- 实际图片生成测试
