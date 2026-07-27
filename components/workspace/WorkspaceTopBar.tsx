import type { ReactNode } from "react";

import type { WorkspaceMode } from "@/hooks/useTripWorkspaceState";
import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import { safeDisplayText } from "@/lib/trip/result-overview";
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
    <span className="journal-chip py-1 text-[11px]">
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
    <div className="inline-flex rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.78)] p-0.5">
      <button
        type="button"
        aria-pressed={workspaceMode === "read"}
        onClick={() => onWorkspaceModeChange("read")}
        className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
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
        className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
          workspaceMode === "edit"
            ? "bg-[var(--ink)] text-[var(--paper-bright)]"
            : "text-[var(--ink-muted)]"
        }`}
      >
        编辑
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="地图探索会在 2.0 开放"
        className="min-h-8 rounded-full px-3 text-xs font-semibold text-[var(--ink-faint)] disabled:cursor-not-allowed disabled:opacity-70"
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
      className={`rounded-[18px] border border-[rgba(158,136,110,0.16)] bg-[linear-gradient(180deg,rgba(255,253,247,0.82)_0%,rgba(248,241,228,0.62)_100%)] px-3 shadow-[0_8px_18px_rgba(84,71,53,0.04)] ${
        compactBlankReadMode ? "py-2" : "py-2.5"
      }`}
    >
      <div className="space-y-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="workspace-kicker shrink-0">旅行档案</span>
            <h1 className="min-w-[12rem] max-w-[34rem] truncate text-base font-semibold tracking-[-0.03em] text-[var(--ink)] xl:text-lg">
              {tripPlan.tripTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="journal-chip py-1 text-[11px]">
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

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <ModeToggle
              workspaceMode={workspaceMode}
              onWorkspaceModeChange={onWorkspaceModeChange}
            />
            {saveAction}
            <button
              type="button"
              onClick={onFocusRegenerate}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              AI 调整
            </button>
            <button
              type="button"
              onClick={onFocusExport}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              分享
            </button>
          </div>
        </div>

        <p className="line-clamp-1 max-w-5xl text-xs leading-5 text-[var(--ink-muted)]">
          {safeDisplayText(
            tripPlan.summary,
            compactBlankReadMode
              ? "空白旅行草稿，先放进第一个想去的地方。"
              : "先顺着这一页往下看，看看这一天准备怎么走。",
          )}
        </p>
      </div>
    </section>
  );
}
