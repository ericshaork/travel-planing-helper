import type { PoiCandidate } from "@/lib/poi/types";
import type { MapPoint } from "@/lib/trip/enrichment-types";
import type { DayCabinetView, ItineraryBlockView } from "@/lib/trip/itinerary-view";
import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type { WorkspaceSessionSourceType } from "@/lib/trip/storage";
import type {
  WorkspaceDistanceSummary,
  WorkspaceMode,
} from "@/hooks/useTripWorkspaceState";

interface InspectorPointDetailCardProps {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace?: boolean;
  compactBlankReadMode?: boolean;
  insight?: DayRouteInsight;
  activePointId?: string | null;
  unmatchedPlaceName?: string | null;
  workspaceMode: WorkspaceMode;
  activeCabinet?: DayCabinetView;
  selectedSearchCandidate?: PoiCandidate | null;
  targetSlotId?: string | null;
  slotOptions: DayCabinetView["slots"];
  distanceTargetPointId: string;
  distanceSummary?: WorkspaceDistanceSummary | null;
  distanceLoading: boolean;
  distanceError?: string;
  mapActionMessage?: string;
  resolvedPoints: MapPoint[];
  distanceExpanded?: boolean;
  onTargetSlotChange: (slotId: string) => void;
  onAddSelectedPlace: () => void;
  onDistanceTargetChange: (pointId: string) => void;
  onEstimateDistance: () => void | Promise<void>;
}

const SLOT_LABELS = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
} as const;

const TYPE_LABELS = {
  attraction: "景点",
  food: "餐饮",
  hotel: "住宿",
  transport: "交通",
  free_time: "自由活动",
  other: "其他",
} as const;

function resolvePointBlock(
  activeCabinet: DayCabinetView | undefined,
  activePoint: MapPoint | undefined,
): ItineraryBlockView | null {
  if (!activeCabinet || !activePoint) {
    return null;
  }

  const slot = activeCabinet.slots.find((entry) => entry.key === activePoint.slot);

  if (!slot) {
    return null;
  }

  return (
    slot.items.find((block) => block.ref.itemIndex === activePoint.itemIndex) ??
    slot.items.find((block) => block.item.placeName === activePoint.name) ??
    null
  );
}

function getTypeLabel(type?: keyof typeof TYPE_LABELS | string) {
  if (!type) {
    return "待补充";
  }

  return TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? "其他";
}

function getStatusLabel(
  selectedSearchCandidate: PoiCandidate | null,
  activePoint: MapPoint | undefined,
) {
  if (selectedSearchCandidate) {
    return "搜索结果";
  }

  if (activePoint?.resolved) {
    return "已定位";
  }

  return "待确认";
}

