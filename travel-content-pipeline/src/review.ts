import { BUDGET_LABELS, STYLE_LABELS, TRAVELER_LABELS } from "./generate.js";
import type { RequestGenerationResult, ReviewContext } from "./types.js";

function listToMarkdown(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatRequestSummary(result: RequestGenerationResult): string[] {
  return [
    `- 来源文件：${result.sourceFile}`,
    `- 目的地：${result.request.destinations.join("、")}`,
    `- 出发地：${result.request.originCity}`,
    `- 天数：${result.request.days} 天`,
    `- 旅行人群：${TRAVELER_LABELS[result.request.travelerType]}`,
    `- 预算等级：${BUDGET_LABELS[result.request.budgetLevel]}`,
    `- 风格标签：${result.request.styleTags.map((tag) => STYLE_LABELS[tag]).join("、")}`,
    `- 灵感卡：${result.content.inspirationCards.length} 条`,
    `- 路线模板：${result.content.routeTemplates.length} 条`,
    `- POI 草稿：${result.content.poiLibraryDraft.length} 条`,
    `- 请求级提醒：${result.warnings.length > 0 ? result.warnings.join("；") : "当前未发现明显异常，但仍需人工过一遍路线节奏。"}`,
  ];
}

function getCityPoiCounts(context: ReviewContext): string[] {
  const counts = context.content.poiLibraryDraft.reduce<Record<string, number>>((accumulator, poi) => {
    accumulator[poi.city] = (accumulator[poi.city] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((left, right) => left[0].localeCompare(right[0], "zh-CN"))
    .map(([city, count]) => `- ${city}: ${count} 个 POI 草稿`);
}

function getPaceRisks(context: ReviewContext): string[] {
  const risks: string[] = [];

  for (const result of context.requestResults) {
    const route = result.content.routeTemplates[0];
    const placeCounts = route.dailyPlan.map((day) => day.places.length);

    if (placeCounts.some((count) => count > 5)) {
      risks.push(`${result.sourceFile}: 存在单日地点过多的情况。`);
    }

    if (result.request.destinations.length > 1 && result.request.days <= result.request.destinations.length) {
      risks.push(`${result.sourceFile}: 多城市天数偏短，建议人工确认是否要减少城市。`);
    }

    if (result.request.styleTags.includes("low_walk") && placeCounts.some((count) => count > 4)) {
      risks.push(`${result.sourceFile}: 标记了 low_walk，但单日地点仍偏多。`);
    }

    if (result.request.budgetLevel === "low" && result.request.destinations.length > 1) {
      risks.push(`${result.sourceFile}: low budget 与多城市组合可能带来更高交通成本。`);
    }
  }

  return risks.length > 0 ? risks : ["- 当前未发现明显超限节奏，但仍需人工确认片区串联是否真实顺路。"];
}

export function buildReviewReport(context: ReviewContext): string {
  const poiNames = context.content.poiLibraryDraft.map((poi) => `${poi.city} - ${poi.name}`);
  const imageQueries = context.content.poiLibraryDraft.map((poi) => `${poi.name}: ${poi.imageQuery}`);
  const cardQueries = context.content.inspirationCards.map((card) => `${card.title}: ${card.coverImageQuery}`);
  const requestSections = context.requestResults
    .map((result) => [`### ${result.sourceFile}`, ...formatRequestSummary(result)].join("\n"))
    .join("\n\n");

  return `# 内容种子生成复核报告

## 生成摘要

- 生成时间：${context.generatedAt}
- 请求数量：${context.requestResults.length}
- 灵感卡数量：${context.content.inspirationCards.length}
- 路线模板数量：${context.content.routeTemplates.length}
- 地点草稿数量：${context.content.poiLibraryDraft.length}
- 全局警告数：${context.warnings.length}

## 每个 Request 摘要

${requestSections}

## 每个城市的 POI 数量

${getCityPoiCounts(context).join("\n")}

## 需要人工确认的地点

以下地点当前仅为结构化草稿，真实性与可达性均未调用外部服务校验，统一保持 \`pending_poi_check\`：

${listToMarkdown(poiNames)}

## 图片授权提醒

- 当前项目没有下载任何图片，也没有调用图片 API。
- 所有图片相关字段仅输出搜索意图，必须由人工后续确认授权来源与适用性。
- 所有封面与地点图片都需要人工确认授权来源、适配比例和是否符合最终内容语气。
- 地点图片搜索词：

${listToMarkdown(imageQueries)}

- 灵感卡封面搜索词：

${listToMarkdown(cardQueries)}

## 重复地点处理摘要

- 去重前 POI 数量：${context.dedupeSummary.beforeCount}
- 去重后 POI 数量：${context.dedupeSummary.afterCount}
- 移除的重复条目：${context.dedupeSummary.removedCount}
- 合并的重复组数：${context.dedupeSummary.mergedGroups}
- 重复键示例：${context.dedupeSummary.normalizedKeys.length > 0 ? context.dedupeSummary.normalizedKeys.slice(0, 8).join("；") : "本轮未发现跨请求重复键"}

## 节奏风险

${listToMarkdown(getPaceRisks(context))}

## 合规提醒

- 不得复制小红书、马蜂窝、携程、微博、抖音等平台帖子正文。
- 不得下载平台图片，也不得将平台图片直接搬运到内容生态中使用。
- 当前输出均为基于本地规则与模板生成的原创结构化草稿，不包含外部平台抓取内容。
- 当前仍未接入主网站、数据库、高德 API 或图片 API。

## POI 高德校验提醒

- 为每个地点增加高德检索步骤，补充标准名称、经纬度、营业状态与地址片段。
- 将 \`verificationStatus\` 从 \`pending_poi_check\` 扩展为 \`matched\`、\`ambiguous\`、\`not_found\` 等更细状态。
- 对同名或近似名称地点做去重，避免内容生态层出现重复 POI。
- 把高德校验作为独立阶段接入，不要和当前原创内容生成逻辑耦合。

## 汇总警告

${context.warnings.length > 0 ? listToMarkdown(context.warnings) : "- 当前批次未生成新的全局警告。"}
`;
}
