import { useState, type KeyboardEvent, type SyntheticEvent } from "react";

import type { ItineraryBlockView } from "../../lib/trip/itinerary-view";
import type { ItineraryBlockMapStatus } from "../../lib/trip/map-point-match";
import type { BlockActionType } from "../../lib/trip/modification-intents";
import type { ItineraryItemType } from "../../lib/trip/types";

import { BlockActions } from "./BlockActions";

interface ItineraryBlockProps {
  block: ItineraryBlockView;
  onAction?: (actionType: BlockActionType, block: ItineraryBlockView) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  mapStatus?: ItineraryBlockMapStatus | null;
}

const ITEM_TYPE_LABELS: Record<ItineraryItemType, string> = {
  attraction: "景点",
  food: "吃饭",
  transport: "移动",
  hotel: "住宿",
  free_time: "自由活动",
  shopping: "逛街",
  other: "安排",
};

const ITEM_TYPE_STYLES: Record<ItineraryItemType, string> = {
  attraction:
    "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]",
  food: "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]",
  transport: "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)]",
  hotel: "border-[var(--sand-deep)] bg-[var(--sand-soft)] text-[var(--ink)]",
  free_time:
    "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]",
  shopping:
    "border-[var(--line-strong)] bg-[var(--paper-bright)] text-[var(--ink)]",
  other: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]",
};

const MAP_STATUS_STYLES: Record<
  Exclude<ItineraryBlockMapStatus, "unmatched">,
  string
> = {
  confirmed:
    "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]",
  unresolved:
    "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]",
};

const MAP_STATUS_LABELS: Record<
  Exclude<ItineraryBlockMapStatus, "unmatched">,
  string
> = {
  confirmed: "已定位",
  unresolved: "待确认",
};

export function stopBlockSelectionPropagation(event: Pick<SyntheticEvent, "stopPropagation">) {
  event.stopPropagation();
}

export function ItineraryBlock({
  block,
  onAction,
  isSelected = false,
  onSelect,
  mapStatus = null,
}: ItineraryBlockProps) {
  const { item } = block;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isSelectable = Boolean(onSelect);
  const visibleMapStatus =
    mapStatus === "confirmed" || mapStatus === "unresolved" ? mapStatus : null;

  function handleInnerInteraction(event: SyntheticEvent) {
    stopBlockSelectionPropagation(event);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <article
      className={`cabinet-block min-w-0 p-3 transition-colors duration-150 ease-out sm:p-3.5 ${
        isSelected
          ? "border-[var(--clay-deep)] bg-[var(--sand-soft)] shadow-[3px_3px_0_var(--sand)]"
          : ""
      } ${isSelectable ? "cursor-pointer" : ""}`}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-pressed={isSelectable ? isSelected : undefined}
      data-selected={isSelected ? "true" : "false"}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-wrap items-start gap-2">
        {item.timeLabel ? (
          <span className="shrink-0 border border-[var(--line)] bg-[var(--paper)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--ink-muted)]">
            {item.timeLabel}
          </span>
        ) : null}
        <span
          className={`shrink-0 border px-2 py-1 text-[11px] font-semibold ${
            ITEM_TYPE_STYLES[item.type]
          }`}
        >
          {ITEM_TYPE_LABELS[item.type]}
        </span>
        {visibleMapStatus ? (
          <span
            className={`shrink-0 border px-2 py-1 text-[11px] font-semibold ${MAP_STATUS_STYLES[visibleMapStatus]}`}
          >
            {MAP_STATUS_LABELS[visibleMapStatus]}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          这一格去哪儿
        </p>
        <h4 className="mt-1 min-w-0 break-words text-[15px] font-semibold sm:text-base">
          {item.placeName}
        </h4>
      </div>

      <p
        className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]"
        style={
          detailsOpen
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {item.reason}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {item.suggestedDuration ? (
          <span className="border border-[var(--line)] bg-[var(--paper)] px-2 py-1 font-semibold text-[var(--ink)]">
            {item.suggestedDuration}
          </span>
        ) : null}
        <button
          type="button"
          onClickCapture={handleInnerInteraction}
          onClick={() => setDetailsOpen((open) => !open)}
          className="min-h-9 border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:bg-[var(--sand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        >
          {detailsOpen ? "收起详情" : "查看详情"}
        </button>
      </div>

      {onAction ? (
        <BlockActions
          onAction={(actionType) => onAction(actionType, block)}
          onInteraction={handleInnerInteraction}
        />
      ) : null}

      {detailsOpen ? (
        <div className="mt-3 border-t border-dashed border-[var(--line)] pt-3">
          {item.matchedInterests && item.matchedInterests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.matchedInterests.map((interest) => (
                <span
                  key={interest}
                  className="max-w-full break-words border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[11px] font-semibold text-[var(--ink-muted)]"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : null}

          {item.transportFromPrevious ||
          item.weatherImpact ||
          item.backupPlan ||
          item.suggestedDuration ? (
            <dl className="mt-3 space-y-2 text-xs leading-5 text-[var(--ink-muted)]">
              {item.suggestedDuration ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold text-[var(--ink)]">
                    建议停留
                  </dt>
                  <dd className="break-words">{item.suggestedDuration}</dd>
                </div>
              ) : null}
              {item.transportFromPrevious ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold text-[var(--ink)]">
                    怎么过去
                  </dt>
                  <dd className="break-words">{item.transportFromPrevious}</dd>
                </div>
              ) : null}
              {item.weatherImpact ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold text-[var(--ink)]">
                    天气调整
                  </dt>
                  <dd className="break-words">{item.weatherImpact}</dd>
                </div>
              ) : null}
              {item.backupPlan ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold text-[var(--ink)]">
                    备选
                  </dt>
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
        </div>
      ) : null}
    </article>
  );
}
