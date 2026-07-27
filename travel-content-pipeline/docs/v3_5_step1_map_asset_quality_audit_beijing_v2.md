# V3.5 Step1-B2-B2 北京 Map Asset 数据质量审核

## 1. 审核目标

Map Asset QA 必须发生在 Map Resolver 之前，因为 Map Resolver 的职责不是纠正脏数据，而是消费已经可用的地图事实。

如果在进入 Map Resolver 之前不先确认资产文件质量，就会出现几个风险：

- 错误或缺失的 POI 会让后续路线关联失效
- 错误的 route facts 会让移动负担判断失真
- 不稳定的资产层会把问题传递到 GenerationContext 和模型输出

因此本次审核的目标是确认：

```text
北京第一批 Map Asset 是否已经达到作为 Map Resolver 输入层的基础要求
```

## 2. 数据概况

本次审核对象：

- `input/maps_v1/beijing/poi_assets.json`
- `input/maps_v1/beijing/route_facts.json`

当前数据概况：

- POI 数量：9
- Route 数量：6
- 数据来源：`amap`
- 可信等级：`verified`

## 3. POI 审核结果

| POI | 字段 | 结果 |
| --- | --- | --- |
| 故宫博物院 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 景山公园 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 什刹海 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 前门 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 牛街 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 鼓楼 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 南锣鼓巷 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 798艺术区 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |
| 天坛公园 | `id / name / city / latitude / longitude / address / asset_type / source_provider / confidence` 完整 | 通过 |

额外确认：

- 所有 POI 的 `asset_type` 均为 `anchor_poi`
- 所有 POI 的 `source_provider` 均为 `amap`
- 所有 POI 的 `confidence` 均为 `verified`
- 所有 POI 坐标均为非 0 数值

## 4. Route 审核结果

| Route | distance | duration | 结果 |
| --- | --- | --- | --- |
| 故宫博物院 → 景山公园 | 1445m | 19min | 通过 |
| 景山公园 → 什刹海 | 2852m | 38min | 通过 |
| 牛街 → 前门 | 4950m | 66min | 通过 |
| 牛街 → 鼓楼 | 8839m | 118min | 通过 |
| 鼓楼 → 南锣鼓巷 | 1090m | 15min | 通过 |
| 鼓楼 → 798艺术区 | 11150m | 149min | 通过 |

额外确认：

- 所有 route 的 `distance_m` 均大于 0
- 所有 route 的 `duration_min` 均大于 0
- 所有 route 的 `source_provider` 均为 `amap`
- 所有 route 的 `confidence` 均为 `verified`
- 所有 route 的 `from / to` 都能在 `poi_assets.json` 中找到对应 POI

## 5. 自动 QA 结果

自动 QA 脚本：

- `src/map/scripts/validateBeijingMapAssets.ts`

检查项包括：

- 文件存在且可读取
- POI 数量必须为 9
- Route 数量必须为 6
- 每个 POI 字段完整
- 每个 POI 坐标必须为非 0 数字
- 每个 POI 的 `asset_type` 必须为 `anchor_poi`
- 每个 POI 的 `source_provider` 必须为 `amap`
- 每个 POI 的 `confidence` 必须为 `verified`
- 每个 Route 字段完整
- 每个 Route 的 `distance_m` 必须大于 0
- 每个 Route 的 `duration_min` 必须大于 0
- 每个 Route 的 `source_provider` 必须为 `amap`
- 每个 Route 的 `confidence` 必须为 `verified`
- 每条 Route 的 `from / to` 都必须能关联到已有 POI

自动 QA 执行结果：

- 全部通过

## 6. 结论

本次人工审核与自动 QA 结果一致：

```text
北京第一批 Map Asset 已达到作为 Map Resolver 输入层的基础要求。
```

说明：

- 资产文件已经真实存在
- 数据字段完整
- POI 与 Route 关联关系成立
- 来源与置信度统一

这意味着北京第一批 Map Asset 已经具备进入下一步连接设计的前提。