export function InspectorPointDetailCard({
  workspaceSourceType,
  isBlankWorkspace = false,
  compactBlankReadMode = false,
  insight,
  activePointId = null,
  unmatchedPlaceName = null,
  workspaceMode,
  activeCabinet,
  selectedSearchCandidate = null,
  targetSlotId = null,
  slotOptions,
  distanceTargetPointId,
  distanceSummary = null,
  distanceLoading,
  distanceError,
  mapActionMessage,
  resolvedPoints,
  distanceExpanded = false,
  onTargetSlotChange,
  onAddSelectedPlace,
  onDistanceTargetChange,
  onEstimateDistance,
}: InspectorPointDetailCardProps) {
  const points = insight?.mapPoints ?? [];
  const activePoint =
    activePointId === null
      ? undefined
      : points.find((point) => point.id === activePointId);
  const activePointOrder =
    activePoint === undefined
      ? null
      : points.findIndex((point) => point.id === activePoint.id) + 1;
  const targetSlot = slotOptions.find((slot) => slot.id === targetSlotId) ?? slotOptions[0];
  const activeBlock = resolvePointBlock(activeCabinet, activePoint);
  const noteText =
    activeBlock?.item.reason?.trim() ||
    activePoint?.warning ||
    (selectedSearchCandidate ? "选中后可以直接加入当前行程柜。" : "这站还没有补充备注。");
  const address =
    selectedSearchCandidate?.address?.trim() ||
    activePoint?.address?.trim() ||
    "地址待补充";
  const typeLabel = getTypeLabel(
    selectedSearchCandidate ? "other" : activeBlock?.item.type ?? activePoint?.itemType,
  );
  const statusLabel = getStatusLabel(selectedSearchCandidate, activePoint);
  const canEstimateDistance =
    Boolean(selectedSearchCandidate?.coordinates || activePoint?.coordinates) &&
    resolvedPoints.length > 0;
  const dayLabel = selectedSearchCandidate
    ? activeCabinet
      ? `第 ${activeCabinet.dayNumber} 天`
      : "当前行程"
    : `第 ${activePoint?.dayIndex ?? "-"} 天`;
  const slotLabel = selectedSearchCandidate
    ? targetSlot?.label ?? "当前时间段"
    : activePoint
      ? SLOT_LABELS[activePoint.slot]
      : "待补充";
  const sourceLabel = selectedSearchCandidate
    ? `候选来源：${selectedSearchCandidate.provider}`
    : activePoint?.provider
      ? `定位来源：${activePoint.provider}`
      : "定位来源待补充";
  const title = selectedSearchCandidate?.name ?? activePoint?.name ?? "待补充地点";

  if (!activePoint && !selectedSearchCandidate && unmatchedPlaceName) {
    return (
      <section>
        <div className="edit-gear-card px-3.5 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="map-desk-kicker">当前地点</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                {unmatchedPlaceName} 还没有匹配到地图坐标，等名称或地址更明确之后，这里会补上定位。
              </p>
            </div>
            <span className="map-desk-chip">待确认</span>
          </div>
        </div>
      </section>
    );
  }

  if (!activePoint && !selectedSearchCandidate) {
    return (
      <section>
        <div
          className={`edit-gear-card ${
            compactBlankReadMode ? "px-3 py-1.5" : "px-3 py-2"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="map-desk-kicker">当前地点</p>
              <p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">
                {isBlankWorkspace || workspaceSourceType === "blank_manual"
                  ? "还没有地点。添加第一站后，地图会在这里显示顺序和路线。"
                  : "选左侧事件积木，或点地图 marker 查看当前地点。"}
              </p>
            </div>
            {!compactBlankReadMode ? (
              <span className="map-desk-chip">
                {isBlankWorkspace || workspaceSourceType === "blank_manual"
                  ? "空白中"
                  : "等待选择"}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="edit-gear-card max-h-[36vh] overflow-y-auto px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="map-desk-kicker">当前地点</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              {selectedSearchCandidate
                ? `${dayLabel} / ${slotLabel}`
                : `${dayLabel} / 第 ${activePointOrder ?? "-"} 站 / ${slotLabel}`}
            </p>
          </div>
          <span className="map-desk-chip">{statusLabel}</span>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="map-desk-card px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
              类型
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">{typeLabel}</p>
          </div>
          <div className="map-desk-card px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
              当前状态
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">{statusLabel}</p>
          </div>
        </div>

        <div className="mt-2 map-desk-card px-3 py-2.5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            地址
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{address}</p>
        </div>

        <div className="mt-2 map-desk-card px-3 py-2.5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            备注
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{noteText}</p>
        </div>

        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{sourceLabel}</p>

        {selectedSearchCandidate ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-[var(--ink-muted)]">
              加入到
            </label>
            <select
              value={targetSlot?.id ?? ""}
              onChange={(event) => onTargetSlotChange(event.target.value)}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-1.5 text-sm text-[var(--ink)]"
            >
              {slotOptions.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void onAddSelectedPlace()}
              className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)]"
            >
              {workspaceMode === "edit" ? "加入当前行程" : "切到编辑后加入"}
            </button>
          </div>
        ) : null}

        {distanceExpanded ? (
          <div className="mt-3 map-desk-card px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                距离查询
              </p>
              <span className="map-desk-chip">
                {canEstimateDistance ? "可查询" : "等待另一个地点"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={distanceTargetPointId}
                onChange={(event) => onDistanceTargetChange(event.target.value)}
                className="min-w-[14rem] rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-1.5 text-sm text-[var(--ink)]"
              >
                <option value="">选择另一个地点</option>
                {resolvedPoints
                  .filter((point) => point.id !== activePoint?.id)
                  .map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => void onEstimateDistance()}
                disabled={distanceLoading}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-1.5 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {distanceLoading ? "查询中..." : "查询距离"}
              </button>
            </div>

            {distanceSummary ? (
              <div className="mt-3 map-desk-card px-3 py-2 text-sm leading-6 text-[var(--ink-muted)]">
                <p className="font-semibold text-[var(--ink)]">
                  {distanceSummary.fromName} 到 {distanceSummary.toName}
                </p>
                <p>
                  距离约 {distanceSummary.distanceText}，预计 {distanceSummary.durationText}。
                </p>
                <p>{distanceSummary.summary}</p>
              </div>
            ) : null}

            {distanceError ? (
              <p className="mt-2 text-sm leading-6 text-[var(--dusty-rose)]">
                {distanceError}
              </p>
            ) : null}
          </div>
        ) : null}

        {mapActionMessage ? (
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {mapActionMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
