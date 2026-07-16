import type {
  ExploreTripContent,
  ExploreTripDailyActivity,
  ExploreTripDayContent,
  InspirationSelection,
} from "./types";
import type {
  ItineraryItem,
  ItineraryItemType,
  TripPlan,
  TripPlanDraft,
  TripRequestDraft,
} from "../trip/types";

function inferItemType(activity: ExploreTripDailyActivity): ItineraryItemType {
  if (activity.foodRefs.length > 0) {
    return "food";
  }

  if (activity.poiRefs.length > 0) {
    return "attraction";
  }

  return "other";
}

function inferSlot(timeBlock: string): "morning" | "afternoon" | "evening" {
  const normalized = timeBlock.trim().toLowerCase();

  if (
    normalized.includes("morning") ||
    normalized.includes("am") ||
    normalized.includes("breakfast") ||
    normalized.includes("early")
  ) {
    return "morning";
  }

  if (
    normalized.includes("evening") ||
    normalized.includes("night") ||
    normalized.includes("pm") ||
    normalized.includes("dinner")
  ) {
    return "evening";
  }

  return "afternoon";
}

function buildGuide(activity: ExploreTripDailyActivity) {
  const guide: string[] = [activity.description];

  if (activity.poiRefs.length > 0) {
    guide.push(`地点线索：${activity.poiRefs.join("、")}`);
  }

  if (activity.foodRefs.length > 0) {
    guide.push(`美食线索：${activity.foodRefs.join("、")}`);
  }

  return guide;
}

function toItineraryItem(
  activity: ExploreTripDailyActivity,
  day: ExploreTripDayContent,
): ItineraryItem {
  return {
    timeLabel: activity.timeBlock,
    placeName: activity.poiRefs[0] ?? activity.foodRefs[0] ?? `${day.title} 停留点`,
    type: inferItemType(activity),
    reason: activity.description,
    guide: buildGuide(activity),
    matchedInterests: [...activity.poiRefs, ...activity.foodRefs],
  };
}

function buildDailyPlan(day: ExploreTripDayContent) {
  const nextDay = {
    day: day.dayNumber,
    theme: day.title,
    routeOrder: [] as string[],
    routeReason: day.summary,
    morning: [] as ItineraryItem[],
    afternoon: [] as ItineraryItem[],
    evening: [] as ItineraryItem[],
    dailyTips: [day.summary],
  };

  for (const activity of day.activities) {
    const item = toItineraryItem(activity, day);
    const slot = inferSlot(activity.timeBlock);
    nextDay[slot].push(item);

    if (item.placeName) {
      nextDay.routeOrder.push(item.placeName);
    }
  }

  return nextDay;
}

function buildTripRequestDraft(content: ExploreTripContent): TripRequestDraft {
  return {
    destinationCity: content.city,
    days: content.days,
    interests: [...content.tags],
    travelStyles: [content.tripType, content.theme, content.pace].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ),
    mustVisitPlaces: content.pois.slice(0, 5).map((poi) => poi.name),
    specialRequirements:
      content.archiveIntro ??
      `从 Explore 档案「${content.title}」开始，后续可以继续按你的节奏微调。`,
  };
}

function buildTripPlanSeed(content: ExploreTripContent): TripPlan {
  return {
    tripTitle: content.title,
    summary: content.summary,
    destination: content.city,
    days: content.days,
    travelStyleSummary: [content.tripType, content.theme, content.pace]
      .filter((value): value is string => Boolean(value))
      .join(" · "),
    weatherSummary: {
      available: false,
      overview: "导入为个人计划后，可以再刷新天气信息。",
      dailyForecast: [],
      alerts: [],
      reminders: ["导入工作台后，再按目的地和日期补实时天气。"],
      dataNote: "Explore 档案不携带实时天气。",
    },
    budgetSummary: {
      totalEstimate: content.budgetLevel ?? "待补充",
      transport: "待补充",
      hotel: "待补充",
      food: "待补充",
      tickets: "待补充",
      localTransport: "待补充",
      flexibleSpending: "待补充",
      note:
        content.budgetNote ??
        "导入工作台后，可以按你的预算重新估算。",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "导入为个人计划后，可以再补具体交通建议。",
      options: [],
      suggestedPlatforms: [],
      note: "Explore 档案只保留灵感层信息。",
    },
    dailyItinerary: content.dailyItinerary.map(buildDailyPlan),
    generalTips: [...content.highlights],
    warnings: [
      "这份草稿来自 Explore 公共档案，正式出行前请按自己的日期、预算和节奏调整。",
    ],
  };
}

