import Image from "next/image";
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
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  onFocusExport?: () => void;
  onFocusRegenerate?: () => void;
  saveAction?: ReactNode;
}

function ModeButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`workspace-panel-soft min-w-[12rem] px-4 py-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
        active
          ? "border-[var(--ink)] bg-[linear-gradient(180deg,rgba(252,245,231,0.98)_0%,rgba(255,253,247,0.98)_100%)] shadow-[4px_4px_0_var(--sand)]"
          : "hover:border-[var(--line-strong)]"
      }`}
    >
      <p className="workspace-kicker">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
        {description}
      </p>
    </button>
  );
}

function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-3 py-1.5 text-sm text-[var(--ink)]">
      <span className="text-[var(--ink-muted)]">{label}</span>
      {` · ${value}`}
    </span>
  );
}

export function WorkspaceTopBar({
  tripPlan,
  tripRequest,
  activeCabinet,
  enrichmentState = "idle",
  workspaceMode,
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
  const actionButtonClassName =
    workspaceMode === "read"
      ? "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-4 py-2.5 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
      : "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  return (
    <section className="workspace-panel relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-25">
        <Image
          src="/images/ui/background/paper-noise-soft.png"
          alt=""
          fill
          aria-hidden
          sizes="1200px"
          className="object-cover object-top"
        />
      </div>
      <div className="pointer-events-none absolute right-5 top-0 h-16 w-12 opacity-85">
        <Image
          src="/images/archive/bookmark/archive-bookmark-active.png"
          alt=""
          fill
          aria-hidden
          sizes="48px"
          className="object-contain object-top"
        />
      </div>

      <div className="relative z-[1] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src="/images/brand/logo/logo-horizontal.png"
                alt="Wanderly"
                width={136}
                height={38}
                className="h-[38px] w-auto"
              />
              <span className="workspace-chip">{tripPlan.destination}</span>
              <span className={statusClassName}>{status.label}</span>
            </div>

            <h1 className="mt-3 break-words text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">
              {tripPlan.tripTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
              {safeDisplayText(
                tripPlan.summary,
                "Keep this trip readable first, then switch into editing when you are ready.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2.5 text-sm">
            {saveAction}
            <button
              type="button"
              onClick={onFocusRegenerate}
              className={actionButtonClassName}
            >
              AI调整
            </button>
            <button
              type="button"
              onClick={onFocusExport}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-4 py-2.5 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              分享
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <FactChip
            label="日期"
            value={formatWorkspaceDateRange(tripRequest, tripPlan)}
          />
          <FactChip label="天数" value={`${tripPlan.days} 天`} />
          <FactChip
            label="当前 Day"
            value={
              activeCabinet
                ? `Day ${activeCabinet.dayNumber}`
                : "等待选择"
            }
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <ModeButton
            active={workspaceMode === "read"}
            label="Read Mode"
            description="像翻一本旅行杂志，先顺着 Day 时间线阅读行程。"
            onClick={() => onWorkspaceModeChange("read")}
          />
          <ModeButton
            active={workspaceMode === "edit"}
            label="Edit Mode"
            description="像整理旅行手帐，先保留同一份行程，再逐步进入编辑。"
            onClick={() => onWorkspaceModeChange("edit")}
          />
        </div>
      </div>
    </section>
  );
}
