# ASSET_MANIFEST_CONVENTIONS

## 1. 目标

本文件定义 `asset_manifest` 的使用规范。

目标是让 Image Pipeline 在大规模生产和长期迭代中，能够稳定管理：

- 新版本图片
- 失败任务
- 审核失败图片
- 历史资产

即使未来需要批量处理 1000 篇旅行内容，也应保持 manifest 可追踪、可恢复、可审核、可读取。

## 2. Manifest 的角色

`asset_manifest` 不是图片文件本身，而是 trip 级别的资产控制面。

它的核心职责是：

- 记录有哪些资产
- 记录这些资产当前处于什么状态
- 记录哪个版本当前生效
- 记录哪些资产失败、被替换、被拒绝或归档
- 为前端和下游服务提供稳定索引

因此：

- 文件系统或对象存储保存图片内容
- `asset_manifest` 保存资产事实和状态事实

## 3. Asset 生命周期

### 3.1 生命周期目标

每一个 asset 都应拥有清晰生命周期，而不是“生成成功就结束”。

建议生命周期阶段：

- requested
- queued
- generating
- completed
- review_pending
- approved
- rejected
- replaced
- archived
- failed

### 3.2 生命周期说明

- `requested`
  资产需求已经建立，但尚未进入 provider 执行队列。

- `queued`
  已排队等待生成。

- `generating`
  provider 正在执行。

- `completed`
  已成功生成文件，但尚未完成最终审核判定。

- `review_pending`
  正等待人工或自动审核。

- `approved`
  已通过审核，可作为当前可消费版本。

- `rejected`
  已完成生成，但审核未通过，不应作为默认可消费资产。

- `replaced`
  该版本曾经可用，但已被新版本替换。

- `archived`
  历史版本被保留，但不再参与当前消费。

- `failed`
  生成过程失败，没有形成有效可消费结果。

## 4. 状态流转规则

### 4.1 推荐主路径

推荐主路径如下：

```text
requested
    |
    v
queued
    |
    v
generating
    |
    v
completed
    |
    v
review_pending
    |
    v
approved
```

### 4.2 失败路径

生成失败路径：

```text
queued
    |
    v
generating
    |
    v
failed
```

审核失败路径：

```text
completed
    |
    v
review_pending
    |
    v
rejected
```

替换路径：

```text
approved
    |
    v
replaced
```

归档路径：

```text
replaced
    |
    v
archived
```

### 4.3 状态流转原则

- 一个 trip 下同一逻辑资产可有多个版本
- 同一时间只应有一个 active version
- `approved` 不等于永久版本，后续可被替换
- `rejected` 资产应保留记录，但不参与默认消费
- `failed` 资产应保留失败上下文，方便重试和排查

## 5. 版本替换规则

### 5.1 稳定身份与可变版本

建议区分：

- `asset_id`
- `asset_version`

其中：

- `asset_id` 表示逻辑上的同一资产
- `asset_version` 表示该资产的某一具体生成版本

例如：

- `asset_id = cover_main`
- `asset_version = v1`
- `asset_version = v2`

### 5.2 替换原则

替换不应静默覆盖旧版本。

应采用以下规则：

- 新生成结果创建新版本记录
- 旧版本保留历史状态
- 当前可消费版本通过 `active` 或 `current_version` 标识
- 被替换版本状态改为 `replaced`，必要时再转 `archived`

### 5.3 为什么需要保留旧版本

保留旧版本有几个价值：

- 人工回滚
- 对比不同 provider 效果
- 审核复盘
- 大批量生成时排查系统性问题

## 6. 审核流程规范

### 6.1 审核目标

审核流程用于保证图片：

- 风格符合 Wanderly
- 不存在明显错误
- 没有低质量生成结果
- 不误导用户

### 6.2 审核阶段

推荐审核阶段：

- generation complete
- review pending
- approved or rejected

### 6.3 审核记录建议

Manifest 中建议记录：

- `review_status`
- `reviewed_at`
- `reviewer`
- `review_reason`
- `review_notes`

### 6.4 审核失败后的处理

审核失败不应删除记录。

推荐行为：

- 保留该版本
- 将状态标记为 `rejected`
- 允许重新生成新版本
- 由新版本重新进入审核

这样在大规模批量任务中，审核失败的资产不会丢失上下文。

## 7. 文件命名规则

### 7.1 命名目标

文件命名应满足：

- 可读
- 可追踪
- 可版本化
- 不绑定具体存储系统

### 7.2 推荐命名结构

推荐使用逻辑命名结构：

`<asset_role>_<subject_key>_<variant_or_slot>_<version>.<ext>`

示例：

- `cover_main_v1.png`
- `place_sensoji_main_v1.png`
- `food_monjayaki_main_v2.png`
- `scene_day01_evening_v1.png`
- `experience_river_walk_v1.png`

### 7.3 命名原则

- 文件名表达资产角色
- 文件名表达主体或槽位信息
- 文件名表达版本
- 不将 provider 细节写死到主文件名中

provider 信息更适合记录在 manifest metadata 中。

## 8. 面向 1000 篇旅行内容的管理原则

当系统批量处理 1000 篇旅行内容时，manifest 规范的价值会被放大。

### 8.1 新版本图片管理

需要做到：

- 每个 trip 独立 manifest
- 每个逻辑资产独立 version 链
- 新版本不覆盖旧版本
- active version 可快速定位

### 8.2 失败任务管理

需要做到：

- 失败任务保留记录
- 失败任务拥有明确 error context
- 支持按 trip、asset role、provider 批量分析失败

### 8.3 审核失败图片管理

需要做到：

- 审核失败资产保留历史
- 审核失败资产不参与默认前端消费
- 可继续生成新版本替换

### 8.4 历史资产管理

需要做到：

- 可区分 current、replaced、archived
- 可按时间或状态回溯
- 可在需要时清理物理文件，但逻辑记录不应先丢失

## 9. 前端与下游消费约定

前端或下游系统不应扫描目录来猜测当前可用资产。

推荐约定：

- 消费方先读 `asset_manifest`
- 再按 `asset_role` 和 active version 找资源
- 审核状态不是 `approved` 的资产默认不作为主消费对象

这样可以避免：

- 读到旧版本
- 读到失败版本
- 读到审核未通过图片

## 10. Phase 0.2 结论

本阶段应固定以下规范：

- `asset_manifest` 是 trip 级资产控制面
- 每个 asset 有生命周期和状态流转
- 替换通过新版本实现，而不是覆盖
- 审核失败和生成失败都必须保留记录
- 文件命名要可读、可追踪、可版本化

当前阶段不包括：

- manifest 自动写入实现
- 审核系统实现
- 文件清理策略实现
- 大规模任务调度实现
