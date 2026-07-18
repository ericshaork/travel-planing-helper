# IMAGE_ASSET_STRUCTURE

## 1. 目标

本规范定义 Wanderly Image Pipeline 的图片资产目录结构。

目标不是绑定某一种具体存储实现，而是定义一个稳定的逻辑组织方式，使其同时兼容：

- 本地文件
- 对象存储
- CDN

该结构需要服务于以下场景：

- 批量生成
- 图片替换
- 图片版本管理
- 图片审核
- 前端读取

## 2. 逻辑目录结构

推荐结构：

```text
images/
  trip_id/
    manifest.json
    cover/
    places/
    food/
    scenes/
    experiences/
```

其中：

- `images/` 是逻辑资产根目录
- `trip_id/` 是单个旅行计划的资产集合目录
- `manifest.json` 是该 trip 的资产索引与状态描述
- 各子目录按资产类型分组

## 3. 各目录职责

### 3.1 `manifest.json`

职责：

- 记录 trip 下全部资产的索引
- 记录资产状态、版本、替换关系、审核状态
- 提供前端和下游服务读取资产的单一入口

建议承载的信息：

- asset id
- asset role
- source object ref
- current active version
- available files
- review status
- provider metadata

### 3.2 `cover/`

职责：

- 存放旅行计划首图
- 支持候选图与最终启用图共存

适用内容：

- cover main
- cover variants
- cover replacements

### 3.3 `places/`

职责：

- 存放 POI 相关视觉资产
- 支持一个 trip 下多个地点对应多张图

适用内容：

- single POI images
- multiple variant images for the same POI

### 3.4 `food/`

职责：

- 存放美食相关视觉资产
- 支持不同餐食、店铺、地域特色食物的图片组织

### 3.5 `scenes/`

职责：

- 存放每日行程氛围图
- 面向 itinerary scene、route moment、time-of-day atmosphere

### 3.6 `experiences/`

职责：

- 存放体验类图片
- 面向活动、情绪记忆点、沉浸式时刻

## 4. 如何支持批量生成

批量生成支持的关键不在于单个文件夹名字，而在于 trip 级别与 asset 级别的可枚举性。

建议原则：

- 每个 `trip_id` 独立成组
- 同一 trip 下按 asset role 分组
- `manifest.json` 作为批量任务结果的统一索引
- 每个资产使用稳定 `asset_id`

这样批量任务可以：

- 遍历多个 trip
- 在单 trip 内遍历多个 asset request
- 在失败或中断后按 asset id 局部重试

## 5. 如何支持图片替换

图片替换应当是追加新版本，而不是静默覆盖旧文件。

建议原则：

- 同一资产保持稳定 `asset_id`
- 替换图片时生成新的 version
- `manifest.json` 记录当前 active version
- 保留旧版本供回滚、审核或对比

这样可以支持：

- 人工替换
- 重新生成
- 不同 provider 结果比较

## 6. 如何支持图片版本管理

建议在逻辑层维护：

- `asset_id`
- `version`
- `active`
- `replacement_of`

文件命名不需要和某种存储强绑定，但应保证人类可读和程序可定位。

示例：

```text
images/
  trip_tokyo_family_001/
    cover/
      cover_main_v1.png
      cover_main_v2.png
    places/
      poi_sensoji_main_v1.png
```

无论底层是本地路径、对象存储 key，还是 CDN 地址，都应能映射回同样的逻辑结构。

## 7. 如何支持图片审核

审核既可能发生在生成后，也可能发生在替换后。

因此目录结构需要支持：

- 候选图保留
- 当前启用图标识
- 审核状态记录

推荐做法：

- 文件本身保存为普通资产对象
- 审核状态统一记录在 `manifest.json`
- 如后续需要独立审核产物，可在逻辑层扩展 review metadata，而不改变主目录结构

审核状态可包括：

- pending
- approved
- rejected
- flagged

## 8. 如何支持前端读取

前端不应直接依赖底层文件命名规则，而应优先读取 `manifest.json` 提供的稳定索引。

推荐读取方式：

1. 前端按 `trip_id` 获取资产 manifest。
2. 前端根据 asset role 查找 active 资产。
3. 前端读取适合当前场景的文件引用，例如原图、压缩图或 web 版本。

这样做的好处：

- 前端不需要知道底层存储是本地还是对象存储
- 后端可以自由切换路径、bucket、CDN 域名
- 可在不改前端协议的前提下扩展版本和审核逻辑

## 9. 存储无关原则

本规范是逻辑目录规范，不是物理存储实现规范。

因此：

- 在本地文件系统中，它可以对应真实目录
- 在对象存储中，它可以对应对象 key 前缀
- 在 CDN 中，它可以对应可公开访问的资源路径

需要稳定的是：

- trip 级组织方式
- asset role 分组方式
- manifest 索引方式

不需要提前写死的是：

- 本地路径格式
- bucket 名称
- CDN 域名
- URL 生成规则
