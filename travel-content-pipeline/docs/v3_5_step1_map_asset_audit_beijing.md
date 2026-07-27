# V3.5 Step1-A Map Asset Audit: Beijing

## 1. Audit Goal

V3.5 的第一步先做北京地图资产审计，不是为了补更多文案，而是为了先回答一个更基础的问题: 当前北京精品样板里，哪些地点和移动关系已经有真实地图事实支撑，哪些还只是内容层估算。

原因很直接:

- AI 文案可以写得合理，但路线距离、跨区成本和可达性一旦失真，用户体验会明显下降。
- 旅行计划的可信度，首先建立在地点存在、移动可行、时间负担合理这三类事实之上。
- 北京样板已经进入 context-based 生成阶段，如果 `map_context` 本身有缺口，后续再扩 prompt 或扩城市，只会把不稳定放大。

本次审计只基于当前仓库中的真实文件，不引入任何额外假设。

## 2. Current Map Data Architecture

当前 V3.4 的地图事实进入路径是:

```text
Context Selector
        |
        ↓
GenerationContext
        |
        ↓
DeepSeek
        |
        ↓
Quality Validation
```

地图相关事实当前统一进入 `GenerationContext.map_context`，核心字段包括:

- `verified_pois`
- `route_facts`
- `transfer_burden`
- `cluster_warnings`
- `route_feasibility_notes`

这意味着当前系统里真正会约束模型路线表达的，不是城市文案，不是 output JSON 本身，而是 `map_context` 里被附加进去的事实。

## 3. Current Source Classification

当前北京样板里实际存在的地点相关来源，可以分成两类: 地图事实来源，和内容选择来源。

### 3.1 Map Fact Sources

| 来源 | 说明 | 可信程度 | 当前状态 |
| --- | --- | --- | --- |
| `amap` | 高德地图开放平台 Web 服务 API 返回后标准化进入 `map_context` | 高 | 已接入，但目前只覆盖极小范围 |
| `selector_estimate` | Context Selector 在选择阶段手写的估算地点与移动段 | 中低 | 已使用，待真实地图替换 |

### 3.2 Content / Selection Sources

| 来源 | 说明 | 可信程度 | 当前状态 |
| --- | --- | --- | --- |
| `input/cities_v3/beijing.json` | 城市内容知识，提供片区、POI、推荐时长等编辑信息 | 中 | 已接入，但不是地图真值源 |
| `src/context/selectContext.ts` 静态候选库 | V3.4 手写的 district / poi / food / guidance 候选集合 | 中 | 已接入，但主要解决内容分化，不解决坐标和路线真值 |
| 输出 plan JSON | 生成结果中出现的地点、餐饮和移动描述 | 低 | 只能反映“模型写了什么”，不能反推为地图事实 |

补充说明:

- 本次精确检索 `input/cities_v3/beijing.json`，未发现 `latitude`、`longitude`、`source_provider`、`distance_meters`、`duration_minutes` 这类地图真值字段。
- 因此，`beijing.json` 当前是内容知识源，不是可直接用于路线真实性判断的地图事实源。

## 4. Beijing Sample Map Asset Table

本节基于三个输出文件审计:

- `output/beijing_v34_selected_context_test/beijing_couple_first_visit_autumn_v34.json`
- `output/beijing_v34_selected_context_test/beijing_student_food_winter_v34.json`
- `output/beijing_v34_selected_context_test/beijing_solo_revisit_spring_v34.json`

状态定义:

- `verified`: 当前已在 `map_context` 中以 `source_provider: amap` 出现
- `estimated`: 当前已在 `map_context` 中以 `source_provider: selector_estimate` 出现
- `content_only`: 当前只出现在内容层或输出层，没有进入当前样本的地图事实层

### 4.1 Couple Sample

| 样本 | 地点 | 类型 | 来源 | 状态 |
| --- | --- | --- | --- | --- |
| couple | 故宫博物院 | POI | `amap` | verified |
| couple | 什刹海 | POI | `amap` | verified |
| couple | 故宫博物院 -> 什刹海 | route | `amap` | verified |
| couple | 景山公园 | POI | `content_only` | content_only |
| couple | 天坛公园 | POI | `content_only` | content_only |
| couple | 大栅栏侧巷与老街纹理 | POI | `content_only` | content_only |
| couple | 798 艺术区 | POI | `content_only` | content_only |
| couple | 什刹海胡同晚餐 | food | `content_only` | content_only |
| couple | 大栅栏侧巷咖啡与烘焙 | food | `content_only` | content_only |

该样本在路线文本中的主要地点关系:

- 故宫博物院 -> 景山公园 -> 什刹海
- 天坛公园 -> 前门 / 大栅栏
- 798 艺术区单独成天

