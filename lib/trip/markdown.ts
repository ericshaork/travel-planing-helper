import type {
  DailyItinerary,
  ItineraryItem,
  TripPlan,
} from "./types";

const TRANSPORT_MODE_LABELS = {
  flight: "飞机",
  train: "火车",
  high_speed_rail: "高铁",
  bus: "大巴",
  ship: "轮船",
  other: "其他方式",
} as const;

function lines(items: string[], prefix = "- "): string[] {
  return items.map((item) => `${prefix}${item}`);
}

function itineraryItemMarkdown(item: ItineraryItem): string[] {
  const heading = item.timeLabel
    ? `#### ${item.timeLabel}｜${item.placeName}`
    : `#### ${item.placeName}`;
  const content = [
    heading,
    "",
    item.reason,
    ...(item.suggestedDuration
      ? ["", `- 建议停留：${item.suggestedDuration}`]
      : []),
    ...(item.transportFromPrevious
      ? [`- 怎么过去：${item.transportFromPrevious}`]
      : []),
    ...(item.weatherImpact ? [`- 天气调整：${item.weatherImpact}`] : []),
    ...(item.backupPlan ? [`- 备选：${item.backupPlan}`] : []),
  ];

  if (item.guide.length > 0) {
    content.push("", "**到这里怎么逛**", "", ...lines(item.guide));
  }

  return content;
}

function dayPeriodMarkdown(
  title: string,
  items: ItineraryItem[],
): string[] {
  if (items.length === 0) {
    return [];
  }

  return [
    `### ${title}`,
    "",
    ...items.flatMap((item, index) => [
      ...(index > 0 ? [""] : []),
      ...itineraryItemMarkdown(item),
    ]),
    "",
  ];
}

function dailyItineraryMarkdown(day: DailyItinerary): string[] {
  return [
    `## Day ${day.day}｜${day.theme}`,
    "",
    ...(day.date ? [`日期：${day.date}`, ""] : []),
    `路线：${day.routeOrder.join(" → ")}`,
    "",
    `这样排：${day.routeReason}`,
    "",
    ...dayPeriodMarkdown("上午", day.morning),
    ...dayPeriodMarkdown("下午", day.afternoon),
    ...dayPeriodMarkdown("晚上", day.evening),
    ...(day.dailyTips.length > 0
      ? ["### 当天提醒", "", ...lines(day.dailyTips), ""]
      : []),
  ];
}

export function tripPlanMarkdownFilename(tripPlan: TripPlan): string {
  const safeTitle = tripPlan.tripTitle
    .replace(/[<>:"/\\|?*：／＼｜？＊\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${safeTitle || "旅行方案"}.md`;
}

export function toTripMarkdown(tripPlan: TripPlan): string {
  const weather = tripPlan.weatherSummary;
  const budget = tripPlan.budgetSummary;
  const sections: string[] = [
    `# ${tripPlan.tripTitle}`,
    "",
    `> ${tripPlan.destination} · ${tripPlan.days} 天`,
    "",
    "## 旅行总览",
    "",
    tripPlan.summary,
    "",
    `旅行节奏：${tripPlan.travelStyleSummary}`,
    "",
    "## 天气提醒",
    "",
    weather.overview,
    "",
  ];

  if (weather.dailyForecast.length > 0) {
    sections.push(
      ...weather.dailyForecast.flatMap((day) => [
        `- ${day.date}：${day.summary}`,
      ]),
      "",
    );
  }

  if (weather.alerts.length > 0) {
    sections.push(
      "### 天气预警",
      "",
      ...weather.alerts.map(
        (alert) =>
          `- ${alert.title}${alert.level ? `（${alert.level}）` : ""}：${alert.description}`,
      ),
      "",
    );
  }

  sections.push(
    ...lines(weather.reminders),
    "",
    `数据说明：${weather.dataNote}`,
    "",
    "## 预算摘要（估算）",
    "",
    `- 合计：${budget.totalEstimate}`,
    `- 大交通：${budget.transport}`,
    `- 住宿：${budget.hotel}`,
    `- 吃饭：${budget.food}`,
    `- 门票：${budget.tickets}`,
    `- 市内交通：${budget.localTransport}`,
    `- 弹性支出：${budget.flexibleSpending}`,
    "",
    `说明：${budget.note}`,
    "",
    "## 每日行程",
    "",
    ...tripPlan.dailyItinerary.flatMap((day, index) => [
      ...(index > 0 ? ["---", ""] : []),
      ...dailyItineraryMarkdown(day),
    ]),
    "## 住宿区域建议",
    "",
    ...tripPlan.hotelAreaAdvice.flatMap((advice) => [
      `### ${advice.area}`,
      "",
      advice.reason,
      "",
      `- 适合：${advice.suitableFor}`,
      `- 交通：${advice.transportationConvenience}`,
      ...(advice.possibleDownside
        ? [`- 可能的不足：${advice.possibleDownside}`]
        : []),
      ...(advice.suggestedPlatforms.length > 0
        ? [`- 可查询平台：${advice.suggestedPlatforms.join("、")}`]
        : []),
      "",
    ]),
    "## 交通建议",
    "",
    tripPlan.transportAdvice.summary,
    "",
    ...tripPlan.transportAdvice.options.flatMap((option) => [
      `### ${TRANSPORT_MODE_LABELS[option.mode]}`,
      "",
      `- 适合的地方：${option.pros.join("；")}`,
      `- 要留意：${option.cons.join("；")}`,
      `- 建议：${option.recommendation}`,
      "",
    ]),
    ...(tripPlan.transportAdvice.suggestedPlatforms.length > 0
      ? [
          `可查询平台：${tripPlan.transportAdvice.suggestedPlatforms.join("、")}`,
          "",
        ]
      : []),
    `说明：${tripPlan.transportAdvice.note}`,
    "",
    "## 注意事项",
    "",
    ...lines([...tripPlan.warnings, ...tripPlan.generalTips]),
    "",
    "---",
    "",
    "本方案用于行前参考。实时天气、票价、余票、酒店库存与开放状态，请在出发前通过官方渠道再次确认。",
  );

  return `${sections.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
