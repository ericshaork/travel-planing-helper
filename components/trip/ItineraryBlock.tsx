import { useState, type DragEvent, type KeyboardEvent, type SyntheticEvent } from "react";

import type { ItineraryBlockView } from "../../lib/trip/itinerary-view";
import type { ItineraryBlockMapStatus } from "../../lib/trip/map-point-match";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";
import type { ItineraryItemType } from "../../lib/trip/types";

import { BlockActions } from "./BlockActions";

interface ItineraryBlockProps {
  block: ItineraryBlockView;
  onAction?: (actionType: PendingChangeAction, block: ItineraryBlockView) => void;
  onUpdate?: (updates: { placeName: string; reason: string }) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSelect?: () => void;
  onDragStart?: (block: ItineraryBlockView) => void;
  onDragEnd?: () => void;
  mapStatus?: ItineraryBlockMapStatus | null;
  showActions?: boolean;
}

const ITEM_TYPE_LABELS: Record<ItineraryItemType, string> = {
  attraction: "景点",
  food: "美食",
  transport: "移动",
  hotel: "住宿",
  free_time: "自由活动",
  shopping: "逛街",
  other: "安排",
};

const MAP_STATUS_LABELS: Record<
  Exclude<ItineraryBlockMapStatus, "unmatched">,
  string
> = {
  confirmed: "地图已定位",
  unresolved: "位置待确认",
};

export function stopBlockSelectionPropagation(
  event: Pick<SyntheticEvent, "stopPropagation">,
) {
  event.stopPropagation();
}

