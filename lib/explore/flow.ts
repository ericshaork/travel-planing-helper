import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import {
  clearTripRequest,
  markCurrentTripAsUnsaved,
  saveTripPlan,
  saveTripPlanDraft,
  setWorkspaceSessionMetadata,
} from "../trip/storage";
import { tripPlanSchema } from "../trip/schema";
import type { DailyItinerary, TripPlan, TripPlanDraft } from "../trip/types";

function normalizeExploreDay(
  day: DailyItinerary | undefined,
  dayNumber: number,
  destination: string,
): DailyItinerary {
  if (!day) {
    return {
      day: dayNumber,
      theme: `第 ${dayNumber} 天灵感草稿`,
      routeOrder: [destination],
      routeReason: "这一天来自 Explore 灵感草稿，导入后可以继续细化地点和路线。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: ["导入工作台后，可以继续添加地点和备注。"],
    };
  }

  return {
    ...day,
    day: dayNumber,
    theme: day.theme?.trim() || `第 ${dayNumber} 天灵感草稿`,
    routeOrder:
      day.routeOrder.length > 0
        ? day.routeOrder
        : [destination || day.theme || `第 ${dayNumber} 天`],
    routeReason:
      day.routeReason?.trim() ||
      "这一天来自 Explore 灵感草稿，导入后可以继续细化地点和路线。",
    dailyTips:
      day.dailyTips.length > 0
        ? day.dailyTips
        : ["导入工作台后，可以继续添加地点和备注。"],
  };
}

function buildWorkspacePlanFromExploreDraft(draft: TripPlanDraft): TripPlan {
  const seed = draft.tripPlanSeed;
  const destination =
    seed.destination?.trim() ||
    draft.tripRequestDraft.destinationCity?.trim() ||
    "待定目的地";
  const days = Math.max(1, seed.days || draft.tripRequestDraft.days || 1);

  const candidate: TripPlan = {
    ...seed,
    tripTitle: seed.tripTitle?.trim() || draft.tripTitle || "Explore 灵感草稿",
    summary:
      seed.summary?.trim() ||
      "这是一份从 Explore 导入的灵感草稿，可以在 Workspace 里继续调整。",
    destination,
    days,
    travelStyleSummary:
      seed.travelStyleSummary?.trim() ||
      "从 Explore 灵感开始，后续按你的节奏继续调整。",
    dailyItinerary: Array.from({ length: days }, (_, index) =>
      normalizeExploreDay(seed.dailyItinerary[index], index + 1, destination),
    ),
  };

  const parsed = tripPlanSchema.safeParse(candidate);

  if (parsed.success) {
    return parsed.data;
  }

  return {
    tripTitle: draft.tripTitle || `${destination} 灵感草稿`,
    summary:
      "这是一份从 Explore 导入的灵感草稿，已经先整理成可在 Workspace 打开的版本。",
    destination,
    days,
    travelStyleSummary: "从 Explore 灵感开始，后续按你的节奏继续调整。",
    weatherSummary: {
      available: false,
      overview: "导入工作台后，可以再按日期和目的地补实时天气。",
      dailyForecast: [],
      alerts: [],
      reminders: ["正式出行前再确认天气。"],
      dataNote: "Explore 导入草稿不携带实时天气。",
    },
    budgetSummary: {
      totalEstimate: "待补充",
      transport: "待补充",
      hotel: "待补充",
      food: "待补充",
      tickets: "待补充",
      localTransport: "待补充",
      flexibleSpending: "待补充",
      note: "导入后可以按你的预算重新估算。",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "路线细节确认后，再补具体交通建议。",
      options: [
        {
          mode: "other",
          pros: ["先保留灵感草稿，方便继续编辑。"],
          cons: ["暂时还没有具体交通方案。"],
          recommendation: "先在 Workspace 里补齐地点，再刷新交通建议。",
        },
      ],
      suggestedPlatforms: [],
      note: "当前是导入草稿，交通信息待补充。",
    },
    dailyItinerary: Array.from({ length: days }, (_, index) =>
      normalizeExploreDay(undefined, index + 1, destination),
    ),
    generalTips: ["这份草稿来自 Explore，可以继续添加地点、备注和时间段。"],
    warnings: ["正式出行前，请按自己的日期、预算和开放信息再次核实。"],
  };
}

export function startExploreCreateFlow(
  draft: TripPlanDraft,
  router: AppRouterInstance,
) {
  markCurrentTripAsUnsaved();
  saveTripPlanDraft(draft);
  router.push("/create?entry=explore");
}

export function startExploreWorkspaceFlow(
  draft: TripPlanDraft,
  router: AppRouterInstance,
) {
  const workspacePlan = buildWorkspacePlanFromExploreDraft(draft);

  markCurrentTripAsUnsaved();
  saveTripPlanDraft({
    ...draft,
    tripPlanSeed: workspacePlan,
  });
  saveTripPlan(workspacePlan);
  clearTripRequest();
  setWorkspaceSessionMetadata({
    sourceType: "ai_generated",
    workspaceModeDefault: "read",
  });
  router.push("/workspace");
}
