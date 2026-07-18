# ASSET_SOURCE_STRATEGY

## 1. 目标

本文件定义 Wanderly Visual Asset 的来源体系。

当前阶段的重点不是继续讨论“如何生成图片”，而是明确 Image Pipeline 在产品层面的真实角色：它需要管理多种来源的视觉资产，而不只是充当一个图片生成器。

## 2. 为什么现在应该理解为 Visual Asset Pipeline

随着产品决策逐步明确，Wanderly 已经不是单纯要“从文本生成图片”。

它实际需要解决的是：

- 不同类型的图片应采用不同来源策略
- 已有旧资产需要纳入统一管理
- 免费商用图库照片需要进入同一资产体系
- AI 生成结果、外部照片、历史资产都要被同一套 manifest 和目录逻辑管理

因此现在更准确的理解应该是：

- `Image Pipeline` 在工程命名上仍然成立
- 但在产品语义上，它已经更接近 `Visual Asset Pipeline`

换句话说：

- 它不只生成图片
- 它还要组织、记录、复用、替换、管理和消费视觉资产

## 3. Hybrid Visual Strategy

Wanderly 当前采用混合模式：

- Hybrid Visual Strategy

这意味着视觉资产不来自单一来源，而是根据资产类型、内容目标和质量要求选择最合适的来源。

当前产品目标排序为：

1. 提升美观
2. 帮助用户决策
3. 帮助用户理解地点
4. 营造旅行幻想
5. 增强品牌识别

这个排序直接决定了来源策略：

- 不是所有图片都适合 AI
- 也不是所有图片都必须是真实照片
- 不同资产角色应该采取不同默认来源

## 4. 三类资产来源

当前建议统一定义三类来源：

### 4.1 generated

定义：

- 由 AI 图片生成系统产出的视觉资产

适用场景：

- 难以稳定获得真实图片的氛围图
- 需要统一品牌风格的封面图
- 需要补足真实照片覆盖不足的体验和情绪表达

特点：

- 风格可控
- 统一性强
- 适合规模化
- 对模型质量和 prompt 体系依赖较强

### 4.2 external

定义：

- 来自外部照片来源的资产

当前阶段限定：

- 上线前只使用免费商用图库

适用场景：

- 地点理解优先的 place 图
- 食物真实感优先的 food 图
- 需要真实参考感的体验图片

特点：

- 真实性强
- 对用户决策帮助更直接
- 风格统一难度更高
- 版权和来源记录要求更高

### 4.3 existing

定义：

- 团队已经拥有并确认可用的现有图片资产

当前重点对象：

- 已经整理过的旧 GPT 图片资产

特点：

- 已具备内部可用性
- 已有人工质量判断
- 应优先纳入统一管理，而不是作为临时散落资源继续存在

## 5. Legacy Approved Assets

### 5.1 定义

当前已确认：

- 旧 GPT 图片资产已经按计划或城市分类整理
- 已经过人工质量把控
- 未来定位为正式生产资产
- 需要进入 Image Pipeline 统一管理
- 不需要重新审核

因此这类资产应统一定义为：

- `Legacy Approved Assets`

### 5.2 含义

Legacy Approved Assets 不是“历史废弃资源”，而是：

- 已有生产价值的正式资产
- 在审核状态上应视为已批准
- 在来源属性上属于 `existing`

### 5.3 为什么要单独命名

单独命名的好处：

- 方便和新生成资产区分
- 方便 manifest 中表达来源和审核状态差异
- 方便未来复用、迁移、追踪和优先消费

## 6. 不同 asset_role 的默认来源策略

### 6.1 cover

默认来源策略：

- generated 为主
- existing 优秀旧资产可复用

原因：

- cover 需要更强风格统一性
- cover 需要更强品牌识别和美观表达
- cover 更适合采用浅色调、水彩风和私人旅行手帐感

结论：

- `generated` primary
- `existing` secondary

### 6.2 place

默认来源策略：

- external 真实照片为主
- generated 艺术化补充

原因：

- place 图首先承担“帮助用户理解地点”的职责
- 用户对地点的真实感和辨识度要求更高
- AI 图可用于补足真实素材不足或做风格补充

结论：

- `external` primary
- `generated` secondary

### 6.3 food

默认来源策略：

- generated 与 external 结合
- 但以 external 真实照片为主

原因：

- food 图既要真实可信，也要保持美观和氛围感
- 真实照片更有助于用户判断食物特征
- AI 可在缺图时补足风格一致性或氛围表达

结论：

- `external` primary
- `generated` secondary

### 6.4 scene

默认来源策略：

- generated

原因：

- scene 图本质上是旅行氛围图
- 它的主要目标是增强阅读体验、营造情绪和旅行幻想
- 真实图库往往难以稳定匹配具体 itinerary 氛围

结论：

- `generated` primary

### 6.5 experience

默认来源策略：

- generated 与 external 结合

原因：

- experience 既需要人的参与感，也需要一定真实感
- 有些体验可用真实照片强化可信度
- 有些体验则更适合 AI 补足沉浸感和情绪表达

结论：

- `generated` plus `external`

## 7. 对当前网站视觉风格的影响

Wanderly 当前网站视觉方向已确认：

- 偏浅色调
- 水彩风
- personalized travel journal

这意味着：

- generated 资产需要优先贴合该风格
- external 与 existing 资产进入系统后，也应在选择层面尽量维持整体一致性

注意：

- 这不意味着所有图片都强行“水彩化”
- place 和 food 在真实性更重要时，仍然应允许真实照片保持照片感

因此风格策略不是单一模板，而是：

- 风格一致性优先用于 cover 和 scene
- 真实可信优先用于 place 和 food
- experience 处于两者之间

## 8. 旧资产如何进入统一资产体系

Legacy Approved Assets 进入统一体系时，建议遵循以下原则：

### 8.1 进入同一资产目录逻辑

它们应进入与新资产相同的逻辑目录结构中，例如：

- trip-level grouping
- asset_role grouping
- manifest-driven lookup

### 8.2 进入同一 asset manifest 体系

即使这些资产不是由当前 pipeline 生成，也应为它们建立标准 asset record。

这样可以保证：

- 前端读取方式统一
- 后续替换策略统一
- 历史和新资产可在同一体系下共存

### 8.3 在来源和审核状态上保留差异

Legacy Approved Assets 应明确保留：

- source type = existing
- review status = approved
- provenance metadata = legacy approved

这样既统一管理，又不会抹掉来源差异。

## 9. 对 asset_manifest 的影响

当前阶段不修改代码和 schema，但在设计上，asset manifest 未来应能表达以下信息：

### 9.1 来源类型

每个 asset record 应能区分：

- generated
- external
- existing

### 9.2 审核状态差异

generated 资产通常需要进入 review 流程。

Legacy Approved Assets 则应允许直接进入：

- approved

### 9.3 资产来源元信息

manifest 未来应可记录：

- source type
- ingestion mode
- legacy flag
- external attribution metadata

### 9.4 统一消费，不统一来源

manifest 的目标不是抹平来源差异，而是：

- 用统一结构消费不同来源资产
- 同时保留可追溯来源信息

## 10. 当前阶段的产品建议

在上线前阶段，最合理的资产策略是：

- cover 以 AI 生成为主
- place 以免费商用真实照片为主
- food 以真实照片为主，AI 补充
- scene 以 AI 生成
- experience 混合使用
- 旧 GPT 资产作为 Legacy Approved Assets 纳入正式资产体系

这套策略与当前目标高度一致：

- 控制质量
- 保持风格统一
- 支持短期半自动生产
- 为中长期扩展到 500~1000 篇做准备
