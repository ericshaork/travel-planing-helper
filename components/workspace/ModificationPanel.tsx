import Image from "next/image";

import { ExportActions } from "@/components/trip/ExportActions";
import { ModificationQuickActions } from "@/components/trip/ModificationQuickActions";
import { PendingChangesPanel } from "@/components/trip/PendingChangesPanel";
import { RegenerateBox } from "@/components/trip/RegenerateBox";
import type {
  PendingChangeItem,
  QuickModificationType,
} from "@/lib/trip/modification-intents";
import type { GenerateTripResponse, TripPlan, TripRequest } from "@/lib/trip/types";

interface ModificationPanelProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
  pendingChanges: PendingChangeItem[];
  modificationDraft: string;
  externalDraftVersion: number;
  onRemovePendingChange: (id: string) => void;
  onClearPendingChanges: () => void;
  onWritePendingChangesToDraft: () => void;
  onQuickModification: (type: QuickModificationType) => void;
  onModificationRequestChange: (value: string) => void;
  onRegenerated: (response: GenerateTripResponse) => void;
}

export function ModificationPanel({
  tripPlan,
  tripRequest,
  pendingChanges,
  modificationDraft,
  externalDraftVersion,
  onRemovePendingChange,
  onClearPendingChanges,
  onWritePendingChangesToDraft,
  onQuickModification,
  onModificationRequestChange,
  onRegenerated,
}: ModificationPanelProps) {
  const pendingChangesCount = pendingChanges.length;

  return (
    <section
      id="result-regenerate"
      data-workspace-section="edit"
      className="space-y-4 scroll-mt-32"
    >
      <div className="workspace-panel relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute left-4 top-3 h-12 w-20 opacity-70">
          <Image
            src="/images/archive/decoration/archive-label-note.png"
            alt=""
            fill
            aria-hidden
            sizes="80px"
            className="object-contain"
          />
        </div>
        <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-85">
          <Image
            src="/images/archive/bookmark/archive-bookmark-default.png"
            alt=""
            fill
            aria-hidden
            sizes="48px"
            className="object-contain object-top"
          />
        </div>
        <div className="relative z-[1]">
          <p className="workspace-kicker">AI EDIT DESK</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            Collect edits, then ask AI to rework this version
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            This area keeps quick changes, rewrite prompts, and export together so the journal stays editable without turning into a generic form.
          </p>
          {pendingChangesCount > 0 ? (
            <div className="mt-4 inline-flex rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-1.5 text-sm font-semibold text-[var(--clay-deep)]">
              {pendingChangesCount} pending edits collected
            </div>
          ) : null}
        </div>
      </div>

      <PendingChangesPanel
        items={pendingChanges}
        onRemove={onRemovePendingChange}
        onClear={onClearPendingChanges}
        onWriteToDraft={onWritePendingChangesToDraft}
      />

      <div
        id="workspace-edit"
        className="workspace-panel px-4 py-4 shadow-[4px_4px_0_var(--sand-soft)] sm:px-5 sm:py-5"
      >
        <p className="workspace-kicker">EDIT FLOW</p>
        <h2 className="mt-2 text-xl font-semibold">
          Current plan, edit request, then AI adjustment
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          Keep the current day readable, collect what needs to change, and only then send one clear request back into regeneration.
        </p>
      </div>

      <ModificationQuickActions onSelect={onQuickModification} />

      <RegenerateBox
        tripPlan={tripPlan}
        tripRequest={tripRequest}
        modificationRequest={modificationDraft}
        externalDraftVersion={externalDraftVersion}
        onModificationRequestChange={onModificationRequestChange}
        onRegenerated={onRegenerated}
      />

      <section id="workspace-export" className="scroll-mt-32">
        <div className="workspace-panel px-4 py-4 shadow-[4px_4px_0_var(--sand-soft)] sm:px-6 sm:py-6">
          <ExportActions tripPlan={tripPlan} />
        </div>
      </section>
    </section>
  );
}