### 4.2 Student Sample

| 样本 | 地点 | 类型 | 来源 | 状态 |
| --- | --- | --- | --- | --- |
| student | 牛街 | POI | `selector_estimate` | estimated |
| student | 鼓楼 | POI | `selector_estimate` | estimated |
| student | 牛街 -> 鼓楼 | route | `selector_estimate` | estimated |
| student | 牛街清真美食主轴 | POI | `content_only` | content_only |
| student | 大栅栏侧巷与老街纹理 | POI | `content_only` | content_only |
| student | 鼓楼到南锣的街区慢行 | POI | `content_only` | content_only |
| student | 天坛公园 | POI | `content_only` | content_only |
| student | 牛街早餐 | food | `content_only` | content_only |
| student | 牛街铜锅涮肉 | food | `content_only` | content_only |
| student | 鼓楼周边轻小吃与咖啡 | food | `content_only` | content_only |
| student | 前门传统小吃 | food | `content_only` | content_only |

该样本在路线文本中的主要地点关系:

- 牛街早餐 -> 牛街铜锅涮肉 -> 前门 / 大栅栏
- 鼓楼 -> 南锣慢行
- 天坛 -> 前门传统小吃

### 4.3 Solo Sample

| 样本 | 地点 | 类型 | 来源 | 状态 |
| --- | --- | --- | --- | --- |
| solo | 鼓楼 | POI | `selector_estimate` | estimated |
| solo | 798 艺术区 | POI | `selector_estimate` | estimated |
| solo | 鼓楼 -> 798 | route | `selector_estimate` | estimated |
| solo | 鼓楼到南锣的街区慢行 | POI | `content_only` | content_only |
| solo | 什刹海湖边步行段 | POI | `content_only` | content_only |
| solo | 798 艺术区 | POI | `content_only` + `selector_estimate` | mixed |
| solo | 鼓楼胡同咖啡馆 | food | `content_only` | content_only |
| solo | 鼓楼附近胡同小馆 | food | `content_only` | content_only |
| solo | 什刹海胡同家常菜馆 | food | `content_only` | content_only |
| solo | 798 园区咖啡馆 | food | `content_only` | content_only |
| solo | 将台路简餐 | food | `content_only` | content_only |

该样本在路线文本中的主要地点关系:

- 鼓楼 -> 南锣支巷慢行
- 什刹海黄昏片段
- 鼓楼 / 老城片区 -> 798 艺术区
- 798 -> 将台路简餐

## 5. Audit Findings

### 5.1 Current Map Source Summary

当前系统里真正作为地图事实进入模型约束层的来源，只有两种:

- `amap`
- `selector_estimate`

`beijing.json` 和 `selectContext.ts` 中的静态候选库，当前解决的是内容选择与表达分化，不是路线真实性。

### 5.2 Verified / Estimated Counts

按当前三个 selected context 样本去重统计:

- 已有 `amap` verified 的唯一地点: 2 个
  - 故宫博物院
  - 什刹海
- 已有 `amap` verified 的 route segment: 1 条
  - 故宫博物院 -> 什刹海
- 当前仍为 `selector_estimate` 的唯一地点: 3 个
  - 牛街
  - 鼓楼
  - 798 艺术区
- 当前仍为 `selector_estimate` 的 route segment: 2 条
  - 牛街 -> 鼓楼
  - 鼓楼 -> 798

### 5.3 Biggest Risk

当前最大风险不是“完全没有地图接入”，而是“地图真实性覆盖范围与内容覆盖范围严重不对称”。

具体表现:

- couple 样本已经有 1 条真实移动负担约束，但样本里大量实际使用的地点仍无真实坐标或路线事实。
- student 样本的核心价值是“冬季美食主轴”，但牛街、前门、大栅栏、暖胃主餐之间的关系仍主要停留在估算或内容层。
- solo 样本最依赖“自由停顿 + 跨区对照”，但鼓楼 -> 798 仍是估算段，什刹海与咖啡 / 书店 / 看展停顿也未进入真实地图层。

这意味着:

- 模型现在已经会被地图事实约束，但只在少量片段上被约束。
- 其余大部分片段仍可能在“文案合理”和“路径真实”之间出现错位。

## 6. Gap Analysis

以下缺口只基于当前代码和输出，不做额外猜测。

