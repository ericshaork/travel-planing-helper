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
      theme: `绗?${dayNumber} 澶╃伒鎰熻崏绋縛`,
      routeOrder: [destination],
      routeReason: "杩欎竴澶╂潵鑷?Explore 鐏垫劅鑽夌锛屽鍏ュ悗鍙互缁х画缁嗗寲鍦扮偣鍜岃矾绾裤€?",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: ["瀵煎叆宸ヤ綔鍙板悗锛屽彲浠ョ户缁坊鍔犲湴鐐瑰拰澶囨敞銆?"],
    };
  }

  return {
    ...day,
    day: dayNumber,
    theme: day.theme?.trim() || `绗?${dayNumber} 澶╃伒鎰熻崏绋縛`,
    routeOrder:
      day.routeOrder.length > 0
        ? day.routeOrder
        : [destination || day.theme || `绗?${dayNumber} 澶?`],
    routeReason:
      day.routeReason?.trim() ||
      "杩欎竴澶╂潵鑷?Explore 鐏垫劅鑽夌锛屽鍏ュ悗鍙互缁х画缁嗗寲鍦扮偣鍜岃矾绾裤€?",
    dailyTips:
      day.dailyTips.length > 0
        ? day.dailyTips
        : ["瀵煎叆宸ヤ綔鍙板悗锛屽彲浠ョ户缁坊鍔犲湴鐐瑰拰澶囨敞銆?"],
  };
}

function buildWorkspacePlanFromExploreDraft(draft: TripPlanDraft): TripPlan {
  const seed = draft.tripPlanSeed;
  const destination =
    seed.destination?.trim() ||
    draft.tripRequestDraft.destinationCity?.trim() ||
    "寰呭畾鐩殑鍦?";
  const days = Math.max(1, seed.days || draft.tripRequestDraft.days || 1);

  const candidate: TripPlan = {
    ...seed,
    tripTitle: seed.tripTitle?.trim() || draft.tripTitle || "Explore 鐏垫劅鑽夌",
    summary:
      seed.summary?.trim() ||
      "杩欐槸涓€浠戒粠 Explore 瀵煎叆鐨勭伒鎰熻崏绋匡紝鍙互鍦?Workspace 閲岀户缁皟鏁淬€?",
    destination,
    days,
    travelStyleSummary:
      seed.travelStyleSummary?.trim() ||
      "浠?Explore 鐏垫劅寮€濮嬶紝鍚庣画鎸変綘鐨勮妭濂忕户缁皟鏁淬€?",
    dailyItinerary: Array.from({ length: days }, (_, index) =>
      normalizeExploreDay(seed.dailyItinerary[index], index + 1, destination),
    ),
  };

  const parsed = tripPlanSchema.safeParse(candidate);

  if (parsed.success) {
    return parsed.data;
  }

  return {
    tripTitle: draft.tripTitle || `${destination} 鐏垫劅鑽夌`,
    summary:
      "杩欐槸涓€浠戒粠 Explore 瀵煎叆鐨勭伒鎰熻崏绋匡紝宸茬粡鍏堟暣鐞嗘垚鍙湪 Workspace 鎵撳紑鐨勭増鏈€?",
    destination,
    days,
    travelStyleSummary: "浠?Explore 鐏垫劅寮€濮嬶紝鍚庣画鎸変綘鐨勮妭濂忕户缁皟鏁淬€?",
    weatherSummary: {
      available: false,
      overview: "瀵煎叆宸ヤ綔鍙板悗锛屽彲浠ュ啀鎸夋棩鏈熷拰鐩殑鍦拌ˉ瀹炴椂澶╂皵銆?",
      dailyForecast: [],
      alerts: [],
      reminders: ["姝ｅ紡鍑鸿鍓嶅啀纭澶╂皵銆?"],
      dataNote: "Explore 瀵煎叆鑽夌涓嶆惡甯﹀疄鏃跺ぉ姘斻€?",
    },
    budgetSummary: {
      totalEstimate: "寰呰ˉ鍏?",
      transport: "寰呰ˉ鍏?",
      hotel: "寰呰ˉ鍏?",
      food: "寰呰ˉ鍏?",
      tickets: "寰呰ˉ鍏?",
      localTransport: "寰呰ˉ鍏?",
      flexibleSpending: "寰呰ˉ鍏?",
      note: "瀵煎叆鍚庡彲浠ユ寜浣犵殑棰勭畻閲嶆柊浼扮畻銆?",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "璺嚎缁嗚妭纭鍚庯紝鍐嶈ˉ鍏蜂綋浜ら€氬缓璁€?",
      options: [
        {
          mode: "other",
          pros: ["鍏堜繚鐣欑伒鎰熻崏绋匡紝鏂逛究缁х画缂栬緫銆?"],
          cons: ["鏆傛椂杩樻病鏈夊叿浣撲氦閫氭柟妗堛€?"],
          recommendation: "鍏堝湪 Workspace 閲岃ˉ榻愬湴鐐癸紝鍐嶅埛鏂颁氦閫氬缓璁€?",
        },
      ],
      suggestedPlatforms: [],
      note: "褰撳墠鏄鍏ヨ崏绋匡紝浜ら€氫俊鎭緟琛ュ厖銆?",
    },
    dailyItinerary: Array.from({ length: days }, (_, index) =>
      normalizeExploreDay(undefined, index + 1, destination),
    ),
    generalTips: ["杩欎唤鑽夌鏉ヨ嚜 Explore锛屽彲浠ョ户缁坊鍔犲湴鐐广€佸娉ㄥ拰鏃堕棿娈点€?"],
    warnings: ["姝ｅ紡鍑鸿鍓嶏紝璇锋寜鑷繁鐨勬棩鏈熴€侀绠楀拰寮€鏀句俊鎭啀娆℃牳瀹炪€?"],
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
    throw new Error("鏃呰椤圭洰鍒涘缓澶辫触锛岃绋嶅悗鍐嶈瘯銆?");
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
    throw new Error("鏃呰椤圭洰鎴栫増鏈垱寤哄け璐ワ紝璇风◢鍚庡啀璇曘€?");
  }

  router.push("/workspace");
}
