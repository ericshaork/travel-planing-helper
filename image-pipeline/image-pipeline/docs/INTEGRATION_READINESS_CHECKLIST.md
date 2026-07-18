# INTEGRATION_READINESS_CHECKLIST

## 1. 目标

本文件定义未来 stable `plan.json` 接入 Image Pipeline 前必须满足的条件。

目标是明确：

- 什么情况下 Image Pipeline 可以正式接入 Travel Plan Generator V2
- 什么情况下仍应停留在设计或联调准备阶段

这份 checklist 是接入门槛，不是实现细节说明。

## 2. 总体原则

Image Pipeline 只有在上游内容 artifact 达到“稳定、可引用、可解释、可消费”的前提下，才适合正式接入。

换句话说：

- 不是上游“能产出 JSON”就算 ready
- 而是上游必须能稳定提供图片系统真正需要的语义信息

## 3. 字段稳定性要求

### 3.1 结构稳定

stable `plan.json` 应满足：

- 顶层结构不再频繁重构
- 核心内容对象边界稳定
- 同一类语义对象在不同 trip 中具备一致表达方式

关注点不是字段名字完全不变，而是语义结构稳定。

### 3.2 语义稳定

应能稳定识别以下语义角色：

- trip
- destination
- route or itinerary unit
- POI entity
- food entity
- experience entity

如果这些角色仍经常漂移、合并或拆分，Image Pipeline 不应正式接入。

## 4. Entity ID 要求

Image Pipeline 正式接入前，上游内容应提供稳定引用能力。

建议要求：

- 每个 trip 有稳定 `trip_id`
- 每个可生成图片的核心 entity 有稳定 `entity_id`
- entity 引用在同一 plan version 内唯一
- entity 引用在内容修订时应有清晰延续规则

至少需要稳定支持这些对象的引用：

- POI entity
- food entity
- experience entity
- day or scene unit

原因：

- `image_request` 需要稳定 source ref
- `asset_manifest` 需要回绑到语义对象
- 前端或下游系统需要稳定找到对应图片

## 5. 内容质量要求

即使 schema 稳定，如果内容质量仍不足，也不建议正式接入图片生产。

最低要求包括：

- POI 不明显重复
- food 推荐不明显重复
- 用户类型差异足够明显
- 路线具备可执行性而非泛推荐感
- 体验节点具备视觉表达价值

原因：

- 图片会把内容问题放大
- 如果计划本身不可信，视觉资产会加剧误导而不是提升体验

## 6. 版本管理要求

上游内容在接入前应具备基础版本管理能力。

建议要求：

- plan artifact 拥有明确 `document_version` 或等价版本标识
- 重要内容变更可区分新旧版本
- 图片系统能知道自己基于哪一版内容生成资产

至少需要回答以下问题：

- 当前图片基于哪一版 plan
- 如果 plan 更新，图片是否仍然有效
- 哪些 entity 仍可复用旧图，哪些需要重建

没有版本意识，后续图片回绑会很快失控。

## 7. 图片生成所需信息完整性

Image Pipeline 正式接入前，上游内容应提供足够的信息来构建 Visual Subject。

### 7.1 Cover 所需信息

至少应可提取：

- destination identity
- trip concept or narrative hook
- trip-level summary or title

### 7.2 Place 所需信息

至少应可提取：

- location identity
- place title or descriptor
- enough cultural or spatial detail

### 7.3 Food 所需信息

至少应可提取：

- dish or food identity
- regional context
- enough dining or food description

### 7.4 Scene 所需信息

至少应可提取：

- day or route context
- time-of-day or atmosphere signal
- enough narrative hint to build mood

### 7.5 Experience 所需信息

至少应可提取：

- activity identity
- human participation signal
- emotional or experiential context

如果这些信息长期缺失，Image Pipeline 就算接入，也只能退化成模板化出图。

## 8. 映射层可行性要求

接入前应验证：

- Content Entity 能稳定抽取
- Visual Subject 能稳定构建
- `image_request` 能稳定产出

换句话说，要能跑通这条抽象链路：

```text
stable plan.json
    |
    v
content entities
    |
    v
visual subjects
    |
    v
image_request
```

如果仍然经常需要为单个 trip 写特判，说明还没 ready。

## 9. 回绑能力要求

正式接入前，应明确未来如何把图片结果关联回旅行内容。

至少需要具备：

- trip-level binding capability
- entity-level binding capability
- version-aware binding capability

需要能回答：

- 某张 place 图属于哪个 POI
- 某张 scene 图属于哪一天或哪段路线
- 某张 experience 图属于哪个体验节点

## 10. 运营与审核准备要求

即使还没开始正式批量生产，也建议在接入前确认这些问题有清晰策略：

- 图片审核是否需要人工参与
- 审核失败是否允许自动重试
- 失败资产如何保留历史
- 替换图片如何回绑

这不是要求先实现系统，而是要求在接入前已经有明确策略。

## 11. Ready / Not Ready 判断

### 11.1 可以视为 Ready 的条件

当以下条件大体同时满足时，可认为进入正式接入准备阶段：

- 上游 plan 语义结构稳定
- 核心 entity 有稳定 id
- 内容质量达到可展示水平
- version 信息可追踪
- Visual Subject 可稳定构建
- `image_request` 可稳定生成

### 11.2 应视为 Not Ready 的信号

以下任一情况持续存在时，不建议正式接入：

- 上游经常改核心语义结构
- entity 没有稳定引用
- 内容质量问题仍然明显
- scene 和 experience 信息不足
- 无法判断图片基于哪一版 plan
- 不清楚后续如何回绑资产

## 12. 建议接入步骤

当 checklist 达标后，建议接入顺序如下：

1. 固定 stable plan artifact contract
2. 验证 entity reference strategy
3. 验证 Visual Subject 构建稳定性
4. 验证 `image_request` 产出稳定性
5. 再进入 provider integration 和小规模试运行

注意：

正式接入前，仍不建议直接跳到批量图片生产。

## 13. Phase 0.3 结论

本阶段应明确：

- Image Pipeline 的接入前提是上游稳定，而不是仅仅“已经有 plan.json”
- entity id、版本管理、内容质量、视觉所需信息完整性都属于接入门槛
- 只有当映射链路和回绑链路都可解释时，才适合进入 Phase 1

当前阶段不包括：

- 实际联调
- 实际 provider 接入
- 批量生成试运行
