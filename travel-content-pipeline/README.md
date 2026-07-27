# travel-content-pipeline

`travel-content-pipeline` 是一个独立的本地 TypeScript 工具项目，用于根据结构化输入生成旅行内容种子草稿，服务未来内容生态模块的数据准备。

## 目标

- 生成原创的旅行灵感卡草稿
- 生成结构化路线模板草稿
- 生成待核验的地点库草稿
- 输出人工复核报告
- 支持单文件生成与批量生成
- 通过内置城市模板库提升内容稳定性和多样性

## 边界

- 不连接主网站项目
- 不调用外网
- 不爬取平台内容
- 不复制帖子正文
- 不下载平台图片
- 不接数据库
- 不接高德 API
- 不接图片 API
- 不做网页后台
- 图片仅输出 `imageQuery` 或 `coverImageQuery`，并标记人工审核
- v0.3A 新增本地 Mock POI 校验状态层，但仍不接真实高德 API

## 安装

```bash
npm install
```

## 输入格式

单文件模式默认示例：

`input/seed_request.example.json`

批量模式目录：

`input/requests/*.json`

字段：

- `destinations`: string[]，目的地城市列表
- `originCity`: string，出发地
- `days`: number，旅行天数
- `travelerType`: `"student_budget" | "couple" | "family_middle_age" | "family_with_kids" | "solo" | "friends"`
- `styleTags`: `("sea" | "food" | "photo" | "history" | "museum" | "nature" | "shopping" | "nightlife" | "slow" | "low_walk")[]`
- `budgetLevel`: `"low" | "medium" | "high"`
- `language`: string，当前实现建议使用 `zh-CN`

## 批量输入写法

`input/requests` 下每个 `.json` 文件都使用和单文件相同的结构，例如：

- `input/requests/xiamen_student_3d.json`
- `input/requests/chengdu_food_4d.json`
- `input/requests/hangzhou_slow_2d.json`

批量模式会：

- 自动读取 `input/requests/*.json`
- 对每个文件执行 JSON 解析与 zod 校验
- 跳过校验失败的请求，并把原因写入 `review_report.md` 和 `batch_manifest.json` 的警告列表
- 合并输出统一结果文件

## 运行命令

构建：

```bash
npm run build
```

单文件生成：

```bash
npm run generate -- input/seed_request.example.json
```

批量生成：

```bash
npm run generate:batch
```

POI Mock 校验：

```bash
npm run verify:poi
```

也支持显式传入草稿文件路径：

```bash
npm run verify:poi -- output/poi_library_draft.json
```

如果 PowerShell 拦截 `npm.ps1`，可改用：

```bash
npm.cmd run build
npm.cmd run generate -- input/seed_request.example.json
npm.cmd run generate:batch
npm.cmd run verify:poi
```

## 输出文件

脚本会写入：

- `output/inspiration_cards.json`
- `output/route_templates.json`
- `output/poi_library_draft.json`
- `output/poi_library_checked.json`
- `output/review_report.md`
- `output/poi_verification_report.md`
- `output/batch_manifest.json`，仅批量模式生成

各文件说明：

- `inspiration_cards.json`: 灵感卡草稿，保留封面搜索词和关联路线模板 ID
- `route_templates.json`: 路线模板草稿，含每日主题、地点与备注
- `poi_library_draft.json`: POI 草稿，统一标记 `pending_poi_check`
- `poi_library_checked.json`: 经 Mock Verifier 校验后的 POI，状态进入 `matched | ambiguous | not_found`
- `review_report.md`: 人工复核报告，汇总每个请求、每个城市、重复地点处理和节奏风险
- `poi_verification_report.md`: POI 校验报告，汇总状态统计、人工处理项和下一阶段接高德建议
- `batch_manifest.json`: 批量任务清单，记录生成时间、输入数量、输出数量、警告和来源文件

## 生成规则概览

- 每个目的地生成 3 到 6 个候选地点草稿
- 默认每天安排 3 到 5 个地点
- `slow`、`low_walk`、`family_with_kids` 会调整为每天 2 到 4 个地点
- `student_budget` 偏公共交通、步行可达、小吃与低预算体验
- `couple`、`photo` 会增加傍晚景观和拍照表达
- `history`、`museum` 会增加文化类地点
- `sea` 会增加滨海、沙滩、码头类地点
- `food` 会增加市场、老街、小吃类地点
- 多城市路线尽量按城市分天，避免一天混入过多城市
- POI 在输出前会做同城市名称标准化去重，合并 tags 和描述

## v0.3A POI 校验状态层

v0.3A 在生成草稿后新增一层本地 POI 状态流转，用来模拟后续接真实 Provider 前的审核流程。

状态含义：

- `pending_poi_check`: 仅出现在草稿阶段，表示尚未进入校验
- `matched`: Mock Verifier 认为能稳定对应到一个候选地点
- `ambiguous`: 名称太泛，或同城存在多个可能候选，需要人工选择
- `not_found`: 当前模板中找不到合理候选，需要人工改名、删除或留到下一阶段处理

为什么当前仍是 Mock Verifier：

- 本轮刻意不接真实高德 API
- 不创建 `AMAP_API_KEY`
- 不读取 `.env`
- 不联网
- 先把 `matched / ambiguous / not_found` 的状态流、报告和人工审核链路跑通

下一阶段：

- `v0.3B` 再接真实高德 POI Provider
- 当前 `poi_library_checked.json` 的坐标只是稳定 mock 坐标，不能直接作为正式上线坐标

## 城市模板库

当前内置城市模板：

- 厦门
- 成都
- 杭州
- 上海
- 泉州
- 广州
- 深圳

每个城市模板都包含：

- `aliases`
- `coreAreas`
- `recommendedPoiSeeds`
- `foodKeywords`
- `photoKeywords`
- `historyKeywords`
- `natureKeywords`
- `seaKeywords`
- `transitNotes`
- `budgetNotes`
- `avoidNotes`

## 人工审核流程

建议按下面顺序人工审核：

1. 先看 `review_report.md`，确认哪些请求有节奏或预算警告
2. 再看 `poi_library_draft.json`，核查地点是否真实存在、是否需要补充标准名称
3. 再看 `route_templates.json`，确认每日地点数量、转场合理性和主题一致性
4. 最后看 `inspiration_cards.json`，统一文案语气和封面搜索词方向
5. 图片素材必须另行人工找授权来源，当前项目不提供下载和授权判断

v0.3A 建议改成：

1. 先执行 `generate:batch`
2. 再执行 `verify:poi`
3. 查看 `poi_verification_report.md`
4. 人工处理 `ambiguous / not_found`
5. 后续再进入真实高德校验或审核后台

## 去重规则

POI 去重目前基于以下规则：

- 同城市、同标准化名称视为重复
- 标准化会处理空格、全角半角、常见标点
- 会轻度统一常见后缀，如 `景区`、`风景区`、`旅游景区`
- 重复项会合并 `tags`
- `description` 保留信息更完整的一条
- `recommendedDurationMinutes` 取合并后的较合理值

## 后续接高德 POI 的建议

- 为每个地点增加稳定的 `poiCandidateId`
- 新增 POI 校验步骤，将 `pending_poi_check` 更新为已确认状态
- 用高德返回的正式名称、坐标、营业状态补全地点字段
- 将同名地点去重并建立城市内索引
- `v0.3B` 计划把真实高德 POI 校验作为独立阶段接入

## 当前仍不做

- 不爬虫
- 不下载图片
- 不接数据库
- 不接高德 API
- 不接图片 API
- 不接主网站
- 不创建 `AMAP_API_KEY`
- 不读取 `.env`
