import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import type { StorageLike } from "../trip/storage";
import { tripPlanSchema } from "../trip/schema";
import type { DailyItinerary, TripPlan, TripPlanDraft } from "../trip/types";
import {
  prepareExploreProjectWorkspaceFlow,
  startExploreProjectCreateFlow,
  startExploreProjectWorkspaceFlow,
  type ExploreProjectFlowDependencies,
} from "./project-source-client";

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
      "这是一份从 Explore 导入的灵感草稿，已整理成可以在 Workspace 打开的版本。",
    destination,
    days,
    travelStyleSummary: "从 Explore 灵感开始，后续按你的节奏继续调整。",
    weatherSummary: {
      available: false,
      overview: "导入工作台后，可以按日期和目的地补充天气信息。",
      dailyForecast: [],
      alerts: [],
      reminders: ["正式出行前再确认天气。"],
      dataNote: "Explore 导入草稿不包含实时天气。",
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
          cons: ["暂时没有具体交通方案。"],
          recommendation: "先在 Workspace 里补齐地点，再更新交通建议。",
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

export type ExploreCreateFlowEntry =
  | {
      source: "ai";
    }
  | {
      source: "explore_archive";
      archiveSlug: string;
      mode?: "chat";
    };

export async function startExploreCreateFlow(
  draft: TripPlanDraft,
  router: AppRouterInstance,
  entry: ExploreCreateFlowEntry,
  storage?: StorageLike,
  dependencies: ExploreProjectFlowDependencies = {},
) {
  const projectSession = await startExploreProjectCreateFlow(
    draft,
    storage,
    dependencies,
  );

  if (!projectSession?.projectId) {
    throw new Error("旅行项目创建失败，请稍后再试。");
  }

  const searchParams = new URLSearchParams({
    source: entry.source,
    continue: "1",
  });

  if (entry.source === "explore_archive") {
    if (entry.mode) {
      searchParams.set("mode", entry.mode);
    }
    searchParams.set("archiveSlug", entry.archiveSlug);
  }

  router.push(`/create?${searchParams.toString()}`);
}

export interface ExploreWorkspaceEntryResult {
  projectId: string;
  versionId: string;
  revisionHref: string;
}

export function buildExploreRevisionHref(projectId: string, versionId: string) {
  const searchParams = new URLSearchParams({
    source: "revision",
    projectId,
    versionId,
  });

  return `/create?${searchParams.toString()}`;
}

export async function prepareExploreWorkspaceEntry(
  draft: TripPlanDraft,
  storage?: StorageLike,
  dependencies: ExploreProjectFlowDependencies = {},
): Promise<ExploreWorkspaceEntryResult> {
  const workspacePlan = buildWorkspacePlanFromExploreDraft(draft);
  const created = await prepareExploreProjectWorkspaceFlow(
    draft,
    workspacePlan,
    storage,
    dependencies,
  );

  return {
    projectId: created.projectId,
    versionId: created.versionId,
    revisionHref: buildExploreRevisionHref(created.projectId, created.versionId),
  };
}

export async function startExploreWorkspaceFlow(
  draft: TripPlanDraft,
  router: AppRouterInstance,
) {
  const projectSession = await startExploreProjectWorkspaceFlow(
    draft,
    buildWorkspacePlanFromExploreDraft(draft),
  );

  if (!projectSession?.projectId || !projectSession.versionId) {
    throw new Error("旅行项目或版本创建失败，请稍后再试。");
  }

  router.push("/workspace");
}
