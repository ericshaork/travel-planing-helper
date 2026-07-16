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
  isBlankWorkspace?: boolean;
  hasStops?: boolean;
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
  isBlankWorkspace = false,
  hasStops = false,
  onRemovePendingChange,
  onClearPendingChanges,
  onWritePendingChangesToDraft,
  onQuickModification,
  onModificationRequestChange,
  onRegenerated,
}: ModificationPanelProps) {
  const pendingChangesCount = pendingChanges.length;
  const shouldShowExport = hasStops;
  const aiSummary = isBlankWorkspace
    ? "补全旅行需求后，可以让 AI 帮你扩展行程。"
    : "想整体调轻松、加美食或少走路时，再展开这里。";

  return (
    <section className="space-y-3 scroll-mt-32">
      <div className="cabinet-door px-4 py-4 sm:px-5">
        <p className="workspace-kicker">编辑草稿</p>
        <h2 className="mt-1.5 text-xl font-semibold text-[var(--ink)]">
          {isBlankWorkspace ? "先把这份空白旅行搭起来" : "继续整理这份行程"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          {isBlankWorkspace
            ? "先加地点、补备注，再决定要不要交给 AI 一起扩展。"
            : "先在左侧改地点和顺序，AI 调整和导出放在下面慢慢处理。"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="journal-chip">待调整 {pendingChangesCount} 项</span>
          <span className="journal-chip">
            {tripRequest ? "可用 AI 补全" : "先补旅行需求"}
          </span>
        </div>
      </div>

      <details
        className="cabinet-door overflow-hidden"
        open={pendingChangesCount > 0}
      >
        <summary className="cursor-pointer list-none px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="workspace-kicker">待调整内容</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                先收集要改的地点，再统一交给 AI。
              </p>
            </div>
            <span className="journal-chip">{pendingChangesCount} 项</span>
          </div>
        </summary>
        <div className="px-4 pb-4 sm:px-5">
          <PendingChangesPanel
            items={pendingChanges}
            onRemove={onRemovePendingChange}
            onClear={onClearPendingChanges}
            onWriteToDraft={onWritePendingChangesToDraft}
          />
        </div>
      </details>

      <details
        id="workspace-ai-assist"
        className="cabinet-door overflow-hidden"
      >
        <summary className="cursor-pointer list-none px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="workspace-kicker">AI 帮我补全</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                {aiSummary}
              </p>
            </div>
            <span className="journal-chip">
              {tripRequest ? "可展开" : "信息还少"}
            </span>
          </div>
        </summary>
        <div className="space-y-3 px-4 pb-4 sm:px-5">
          <ModificationQuickActions onSelect={onQuickModification} />
          <RegenerateBox
            tripPlan={tripPlan}
            tripRequest={tripRequest}
            modificationRequest={modificationDraft}
            externalDraftVersion={externalDraftVersion}
            onModificationRequestChange={onModificationRequestChange}
            onRegenerated={onRegenerated}
          />
        </div>
      </details>

      {shouldShowExport ? (
        <details
          id="workspace-export"
          className="cabinet-door overflow-hidden scroll-mt-32"
        >
          <summary className="cursor-pointer list-none px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="workspace-kicker">导出与保存</p>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  行程成形后，再从这里复制或下载。
                </p>
              </div>
              <span className="journal-chip">已后置</span>
            </div>
          </summary>
          <div className="px-4 pb-4 sm:px-5">
            <div className="workspace-panel px-4 py-4 shadow-[4px_4px_0_var(--sand-soft)] sm:px-6 sm:py-6">
              <ExportActions tripPlan={tripPlan} />
            </div>
          </div>
        </details>
      ) : null}
    </section>
  );
}
