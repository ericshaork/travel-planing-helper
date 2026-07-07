import Link from "next/link";
import type { ReactNode } from "react";

import { safeDisplayText } from "@/lib/trip/result-overview";
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
  onFocusExport?: () => void;
  onFocusRegenerate?: () => void;
  onStartNewTrip?: () => void;
  saveAction?: ReactNode;
}

function FactCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={`workspace-panel-soft px-4 py-3 ${
        tone === "accent" ? "border-[var(--sage-deep)] bg-[var(--sage-soft)]" : ""
      }`}
    >
      <p className="workspace-kicker">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-[var(--ink)] sm:text-base">
        {value}
      </p>
    </div>
  );
}

export function WorkspaceTopBar({
  tripPlan,
  tripRequest,
  activeCabinet,
  enrichmentState = "idle",
  onFocusExport,
  onFocusRegenerate,
  onStartNewTrip,
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
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="workspace-kicker">PLAN BAR</p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <h1 className="break-words text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">
              {tripPlan.tripTitle}
            </h1>
            <span className={statusClassName}>{status.label}</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
            {safeDisplayText(
              tripPlan.summary,
              "先看清这趟旅行的主线，再决定哪一天需要重点改、重排或导出。",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 text-sm">
          {saveAction}
          <Link
            href="/plan"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2.5 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            返回修改信息
          </Link>
          <Link
            href="/create"
            onClick={onStartNewTrip}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2.5 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            创建新计划
          </Link>
          <button
            type="button"
            onClick={onFocusRegenerate}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            重新生成
          </button>
          <button
            type="button"
            onClick={onFocusExport}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2.5 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            导出方案
          </button>
        </div>
      </div>

      <div className="relative z-[1] mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FactCard label="目的地" value={tripPlan.destination} />
          <FactCard label="天数" value={`${tripPlan.days} 天`} />
          <FactCard
            label="日期"
            value={formatWorkspaceDateRange(tripRequest, tripPlan)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FactCard label="预算" value={tripPlan.budgetSummary.totalEstimate} />
          <FactCard
            label="当前 Day"
            value={
              activeCabinet
                ? `Day ${activeCabinet.dayNumber} · ${activeCabinet.theme}`
                : "等待选择当前 Day"
            }
            tone="accent"
          />
        </div>

        <div className="workspace-panel-soft px-4 py-3">
          <p className="workspace-kicker">NEXT STEP</p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
            顶部先放判断信息，真正的修改、导出和路线检查继续留在下方工作区。
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            这样中间不会被工具按钮挤满，视线会更稳，也更像一张正在处理中、可以继续推敲的旅行工作台。
          </p>
        </div>
      </div>
    </section>
  );
}