| 地点 / 关系 | 当前情况 | 问题 | 优先级 |
| --- | --- | --- | --- |
| 牛街 | 仅 `selector_estimate` | student 样本核心片区，但没有真实坐标与可信 POI 事实 | 高 |
| 鼓楼 | 仅 `selector_estimate` | student / solo 高频入口点，但没有真实坐标 | 高 |
| 798 艺术区 | 仅 `selector_estimate` | solo 样本核心现代片区，但没有真实坐标与真实到达关系 | 高 |
| 牛街 -> 鼓楼 | 仅 `selector_estimate` | student 样本跨区移动段，目前不能作为真实时间依据 | 高 |
| 鼓楼 -> 798 | 仅 `selector_estimate` | solo 样本跨区切换核心段，目前不能作为真实时间依据 | 高 |
| 前门 / 大栅栏 | 只在内容层与输出层出现 | couple / student 共用高频片区，但未进入 verified map facts | 高 |
| 景山公园 | 只在内容层与输出层出现 | couple 样本首日核心过渡点，缺少坐标与周边关系 | 中 |
| 天坛公园 | 只在内容层与输出层出现 | couple / student 样本使用，但没有路线时间支持 | 中 |
| 南锣相关支巷慢行 | 只在内容层与输出层出现 | student / solo 都依赖街区纹理，但没有真实片区锚点 | 中 |
| 什刹海在 solo context 中的复用 | 地点本身已在 couple 中 verified，但 solo context 未复用 | 事实层复用不一致，容易导致样本间约束强弱不均 | 中 |
| 晚餐 / 咖啡 / 小吃具体落点 | 基本都在内容层 | 当前可以支撑文案，不足以支撑真实“去哪家 / 离多远 / 是否顺路” | 低 |
| 将台路简餐 | 只在 solo 输出层出现 | 属于收尾级微锚点，当前无地图事实 | 低 |

## 7. What Must Be Backfilled First

如果 V3.5 继续以“先提高北京精品样板可信度”为目标，优先补的不是所有餐厅，而是最能改变路线真实性判断的核心锚点和跨区段:

### High Priority

- 牛街
- 鼓楼
- 798 艺术区
- 前门 / 大栅栏
- 牛街 -> 鼓楼
- 鼓楼 -> 798

### Medium Priority

- 景山公园
- 天坛公园
- 南锣相关支巷慢行锚点
- solo context 对 什刹海 verified fact 的复用

### Low Priority

- 具体咖啡馆 / 书店 / 小馆
- 晚餐收尾点
- 将台路简餐等尾部餐饮锚点

## 8. V3.5 Step1-B Suggestion

本节只提出设计建议，不修改代码。

### 8.1 Add Map Resolver Between Selector and GenerationContext

建议未来结构改成:

```text
Selector
   ↓
地点选择
   ↓
Map Resolver
   ↓
高德 API
   ↓
Map Context
```

这样可以把“先选什么内容”和“再核实这些地点的地图真实性”拆开，避免在 `selectContext.ts` 里继续累积手写估算。

### 8.2 Normalize Route Facts

建议 future map asset output 统一成如下字段:

```json
{
  "id": "",
  "from": "",
  "to": "",
  "mode": "",
  "distance_m": "",
  "duration_min": "",
  "source_provider": "",
  "confidence": ""
}
```
建议语义:

- `source_provider`: `amap` / `selector_estimate` / future providers
- `confidence`: `verified` / `estimated` / `partial`

### 8.3 Suggested Resolver Responsibility

未来 Map Resolver 至少负责:

- 把 selected POIs 映射成真实可识别地点
- 补齐坐标
- 补齐关键 route segments 的真实距离与时间
- 判断哪些移动段可以进入 `transfer_burden`
- 区分 verified 与 estimated，避免混写

### 8.4 Suggested Scope for First Backfill Batch

第一批真实地图补全建议只覆盖北京三类样板最核心的 6 到 10 个锚点:

- 故宫博物院
- 景山公园
- 什刹海
- 前门 / 大栅栏
- 牛街
- 鼓楼
- 南锣鼓巷或对应支巷锚点
- 798 艺术区
- 天坛公园

以及对应的关键移动段:

- 故宫博物院 -> 景山公园
- 景山公园 -> 什刹海
- 牛街 -> 前门 / 大栅栏
- 牛街 -> 鼓楼
- 鼓楼 -> 南锣
- 鼓楼 -> 798

## 9. Audit Conclusion

当前北京 V3.4 样板已经证明地图事实可以有效约束模型，例如 couple 样本里的“故宫到什刹海不是轻松步行”就是明确进步。

但从资产审计结果看，当前真实地图覆盖仍然偏窄:

- 真实 verified 覆盖只触达极小范围
- student / solo 的核心片区仍大量依赖 `selector_estimate`
- 多数餐饮与街区停顿点还停留在内容层，不足以支撑真实路线可靠性

因此，V3.5 下一步最合理的方向不是马上扩更多城市，而是先引入 Map Resolver，把北京样板真正补成“内容精品 + 路线可信”的双稳定样板。
