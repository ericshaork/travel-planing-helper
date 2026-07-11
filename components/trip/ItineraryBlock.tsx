import Image from "next/image";
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
  confirmed: "地图已定位",
  unresolved: "待确认位置",
};

const ITEM_TYPE_IMAGE: Record<ItineraryItemType, string> = {
  attraction: "/images/explore/cities/xiamen-city-card.png",
  food: "/images/explore/food/hotpot-card.png",
  transport: "/images/landing/decoration/routes/02-airplane-route.png",
  hotel: "/images/archive/template/archive-template-main.png",
  free_time: "/images/explore/cities/hangzhou-city-card.png",
  shopping: "/images/explore/cities/shanghai-city-card.png",
  other: "/images/archive/template/archive-template-mobile.png",
};

export function stopBlockSelectionPropagation(
  event: Pick<SyntheticEvent, "stopPropagation">,
) {
  event.stopPropagation();
}

export function ItineraryBlock({
  block,
  onAction,
  isSelected = false,
  onSelect,
  mapStatus = null,
  showActions = true,
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
      className={`cabinet-block relative min-w-0 overflow-hidden p-3 transition-colors duration-150 ease-out sm:p-3.5 ${
        isSelected
          ? "border-[var(--clay-deep)] bg-[linear-gradient(180deg,rgba(249,241,226,0.98)_0%,rgba(255,253,247,0.98)_100%)] shadow-[3px_3px_0_var(--sand)]"
          : "bg-[linear-gradient(180deg,rgba(255,253,247,0.98)_0%,rgba(249,245,236,0.92)_100%)]"
      } ${isSelectable ? "cursor-pointer" : ""}`}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-pressed={isSelectable ? isSelected : undefined}
      data-selected={isSelected ? "true" : "false"}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-10 w-16 opacity-20">
        <Image
          src="/images/ui/button/button-accent-soft.png"
          alt=""
          fill
          aria-hidden
          sizes="64px"
          className="object-cover object-top"
        />
      </div>

      <div className="relative z-[1] grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--paper)]">
          <Image
            src={ITEM_TYPE_IMAGE[item.type]}
            alt=""
            fill
            aria-hidden
            sizes="160px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,22,20,0.04)_0%,rgba(20,22,20,0.12)_55%,rgba(20,22,20,0.34)_100%)]" />
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5">
            <span
              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${ITEM_TYPE_STYLES[item.type]}`}
            >
              {ITEM_TYPE_LABELS[item.type]}
            </span>
            {visibleMapStatus ? (
              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${MAP_STATUS_STYLES[visibleMapStatus]}`}
              >
                {MAP_STATUS_LABELS[visibleMapStatus]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-2">
            {item.timeLabel ? (
              <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--ink-muted)]">
                {item.timeLabel}
              </span>
            ) : null}
            {item.suggestedDuration ? (
              <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--paper-bright)] px-2 py-1 text-[11px] font-semibold text-[var(--ink)]">
                停留 {item.suggestedDuration}
              </span>
            ) : null}
          </div>

          <div className="mt-2">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              PLACE NOTE
            </p>
            <h4 className="mt-1 min-w-0 break-words text-[15px] font-semibold sm:text-lg">
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
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
            }
          >
            {item.reason}
          </p>

          {item.matchedInterests && item.matchedInterests.length > 0 ? (
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

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClickCapture={handleInnerInteraction}
              onClick={() => setDetailsOpen((open) => !open)}
              className="min-h-9 rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:bg-[var(--sand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              {detailsOpen ? "收起细节" : "继续阅读"}
            </button>
            {isSelected ? (
              <span className="rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sage-deep)]">
                当前地图焦点
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {showActions && onAction ? (
        <BlockActions
          onAction={(actionType) => onAction(actionType, block)}
          onInteraction={handleInnerInteraction}
        />
      ) : null}

      {detailsOpen ? (
        <div className="relative z-[1] mt-4 border-t border-dashed border-[var(--line)] pt-4">
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
        </div>
      ) : null}
    </article>
  );
}
