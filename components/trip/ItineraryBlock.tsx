import { useState } from "react";

import type { ItineraryBlockView } from "@/lib/trip/itinerary-view";
import type { BlockActionType } from "@/lib/trip/modification-intents";
import type { ItineraryItemType } from "@/lib/trip/types";

import { BlockActions } from "./BlockActions";

interface ItineraryBlockProps {
  block: ItineraryBlockView;
  onAction?: (actionType: BlockActionType, block: ItineraryBlockView) => void;
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

export function ItineraryBlock({ block, onAction }: ItineraryBlockProps) {
  const { item } = block;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <article className="min-w-0 border border-[var(--line)] bg-[var(--paper-bright)] p-2.5 shadow-[1px_2px_0_var(--sand-soft)] sm:p-3 sm:shadow-[2px_3px_0_var(--sand-soft)]">
      <div className="flex flex-wrap items-start gap-2">
        {item.timeLabel ? (
          <span className="shrink-0 border border-[var(--line)] bg-[var(--sand-soft)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--ink-muted)]">
            {item.timeLabel}
          </span>
        ) : null}
        <h4 className="min-w-0 flex-1 break-words text-[15px] font-semibold sm:text-base">
          {item.placeName}
        </h4>
        <span className="shrink-0 border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--sage-deep)]">
          {ITEM_TYPE_LABELS[item.type]}
        </span>
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

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        {item.suggestedDuration ? (
          <span className="border border-[var(--line)] bg-[var(--paper)] px-2 py-1 font-semibold text-[var(--ink)]">
            {item.suggestedDuration}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="border-b border-[var(--line-strong)] pb-0.5 font-semibold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        >
          {detailsOpen ? "收起详情" : "详情"}
        </button>
      </div>

      {onAction ? (
        <BlockActions onAction={(actionType) => onAction(actionType, block)} />
      ) : null}

      {detailsOpen ? (
        <>
          {item.matchedInterests && item.matchedInterests.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
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
            <ul className="mt-3 space-y-2 border-t border-dashed border-[var(--line)] pt-3 text-sm leading-6 text-[var(--ink-muted)]">
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
        </>
      ) : null}
    </article>
  );
}
