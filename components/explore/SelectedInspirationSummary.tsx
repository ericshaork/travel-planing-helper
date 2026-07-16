"use client";

import type { InspirationSelection } from "@/lib/explore/types";

import { GenerateTripButton } from "./GenerateTripButton";

interface SelectedInspirationSummaryProps {
  selection: InspirationSelection;
  onGenerate: () => void | Promise<void>;
}

function entryList(values?: string[]) {
  return values && values.length > 0 ? values.join("、") : "还没选择";
}

function totalSelections(selection: InspirationSelection) {
  return (
    (selection.location?.length ?? 0) +
    (selection.food?.length ?? 0) +
    (selection.season?.length ?? 0) +
    (selection.companion?.length ?? 0)
  );
}

export function SelectedInspirationSummary({
  selection,
  onGenerate,
}: SelectedInspirationSummaryProps) {
  const count = totalSelections(selection);

  return (
    <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        <div>
          <p className="workspace-kicker">我的旅行灵感</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            已选灵感小结
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            这些选择会带入创建流程，作为 AI 排行程的偏好。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">地点</strong>
            <div>{entryList(selection.location)}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">美食</strong>
            <div>{entryList(selection.food)}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">季节</strong>
            <div>{entryList(selection.season)}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">同行方式</strong>
            <div>{entryList(selection.companion)}</div>
          </div>
        </div>

        <GenerateTripButton
          label="AI 帮我生成行程"
          payload={{
            entry: "inspiration",
            inspirationSelection: selection,
          }}
          onGenerate={onGenerate}
          helperText={
            count > 0
              ? "会把这份灵感草稿送进创建流程，生成后进入 Workspace。"
              : "先选择一个或多个灵感，再让 AI 帮你排一版。"
          }
          disabled={count === 0}
        />
      </div>
    </section>
  );
}
