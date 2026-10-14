import type { ReactNode } from "react";

import type { WorkspaceMode } from "@/hooks/useTripWorkspaceState";
import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import type { TripPlan, TripRequest } from "@/lib/trip/types";
import {
  formatWorkspaceDateRange,
  getWorkspaceEnrichmentStatusMeta,
  type WorkspaceEnrichmentState,
} from "@/lib/trip/workspace-topbar";

interface WorkspaceTopBarProps {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
  activeCabinet?: DayCabinetView;
  enrichmentState?: WorkspaceEnrichmentState;
  workspaceMode: WorkspaceMode;
  compactBlankReadMode?: boolean;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  onFocusExport?: () => void;
  onFocusRegenerate?: () => void;
  saveAction?: ReactNode;
}

function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="workbench-metadata-chip journal-chip py-0.5 text-[10px]">
      <span>{label}</span>
      <span className="text-[var(--ink)]">{value}</span>
    </span>
  );
}

function ModeToggle({
  workspaceMode,
  onWorkspaceModeChange,
}: Pick<WorkspaceTopBarProps, "workspaceMode" | "onWorkspaceModeChange">) {
  return (
    <div className="workbench-mode-toggle inline-flex rounded-full p-0.5">
      <button
        type="button"
        aria-pressed={workspaceMode === "read"}
        onClick={() => onWorkspaceModeChange("read")}
        className={`workbench-mode-button min-h-6 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
          workspaceMode === "read"
            ? "bg-[var(--ink)] text-[var(--paper-bright)]"
            : "text-[var(--ink-muted)]"
        }`}
      >
        阅读
      </button>
      <button
        type="button"
        aria-pressed={workspaceMode === "edit"}
        onClick={() => onWorkspaceModeChange("edit")}
        className={`workbench-mode-button min-h-6 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
          workspaceMode === "edit"
            ? "bg-[var(--ink)] text-[var(--paper-bright)]"
            : "text-[var(--ink-muted)]"
        }`}
      >
        编辑
      </button>
      <button
        type="button"
        aria-pressed={workspaceMode === "map"}
        onClick={() => onWorkspaceModeChange("map")}
        className={`workbench-mode-button min-h-6 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
          workspaceMode === "map"
            ? "bg-[var(--ink)] text-[var(--paper-bright)]"
            : "text-[var(--ink-muted)]"
        }`}
      >
        地图探索
      </button>
    </div>
  );
}

export function WorkspaceTopBar({
  tripPlan,
  tripRequest,
  activeCabinet,
  enrichmentState = "idle",
  workspaceMode,
  compactBlankReadMode = false,
  onWorkspaceModeChange,
  onFocusExport,
  onFocusRegenerate,
  saveAction,
}: WorkspaceTopBarProps) {
  const status = getWorkspaceEnrichmentStatusMeta(enrichmentState);
  const statusClassName =
    status.tone === "ready"
      ? "workspace-chip workspace-chip-accent py-1 text-[11px]"
      : status.tone === "warning"
        ? "workspace-chip workspace-chip-warm py-1 text-[11px]"
        : "workspace-chip py-1 text-[11px]";

  return (
    <section
      className={`workbench-command-bar rounded-none px-4 ${
        compactBlankReadMode ? "py-1.5" : "py-1.5"
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="workspace-kicker shrink-0">旅行档案</span>
          <h1 className="min-w-[10rem] max-w-[28rem] truncate text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">
            {tripPlan.tripTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-1">
            <span className="workbench-metadata-chip journal-chip py-0.5 text-[10px]">
              {tripPlan.destination || "目的地待定"}
            </span>
            <span className={statusClassName}>{status.label}</span>
            <FactChip
              label="当前"
              value={activeCabinet ? `第 ${activeCabinet.dayNumber} 天` : "第 1 天"}
            />
            <FactChip
              label="日期"
              value={formatWorkspaceDateRange(tripRequest, tripPlan)}
            />
            <FactChip label="天数" value={`${tripPlan.days} 天`} />
            {activeCabinet?.theme ? (
              <FactChip label="主题" value={activeCabinet.theme} />
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <ModeToggle
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={onWorkspaceModeChange}
          />
          {saveAction}
          <button
            type="button"
            onClick={onFocusRegenerate}
            className="workbench-action-pill inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            AI 调整
          </button>
          <button
            type="button"
            onClick={onFocusExport}
            className="workbench-action-pill inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            分享
          </button>
        </div>
      </div>
    </section>
  );
}
