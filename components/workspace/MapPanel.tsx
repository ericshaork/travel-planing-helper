"use client";

import { useEffect, useRef, useState } from "react";

import type {
  WorkspaceDistanceSummary,
  WorkspaceMode,
} from "@/hooks/useTripWorkspaceState";
import type { PoiCandidate } from "@/lib/poi/types";
import { getUserSettings } from "@/lib/settings/client";
import type { WorkspacePreferences } from "@/lib/settings/types";
import type { MapPoint } from "@/lib/trip/enrichment-types";
import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type { WorkspaceSessionSourceType } from "@/lib/trip/storage";
import {
  buildWorkspaceInsightStats,
  formatRouteDistance,
} from "@/lib/trip/workspace-inspector";

import { InspectorMapPreview } from "./InspectorMapPreview";
import { InspectorPointDetailCard } from "./InspectorPointDetailCard";
import { WorkspaceInspector } from "./WorkspaceInspector";

interface MapPanelProps {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace?: boolean;
  hasStops?: boolean;
  compactBlankReadMode?: boolean;
  activeCabinet?: DayCabinetView;
  insight?: DayRouteInsight;
  loading?: boolean;
  errorMessage?: string;
  activePointId?: string | null;
  unmatchedPlaceName?: string | null;
  workspaceMode: WorkspaceMode;
  searchCity?: string;
  searchKeyword: string;
  searchResults: PoiCandidate[];
  searchWarnings: string[];
  searchLoading: boolean;
  searchError?: string;
  selectedSearchCandidate?: PoiCandidate | null;
  pendingSearchCandidate?: PoiCandidate | null;
  targetSlotId?: string | null;
  distanceTargetPointId: string;
  distanceSummary?: WorkspaceDistanceSummary | null;
  distanceLoading: boolean;
  distanceError?: string;
  mapActionMessage?: string;
  resolvedPoints: MapPoint[];
  onSearchKeywordChange: (value: string) => void;
  onSearchSubmit: () => void | Promise<void>;
  onSearchResultSelect: (candidate: PoiCandidate) => void;
  onSearchClear: () => void;
  onTargetSlotChange: (slotId: string) => void;
  onAddSelectedPlace: () => void;
  onDistanceTargetChange: (pointId: string) => void;
  onEstimateDistance: () => void | Promise<void>;
  onPointSelect?: (pointId: string) => void;
}

function ToolbarButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`map-desk-toolbar min-h-[1.8rem] px-2 py-0.5 text-[10px] ${
        active
          ? "!border-[var(--clay-deep)] !bg-[rgb(255_253_247_/_0.96)] !text-[var(--ink)]"
          : ""
      }`}
    >
      {label}
    </button>
  );
}

function buildPaneDescription({
  insight,
  isBlankWorkspace,
  activeCabinet,
  hasStops,
}: Pick<
  MapPanelProps,
  "insight" | "isBlankWorkspace" | "activeCabinet" | "hasStops"
>) {
  if (insight) {
    return `${insight.dayTitle}${insight.date ? ` / ${insight.date}` : ""}`;
  }

  if (isBlankWorkspace) {
    return "还没有地点";
  }

  if (activeCabinet && hasStops) {
    return `第 ${activeCabinet.dayNumber} 天`;
  }

  return "跟随左侧行程";
}

export function shouldDefaultMapInspectorOpen(
  mapOverlay: WorkspacePreferences["mapOverlay"],
) {
  return mapOverlay === "expanded";
}