export function ItineraryBlock({
  block,
  onAction,
  onUpdate,
  onDelete,
  isSelected = false,
  isExpanded = false,
  onToggleExpand,
  onSelect,
  onDragStart,
  onDragEnd,
  mapStatus = null,
  showActions = true,
}: ItineraryBlockProps) {
  const { item } = block;
  const [isEditing, setIsEditing] = useState(false);
  const [draftPlaceName, setDraftPlaceName] = useState(item.placeName);
  const [draftReason, setDraftReason] = useState(item.reason);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSelectable = Boolean(onSelect);
  const canInlineEdit = Boolean(showActions && onUpdate);
  const shortReason =
    item.reason.length > 44 ? `${item.reason.slice(0, 44).trimEnd()}…` : item.reason;
  const visibleMapStatus =
    mapStatus === "confirmed" || mapStatus === "unresolved" ? mapStatus : null;

  function handleInnerInteraction(event: SyntheticEvent) {
    stopBlockSelectionPropagation(event);
  }

  function handleSelectKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onSelect || isEditing) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  function startEditing(event?: SyntheticEvent) {
    if (!canInlineEdit) {
      return;
    }

    if (event) {
      handleInnerInteraction(event);
    }

    setDraftPlaceName(item.placeName);
    setDraftReason(item.reason);
    setConfirmDelete(false);
    setIsEditing(true);
  }

  function cancelEditing(event?: SyntheticEvent) {
    if (event) {
      handleInnerInteraction(event);
    }

    setDraftPlaceName(item.placeName);
    setDraftReason(item.reason);
    setIsEditing(false);
  }

  function saveEditing(event?: SyntheticEvent) {
    if (event) {
      handleInnerInteraction(event);
    }

    const nextPlaceName = draftPlaceName.trim() || item.placeName || "新的地点";
    const nextReason = draftReason.trim() || "补一句为什么想去这里。";

    onUpdate?.({
      placeName: nextPlaceName,
      reason: nextReason,
    });
    setIsEditing(false);
  }

  function handleEditorKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing(event);
      return;
    }

    if (
      event.key === "Enter" &&
      !(event.currentTarget instanceof HTMLTextAreaElement && event.shiftKey)
    ) {
      event.preventDefault();
      saveEditing(event);
    }
  }

  function handleDragStart(event: DragEvent<HTMLElement>) {
    if (!showActions) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", block.ref.placeName);
    onDragStart?.(block);
  }

  function handleDragEnd() {
    onDragEnd?.();
  }

  return (
    <article
      className={`relative min-w-0 rounded-[18px] border border-[rgb(142_139_127_/_16%)] bg-[rgb(255_253_247_/_0.82)] px-3.5 py-3 transition-colors duration-150 ease-out ${
        isSelected
          ? "border-[var(--clay-deep)] bg-[linear-gradient(180deg,rgba(249,241,226,0.92)_0%,rgba(255,253,247,0.98)_100%)] shadow-[2px_3px_0_var(--sand)]"
          : "hover:border-[var(--line-strong)]"
      } ${isSelectable && !isEditing ? "cursor-pointer" : ""}`}
      role={isSelectable && !isEditing ? "button" : undefined}
      tabIndex={isSelectable && !isEditing ? 0 : undefined}
      aria-pressed={isSelectable ? isSelected : undefined}
      draggable={showActions}
      onClick={isEditing ? undefined : onSelect}
      onDoubleClick={canInlineEdit ? startEditing : undefined}
      onKeyDown={handleSelectKeyDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
              {ITEM_TYPE_LABELS[item.type]}
            </span>
            {item.timeLabel ? (
              <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                {item.timeLabel}
              </span>
            ) : null}
            {visibleMapStatus ? (
              <span className="rounded-full border border-[var(--line)] bg-[var(--paper-bright)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink)]">
                {MAP_STATUS_LABELS[visibleMapStatus]}
              </span>
            ) : null}
            {showActions ? (
              <span className="rounded-full border border-dashed border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                可拖动
              </span>
            ) : null}
          </div>

          {isEditing ? (
            <div
              className="mt-3 space-y-3"
              onClickCapture={handleInnerInteraction}
              onDoubleClickCapture={handleInnerInteraction}
            >
              <label className="block">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                  地点名称
                </span>
                <input
                  value={draftPlaceName}
                  onChange={(event) => setDraftPlaceName(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  className="mt-1.5 w-full rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
                  placeholder="新的地点"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                  这一站备注
                </span>
                <textarea
                  value={draftReason}
                  onChange={(event) => setDraftReason(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  rows={4}
                  className="mt-1.5 w-full rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
                  placeholder="写一句为什么想去这里，或者留个小提醒。"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveEditing}
                  className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-[var(--paper-bright)]"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)]"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-2">
                <h4 className="min-w-0 break-words text-[15px] font-semibold sm:text-base">
                  {item.placeName}
                </h4>
                <p className="mt-1 break-words text-sm leading-6 text-[var(--ink-muted)]">
                  {isExpanded ? item.reason : shortReason}
                </p>
              </div>

              {isExpanded && item.matchedInterests && item.matchedInterests.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.matchedInterests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="max-w-full break-words rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-muted)]"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        {!isEditing ? (
          <div className="flex shrink-0 items-center gap-2">
            {showActions ? (
              <button
                type="button"
                onClick={startEditing}
                onClickCapture={handleInnerInteraction}
                className="rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                编辑
              </button>
            ) : null}
            <button
              type="button"
              onClickCapture={handleInnerInteraction}
              onClick={onToggleExpand}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)]"
            >
              {isExpanded ? "收起" : "更多"}
            </button>
          </div>
        ) : null}
      </div>

      {!isEditing && isExpanded ? (
        <div className="mt-3 border-t border-dashed border-[var(--line)] pt-3">
          {item.transportFromPrevious ||
          item.weatherImpact ||
          item.backupPlan ||
          item.suggestedDuration ? (
            <dl className="grid gap-2 text-xs leading-5 text-[var(--ink-muted)]">
              {item.suggestedDuration ? (
                <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--ink)]">停留时间</dt>
                  <dd className="break-words">{item.suggestedDuration}</dd>
                </div>
              ) : null}
              {item.transportFromPrevious ? (
                <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--ink)]">怎么过去</dt>
                  <dd className="break-words">{item.transportFromPrevious}</dd>
                </div>
              ) : null}
              {item.weatherImpact ? (
                <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--ink)]">天气提醒</dt>
                  <dd className="break-words">{item.weatherImpact}</dd>
                </div>
              ) : null}
              {item.backupPlan ? (
                <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--ink)]">备选方案</dt>
                  <dd className="break-words">{item.backupPlan}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {item.guide.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
              {item.guide.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span aria-hidden="true" className="text-[var(--clay)]">
                    -
                  </span>
                  <span className="break-words">{tip}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {showActions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  onClickCapture={handleInnerInteraction}
                  className="rounded-full border border-dashed border-[var(--clay)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)]"
                >
                  删除
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onDelete}
                    onClickCapture={handleInnerInteraction}
                    className="rounded-full border border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)]"
                  >
                    确认删除
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    onClickCapture={handleInnerInteraction}
                    className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
                  >
                    先不删
                  </button>
                </>
              )}
            </div>
          ) : null}

          {showActions && onAction ? (
            <BlockActions
              onAction={(actionType) => onAction(actionType, block)}
              onInteraction={handleInnerInteraction}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
