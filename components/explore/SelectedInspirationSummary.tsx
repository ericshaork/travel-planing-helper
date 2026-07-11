"use client";

import type { InspirationSelection } from "@/lib/explore/types";

import { GenerateTripButton } from "./GenerateTripButton";

interface SelectedInspirationSummaryProps {
  selection: InspirationSelection;
  onGenerate: () => void | Promise<void>;
}

function entryList(values?: string[]) {
  return values && values.length > 0 ? values.join(" · ") : "Not selected";
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
          <p className="workspace-kicker">MY TRAVEL IDEA</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            Selected inspiration summary
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            This keeps the Explore hall connected to the future AI planning flow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">Location</strong>
            <div>{entryList(selection.location)}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">Food</strong>
            <div>{entryList(selection.food)}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">Season</strong>
            <div>{entryList(selection.season)}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">Companion</strong>
            <div>{entryList(selection.companion)}</div>
          </div>
        </div>

        <GenerateTripButton
          label="AI generate my trip"
          payload={{
            entry: "inspiration",
            inspirationSelection: selection,
          }}
          onGenerate={onGenerate}
          helperText={
            count > 0
              ? "This sends the Explore inspiration draft into the existing Create -> Plan -> Workspace flow."
              : "Pick one or more inspirations first, then this payload can be sent to the AI planner."
          }
          disabled={count === 0}
        />
      </div>
    </section>
  );
}
