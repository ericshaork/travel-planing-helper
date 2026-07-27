import { useState, type DragEvent, type KeyboardEvent, type SyntheticEvent } from "react";

import type {
  ItineraryBlockUpdate,
  ItineraryBlockView,
} from "../../lib/trip/itinerary-view";
import type { ItineraryBlockMapStatus } from "../../lib/trip/map-point-match";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";
import type { ItineraryItemType } from "../../lib/trip/types";

import { BlockActions } from "./BlockActions";

interface ItineraryBlockProps {
  block: ItineraryBlockView;
  onAction?: (actionType: PendingChangeAction, block: ItineraryBlockView) => void;
  onUpdate?: (updates: ItineraryBlockUpdate) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSelect?: () => void;
  onDragStart?: (block: ItineraryBlockView) => void;
  onDragEnd?: () => void;
  mapStatus?: ItineraryBlockMapStatus | null;
  showActions?: boolean;
  compactCabinetBlock?: boolean;
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

const ITEM_TYPE_SHORT: Record<ItineraryItemType, string> = {
  attraction: "景",
  food: "食",
  transport: "行",
  hotel: "宿",
  free_time: "闲",
  shopping: "逛",
  other: "程",
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
  compactCabinetBlock = false,
}: ItineraryBlockProps) {
  void onUpdate;
  const { item } = block;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSelectable = Boolean(onSelect);
  const shortReason =
    item.reason.length > 44 ? `${item.reason.slice(0, 44).trimEnd()}...` : item.reason;
  const visibleMapStatus =
    mapStatus === "confirmed" || mapStatus === "unresolved" ? mapStatus : null;

  function handleInnerInteraction(event: SyntheticEvent) {
    stopBlockSelectionPropagation(event);
  }

  function handleBlockClick() {
    onSelect?.();

    if (compactCabinetBlock) {
      return;
    }

    onToggleExpand?.();
  }

  function handleSelectKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onSelect && !onToggleExpand) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleBlockClick();
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

  if (compactCabinetBlock && !isExpanded) {
    const shortType = ITEM_TYPE_SHORT[item.type] ?? "程";

    return (
      <article
        className={`edit-gear-card px-3 py-2 ${
          isSelected ? "edit-gear-card--selected" : ""
        } ${isSelectable || onToggleExpand ? "cursor-pointer" : ""}`}
        data-type={item.type}
        role={isSelectable || onToggleExpand ? "button" : undefined}
        tabIndex={isSelectable || onToggleExpand ? 0 : undefined}
        aria-pressed={isSelectable ? isSelected : undefined}
        data-selected={isSelected ? "true" : "false"}
        draggable={showActions}
        onClick={handleBlockClick}
        onKeyDown={handleSelectKeyDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-2">
          <span className="edit-type-badge" data-type={item.type}>
            {shortType}
          </span>
          <h4 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
            {item.placeName}
          </h4>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`edit-gear-card ${compactCabinetBlock ? "px-3 py-2.5" : "px-3.5 py-3"} ${
        isSelected ? "edit-gear-card--selected" : ""
      } ${
        isSelectable || (compactCabinetBlock && onToggleExpand) ? "cursor-pointer" : ""
      }`}
      data-type={item.type}
      role={isSelectable || (compactCabinetBlock && onToggleExpand) ? "button" : undefined}
      tabIndex={isSelectable || (compactCabinetBlock && onToggleExpand) ? 0 : undefined}
      aria-pressed={isSelectable ? isSelected : undefined}
      data-selected={isSelected ? "true" : "false"}
      draggable={showActions}
      onClick={handleBlockClick}
      onKeyDown={handleSelectKeyDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="edit-type-badge" data-type={item.type}>
              {ITEM_TYPE_SHORT[item.type] ?? "程"}
            </span>
            <span className="text-xs font-semibold text-[var(--ink-muted)]">
              {ITEM_TYPE_LABELS[item.type]}
            </span>
            {item.timeLabel ? (
              <span className="edit-time-label">
                {item.timeLabel}
              </span>
            ) : null}
            {visibleMapStatus ? (
              <span className="edit-time-label text-[var(--ink)]">
                {MAP_STATUS_LABELS[visibleMapStatus]}
              </span>
            ) : null}
          </div>

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
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClickCapture={handleInnerInteraction}
            onClick={onToggleExpand}
            className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)]"
          >
            {isExpanded ? "收起" : "更多"}
          </button>
        </div>
      </div>

      {isExpanded ? (
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
