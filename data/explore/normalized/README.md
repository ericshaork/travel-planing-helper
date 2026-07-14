# Explore Normalized Data

## 目录说明

- `source/` 保存原始 AI 生成结果，保持只读，不直接给前端使用。
- `normalized/` 是 Wanderly v1.8 Explore 的标准化内容层。

## 当前产物

- `explore_archives_v1.json`
  - 统一的标准字段输出
  - 用于后续导入、审计和前端统一读取
- `explore_archive_image_manifest.json`
  - 用于补图计划、图片接线和优先级排期

## 使用原则

- 不要手改 normalized JSON。
- 需要更新时，请重新运行：

```bash
node --experimental-strip-types scripts/normalize-explore-archives.ts
```

## 数据治理约定

- 原始目录保留 source of truth
- normalized 层负责 slug 去重、externalId 生成、theme / recommendedFor / highlights 推导
- 图片字段和 image manifest 在 normalized 层统一治理