function buildPlaceholderTripPlanSeed(
  title: string,
  destination: string,
  summary: string,
  travelStyleSummary: string,
): TripPlan {
  return {
    tripTitle: title,
    summary,
    destination,
    days: 1,
    travelStyleSummary,
    weatherSummary: {
      available: false,
      overview: "生成完整路线后再补实时天气。",
      dailyForecast: [],
      alerts: [],
      reminders: ["先把它当作灵感草稿，再生成完整行程。"],
      dataNote: "Explore 灵感草稿不包含实时天气。",
    },
    budgetSummary: {
      totalEstimate: "待补充",
      transport: "待补充",
      hotel: "待补充",
      food: "待补充",
      tickets: "待补充",
      localTransport: "待补充",
      flexibleSpending: "待补充",
      note: "生成完整路线后再估算预算。",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "路线确认后再生成交通建议。",
      options: [
        {
          mode: "other",
          pros: ["先保持灵感草稿轻量。"],
          cons: ["暂时还没有具体路线交通建议。"],
          recommendation: "先生成完整行程，再刷新交通建议。",
        },
      ],
      suggestedPlatforms: [],
      note: "这份占位草稿用于连接 Explore 和创建流程。",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "灵感草稿",
        routeOrder: [destination],
        routeReason: summary,
        morning: [
          {
            placeName: destination,
            type: "other",
            reason: summary,
            guide: ["先查看这些灵感，再按你的旅行方式继续调整。"],
          },
        ],
        afternoon: [],
        evening: [],
        dailyTips: ["下一步可以把这份灵感扩展成完整路线。"],
      },
    ],
    generalTips: ["这是一份 Explore 灵感草稿，还不是最终路线。"],
    warnings: [
      "目的地、日期和预算可能还需要在生成完整行程前确认。",
    ],
  };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildInspirationSummary(selection: InspirationSelection) {
  const summaryParts = [
    selection.location?.length ? `地点：${selection.location.join("、")}` : "",
    selection.food?.length ? `美食：${selection.food.join("、")}` : "",
    selection.season?.length ? `季节：${selection.season.join("、")}` : "",
    selection.companion?.length
      ? `同行方式：${selection.companion.join("、")}`
      : "",
  ].filter(Boolean);

  return summaryParts.length > 0
    ? summaryParts.join(" | ")
    : "Explore 灵感草稿";
}

export function buildTripPlanDraftFromExplore(
  content: ExploreTripContent,
): TripPlanDraft {
  return {
    tripTitle: content.title,
    sourceType: "explore_archive",
    sourceExploreId: content.id,
    sourceExploreSlug: content.slug,
    tripRequestDraft: buildTripRequestDraft(content),
    tripPlanSeed: buildTripPlanSeed(content),
  };
}

export function buildTripPlanDraftFromInspiration(
  selection: InspirationSelection,
  options?: {
    cityQuery?: string;
    sourceExploreId?: string;
    sourceExploreSlug?: string;
  },
): TripPlanDraft {
  const locationValues = selection.location ?? [];
  const destinationCity = options?.cityQuery?.trim() || undefined;
  const interestValues = unique([
    ...locationValues,
    ...(selection.food ?? []),
    ...(selection.season ?? []),
    ...(selection.companion ?? []),
  ]);
  const travelStyles = unique([
    ...(selection.season ?? []),
    ...(selection.companion ?? []),
    "explore-inspiration",
  ]);
  const summary = buildInspirationSummary(selection);
  const title = destinationCity
    ? `${destinationCity} 灵感草稿`
    : "Explore 灵感草稿";
  const seedDestination =
    destinationCity ?? locationValues[0] ?? "待定目的地";

  return {
    tripTitle: title,
    sourceType: "explore_inspiration",
    sourceExploreId: options?.sourceExploreId,
    sourceExploreSlug: options?.sourceExploreSlug,
    tripRequestDraft: {
      destinationCity,
      days: 3,
      interests: interestValues,
      travelStyles,
      specialRequirements: summary,
    },
    tripPlanSeed: buildPlaceholderTripPlanSeed(
      title,
      seedDestination,
      summary,
      travelStyles.join(" · "),
    ),
  };
}
