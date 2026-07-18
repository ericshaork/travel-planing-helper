# PIPELINE_STATE_MACHINE

## 1. 目标

本文件定义 Image Pipeline 的生命周期状态机。

本状态机覆盖四类核心对象：

- image request
- generation job
- asset
- review

目标是在批量生产时，清晰管理：

- 成功
- 失败
- 重试
- 替换
- 审核

当前阶段只定义状态与关系，不实现调度逻辑。

## 2. 为什么需要状态机

Image Pipeline 不只是“一次生成一张图”。

在真实批量场景中，会发生：

- 一个 trip 对应多个图片请求
- 一个图片请求触发多个 generation job
- 一个 job 失败后需要重试
- 一个 asset 生成成功后仍可能审核失败
- 一个 approved 版本后续仍可能被替换

没有状态机，系统很难在 1000 篇内容规模下保持可追踪和可恢复。

## 3. 四类对象

### 3.1 Image Request

作用：

- 表达“应该生成什么图”

它是业务层需求对象，不代表真正的 provider 执行任务。

### 3.2 Generation Job

作用：

- 表达“某个 provider 正在执行哪次生成”

一个 image request 可以对应一个或多个 generation job。

### 3.3 Asset

作用：

- 表达“生成出的某个可管理视觉资产版本”

asset 是消费层对象，和文件、版本、替换关系关联。

### 3.4 Review

作用：

- 表达“这个资产版本是否可被接受”

review 决定某个 asset 是否能成为默认消费版本。

## 4. Image Request 状态机

### 4.1 推荐状态

- `draft`
- `ready`
- `submitted`
- `partially_fulfilled`
- `fulfilled`
- `failed`
- `cancelled`

### 4.2 状态说明

- `draft`
  请求已构建但尚未进入执行流程。

- `ready`
  请求信息完整，可提交给生成层。

- `submitted`
  已创建 generation job。

- `partially_fulfilled`
  已拿到部分候选或部分目标结果，但尚未全部满足。

- `fulfilled`
  请求目标已满足，至少存在一个可消费结果。

- `failed`
  当前执行路径未产生有效结果。

- `cancelled`
  请求被主动终止。

### 4.3 推荐流转

```text
draft
    |
    v
ready
    |
    v
submitted
    |
    v
partially_fulfilled
    |
    v
fulfilled
```

失败支路：

```text
submitted
    |
    v
failed
```

## 5. Generation Job 状态机

### 5.1 推荐状态

- `queued`
- `running`
- `succeeded`
- `failed`
- `retryable_failed`
- `cancelled`

### 5.2 状态说明

- `queued`
  provider 任务已提交，等待执行。

- `running`
  provider 正在执行生成。

- `succeeded`
  provider 已成功返回结果。

- `failed`
  本次任务失败，且不建议继续自动重试。

- `retryable_failed`
  本次任务失败，但允许自动或人工触发重试。

- `cancelled`
  任务被中断或主动终止。

### 5.3 重试原则

重试应作用于 generation job，而不是直接重写 image request 或 asset。

建议：

- 同一 image request 可关联多个 job attempt
- 每次重试产生新的 job record
- 原始失败 job 必须保留

这样能保证：

- 可分析 provider 稳定性
- 可排查参数问题
- 可恢复历史上下文

## 6. Asset 状态机

### 6.1 推荐状态

- `created`
- `stored`
- `review_pending`
- `approved`
- `rejected`
- `replaced`
- `archived`

### 6.2 状态说明

- `created`
  已从 generation result 建立 asset record。

- `stored`
  已完成资产文件落盘或稳定引用登记。

- `review_pending`
  等待审核。

- `approved`
  审核通过，可被消费。

- `rejected`
  审核未通过，不应被默认消费。

- `replaced`
  曾经可用，但已被更高优先级或更新版本替换。

- `archived`
  已转为历史资产，仅保留追踪价值。

### 6.3 推荐流转

```text
created
    |
    v
stored
    |
    v
review_pending
    |
    v
approved
    |
    v
replaced
    |
    v
archived
```

审核失败支路：

```text
review_pending
    |
    v
rejected
```

## 7. Review 状态机

### 7.1 推荐状态

- `pending`
- `approved`
- `rejected`
- `flagged`

### 7.2 状态说明

- `pending`
  尚未完成审核。

- `approved`
  可进入默认消费链路。

- `rejected`
  不可作为默认资产。

- `flagged`
  存在可疑问题，需要进一步处理或人工复核。

## 8. 对象关系

推荐对象关系如下：

```text
Image Request
    |
    +-- Generation Job attempt 1
    |
    +-- Generation Job attempt 2
    |
    v
Asset version 1
    |
    v
Review
```

进一步扩展后可能变成：

```text
Image Request
    |
    +-- Job A -> Asset v1 -> Review rejected
    |
    +-- Job B -> Asset v2 -> Review approved
    |
    +-- Job C -> Asset v3 -> Review approved -> replace v2
```

这个结构能清晰回答：

- 哪个请求触发了哪些 job
- 哪个 job 产生了哪个 asset
- 哪个 asset 当前是 active version
- 哪个版本被审核拒绝

## 9. 批量生产时的处理原则

### 9.1 成功

成功不只意味着 provider 返回图片，还意味着：

- image request 达到 fulfilled
- 至少一个 asset 进入 approved
- 该 trip 的 manifest 可标记当前 active asset

### 9.2 失败

失败应分层处理：

- request failure
- job failure
- asset rejection

不要把所有失败都混成一种“失败”。

### 9.3 重试

推荐只在 generation job 层重试。

这样：

- request 的业务需求不变
- asset 的历史不会丢失
- retry 行为可审计

### 9.4 替换

替换应发生在 asset 层。

规则：

- 新资产版本 approved 后才有资格替换旧版本
- 旧版本转为 `replaced`
- 是否进一步变为 `archived` 由资产策略决定

### 9.5 审核

审核应发生在 asset 层，而不是 request 层或 provider 层。

原因：

- provider 只负责生成
- request 只负责需求
- asset 才是消费对象

## 10. 推荐批量状态观察维度

在大量 trip 并行时，建议能按以下维度观察状态：

- by trip
- by asset role
- by provider
- by request status
- by job failure type
- by review outcome

这样后续即使没有立刻实现监控系统，状态模型本身也已经为可观测性留好结构。

## 11. Phase 0.3 结论

本阶段应固定以下原则：

- request、job、asset、review 是四个不同层级的对象
- 成功、失败、重试、替换、审核必须按层建模
- 重试属于 job 层
- 替换属于 asset 层
- 审核作用于 asset 结果，而不是 provider 调用本身

当前阶段不包括：

- 状态机代码实现
- 调度器实现
- 自动重试策略实现
- 审核系统实现
