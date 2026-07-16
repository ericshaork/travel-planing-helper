import type { ReactNode } from "react";

import { safeDisplayText } from "@/lib/trip/result-overview";
import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import type { TripPlan, TripRequest } from "@/lib/trip/types";
import {
  formatWorkspaceDateRange,
  getWorkspaceEnrichmentStatusMeta,
  type WorkspaceEnrichmentState,
} from "@/lib/trip/workspace-topbar";
import type { WorkspaceMode } from "@/hooks/useTripWorkspaceState";

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
    <span className="journal-chip">
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
    <div className="inline-flex rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.78)] p-1">
      <button
        type="button"
        aria-pressed={workspaceMode === "read"}
        onClick={() => onWorkspaceModeChange("read")}
        className={`min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
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
        className={`min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
          workspaceMode === "edit"
            ? "bg-[var(--ink)] text-[var(--paper-bright)]"
            : "text-[var(--ink-muted)]"
        }`}
      >
        编辑
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
      ? "workspace-chip workspace-chip-accent"
      : status.tone === "warning"
        ? "workspace-chip workspace-chip-warm"
        : "workspace-chip";

  return (
    <section
      className={`border-b border-dashed border-[var(--line)] px-1 ${
        compactBlankReadMode ? "pb-2 pt-0" : "pb-2.5 pt-0.5"
      }`}
    >
      <div className={compactBlankReadMode ? "space-y-1.5" : "space-y-2"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="workspace-kicker">旅行档案</span>
              <span className="journal-chip">
                {tripPlan.destination || "待定目的地"}
              </span>
              <span className={statusClassName}>{status.label}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="break-words text-lg font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-xl">
                {tripPlan.tripTitle}
              </h1>
              <FactChip
                label="当前日期"
                value={activeCabinet ? `第 ${activeCabinet.dayNumber} 天` : "第 1 天"}
              />
            </div>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              {safeDisplayText(
                tripPlan.summary,
                compactBlankReadMode
                  ? "空白旅行草稿，先放进第一个想去的地方。"
                  : "先顺着这页往下读，看看这一天准备怎么走。",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ModeToggle
              workspaceMode={workspaceMode}
              onWorkspaceModeChange={onWorkspaceModeChange}
            />
            {saveAction}
            <button
              type="button"
              onClick={onFocusRegenerate}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              AI 调整
            </button>
            <button
              type="button"
              onClick={onFocusExport}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              分享
            </button>
          </div>
        </div>

        <div className={`flex flex-wrap gap-2 ${compactBlankReadMode ? "pt-0.5" : ""}`}>
          <FactChip
            label="日期"
            value={formatWorkspaceDateRange(tripRequest, tripPlan)}
          />
          <FactChip label="天数" value={`${tripPlan.days} 天`} />
          {activeCabinet?.theme ? (
            <FactChip label="当天主题" value={activeCabinet.theme} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