export function MapPanel({
  workspaceSourceType,
  isBlankWorkspace = false,
  hasStops = false,
  compactBlankReadMode = false,
  activeCabinet,
  insight,
  loading = false,
  errorMessage,
  activePointId = null,
  unmatchedPlaceName = null,
  workspaceMode,
  searchCity,
  searchKeyword,
  searchResults,
  searchWarnings,
  searchLoading,
  searchError,
  selectedSearchCandidate = null,
  pendingSearchCandidate = null,
  targetSlotId = null,
  distanceTargetPointId,
  distanceSummary = null,
  distanceLoading,
  distanceError,
  mapActionMessage,
  resolvedPoints,
  onSearchKeywordChange,
  onSearchSubmit,
  onSearchResultSelect,
  onSearchClear,
  onTargetSlotChange,
  onAddSelectedPlace,
  onDistanceTargetChange,
  onEstimateDistance,
  onPointSelect,
}: MapPanelProps) {
  const inspectorTouchedRef = useRef(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDistanceOpen, setIsDistanceOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [routeHint, setRouteHint] = useState<string>();
  const stats = buildWorkspaceInsightStats(insight);
  const visibleErrorMessage = isBlankWorkspace ? undefined : errorMessage;
  const slotOptions = activeCabinet?.slots ?? [];
  const showMapTools = !compactBlankReadMode;

  useEffect(() => {
    let cancelled = false;

    void getUserSettings()
      .then((settings) => {
        if (cancelled || inspectorTouchedRef.current) {
          return;
        }

        setIsInspectorOpen(
          shouldDefaultMapInspectorOpen(settings.workspacePreferences.mapOverlay),
        );
      })
      .catch(() => {
        // Keep the default collapsed state when settings are unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleInspectorToggle() {
    inspectorTouchedRef.current = true;
    setIsInspectorOpen((current) => !current);
  }

  function handleInspectorClose() {
    inspectorTouchedRef.current = true;
    setIsInspectorOpen(false);
  }

  const handlePreviewMarkerClick = (pointId: string) => {
    if (pointId.startsWith("draft-")) {
      return;
    }

    onPointSelect?.(pointId);
  };

  const hasPointOverlay = Boolean(
    selectedSearchCandidate ||
      activePointId ||
      unmatchedPlaceName ||
      mapActionMessage,
  );

  return (
    <section
      id="workspace-route-insight"
      className="workbench-map-frame map-workspace-shell relative h-full min-h-0 overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden">
        <InspectorMapPreview
          workspaceSourceType={workspaceSourceType}
          isBlankWorkspace={isBlankWorkspace}
          insight={insight}
          loading={loading}
          errorMessage={visibleErrorMessage}
          activePointId={activePointId}
          selectedSearchCandidate={selectedSearchCandidate}
          pendingSearchCandidate={pendingSearchCandidate}
          onMarkerClick={handlePreviewMarkerClick}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-2 z-[5] sm:inset-x-4">
        <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-2">
          <div className="sr-only" aria-live="polite">
            {`桌面地图，${buildPaneDescription({
              insight,
              isBlankWorkspace,
              activeCabinet,
              hasStops,
            })}，${workspaceMode === "edit" ? "编辑中" : "阅读中"}，${
              insight?.mapPoints.length ?? 0
            } 个地点，${
              insight?.routeSummary
                ? formatRouteDistance(stats.totalDistanceMeters)
                : "等待路线"
            }`}
          </div>

          {showMapTools ? (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <ToolbarButton
                label="搜搜地点"
                active={isSearchOpen}
                onClick={() => setIsSearchOpen((current) => !current)}
              />
              <ToolbarButton
                label="量量距离"
                active={isDistanceOpen}
                onClick={() => setIsDistanceOpen((current) => !current)}
              />
              <ToolbarButton
                label="整条路线"
                active={isInspectorOpen}
                onClick={handleInspectorToggle}
              />
              <ToolbarButton
                label="优化路线"
                onClick={() =>
                  setRouteHint(
                    resolvedPoints.length >= 2
                      ? "路线优化会在后续版本继续补上。"
                      : "先选中至少 2 个已定位地点，再使用路线优化。",
                  )
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      {isSearchOpen && showMapTools ? (
        <section className="map-desk-overlay absolute left-3 top-[5.5rem] z-[6] max-h-[40%] w-[min(22rem,calc(100%-1.5rem))] overflow-hidden px-3 py-3 shadow-[0_18px_40px_rgba(45,36,29,0.12)] sm:left-4 sm:top-[5.75rem]">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchKeyword}
              onChange={(event) => onSearchKeywordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onSearchSubmit();
                }
              }}
              placeholder={
                searchCity
                  ? `在 ${searchCity} 搜索地点`
                  : "先确认目的地，再搜索地点"
              }
              className="min-w-[12rem] flex-1 rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
            />
            <button
              type="button"
              onClick={() => void onSearchSubmit()}
              disabled={searchLoading}
              className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {searchLoading ? "搜索中..." : "搜索"}
            </button>
            <button
              type="button"
              onClick={onSearchClear}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              清空
            </button>
          </div>

          <div className="mt-3 max-h-[calc(40vh-7.5rem)] overflow-y-auto pr-1">
            {searchError ? (
              <p className="text-sm leading-6 text-[var(--dusty-rose)]">
                {searchError}
              </p>
            ) : null}

            {searchWarnings.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {searchWarnings.map((warning) => (
                  <span key={warning} className="map-desk-chip">
                    {warning}
                  </span>
                ))}
              </div>
            ) : null}

            {searchResults.length > 0 ? (
              <div className="grid gap-2">
                {searchResults.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => onSearchResultSelect(candidate)}
                    className={`map-desk-card px-3 py-2 text-left transition-colors ${
                      selectedSearchCandidate?.id === candidate.id
                        ? "!border-[var(--clay-deep)] !bg-[rgb(255_253_247_/_0.96)]"
                        : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {candidate.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                      {candidate.address || "地址待补充"}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            {!searchLoading &&
            !searchError &&
            searchKeyword.trim() &&
            searchResults.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                暂无结果，试试更具体一点的地点名。
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {routeHint && showMapTools ? (
        <div className="pointer-events-none absolute right-3 top-[5.5rem] z-[5] w-[min(18rem,calc(100%-1.5rem))] sm:right-4 sm:top-[5.75rem]">
          <div className="map-desk-card px-3 py-2 text-sm leading-6 text-[var(--ink-muted)]">
            {routeHint}
          </div>
        </div>
      ) : null}

      {isInspectorOpen && showMapTools ? (
        <div className="absolute right-3 top-[8.75rem] z-[6] max-h-[48%] w-[min(22rem,calc(100%-1.5rem))] overflow-hidden sm:right-4">
          <div className="map-desk-overlay h-full overflow-hidden px-2 py-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="edit-kicker">整条路线</p>
              <button
                type="button"
                onClick={handleInspectorClose}
                className="map-desk-chip"
              >
                收起
              </button>
            </div>
            <div className="max-h-[calc(48vh-4.5rem)] overflow-y-auto pr-1">
              <WorkspaceInspector
                workspaceSourceType={workspaceSourceType}
                isBlankWorkspace={isBlankWorkspace}
                hasStops={hasStops}
                compactBlankReadMode={compactBlankReadMode}
                insight={insight}
                errorMessage={visibleErrorMessage}
                activePointId={activePointId}
                onPointSelect={onPointSelect}
                floating
              />
            </div>
          </div>
        </div>
      ) : null}

      {hasPointOverlay ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[6] sm:inset-x-4">
          <div className="pointer-events-auto">
            <InspectorPointDetailCard
              workspaceSourceType={workspaceSourceType}
              isBlankWorkspace={isBlankWorkspace}
              compactBlankReadMode={compactBlankReadMode}
              insight={insight}
              activePointId={activePointId}
              unmatchedPlaceName={unmatchedPlaceName}
              workspaceMode={workspaceMode}
              activeCabinet={activeCabinet}
              selectedSearchCandidate={selectedSearchCandidate}
              targetSlotId={targetSlotId}
              slotOptions={slotOptions}
              distanceTargetPointId={distanceTargetPointId}
              distanceSummary={distanceSummary}
              distanceLoading={distanceLoading}
              distanceError={distanceError}
              mapActionMessage={mapActionMessage}
              resolvedPoints={resolvedPoints}
              distanceExpanded={isDistanceOpen}
              onTargetSlotChange={onTargetSlotChange}
              onAddSelectedPlace={onAddSelectedPlace}
              onDistanceTargetChange={onDistanceTargetChange}
              onEstimateDistance={onEstimateDistance}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
