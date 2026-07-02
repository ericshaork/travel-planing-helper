import type { DailyItinerary, ItineraryItem } from "@/lib/trip/types";

interface DayItineraryCardProps {
  itinerary: DailyItinerary;
}

interface DayPeriodProps {
  label: string;
  items: ItineraryItem[];
}

const ITEM_TYPE_LABELS: Record<ItineraryItem["type"], string> = {
  attraction: "景点",
  food: "吃饭",
  transport: "移动",
  hotel: "住宿",
  free_time: "自由活动",
  shopping: "逛街",
  other: "安排",
};

function DayPeriod({ label, items }: DayPeriodProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 border-t border-dashed border-[var(--line)] py-5 sm:grid-cols-[5rem_minmax(0,1fr)]">
      <h3 className="pt-1 text-sm font-semibold text-[var(--clay-deep)]">
        {label}
      </h3>
      <div className="min-w-0 space-y-4">
        {items.map((item, index) => (
          <article
            key={`${item.placeName}-${item.timeLabel ?? index}`}
            className="relative min-w-0 border-l-2 border-[var(--sage-deep)] pl-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {item.timeLabel ? (
                <span className="font-mono text-xs font-semibold text-[var(--ink-muted)]">
                  {item.timeLabel}
                </span>
              ) : null}
              <h4 className="break-words text-base font-semibold">{item.placeName}</h4>
              <span className="bg-[var(--sage-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--sage-deep)]">
                {ITEM_TYPE_LABELS[item.type]}
              </span>
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
              {item.reason}
            </p>

            <dl className="mt-3 space-y-1.5 text-xs leading-5">
              {item.suggestedDuration ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold">停留</dt>
                  <dd className="break-words">{item.suggestedDuration}</dd>
                </div>
              ) : null}
              {item.transportFromPrevious ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold">怎么走</dt>
                  <dd className="break-words">{item.transportFromPrevious}</dd>
                </div>
              ) : null}
              {item.weatherImpact ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold">天气调整</dt>
                  <dd className="break-words">{item.weatherImpact}</dd>
                </div>
              ) : null}
              {item.backupPlan ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 font-semibold">备选</dt>
                  <dd className="break-words">{item.backupPlan}</dd>
                </div>
              ) : null}
            </dl>

            {item.guide.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs leading-5 text-[var(--ink-muted)]">
                {item.guide.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span className="break-words">{tip}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function DayItineraryCard({ itinerary }: DayItineraryCardProps) {
  return (
    <article className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] shadow-[6px_7px_0_var(--sand-soft)]">
      <header className="grid gap-4 bg-[var(--sand-soft)] p-5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:p-6">
        <div className="flex size-16 shrink-0 flex-col items-center justify-center border border-[var(--ink)] bg-[var(--paper-bright)] font-mono">
          <span className="text-[10px] font-semibold tracking-[0.12em]">DAY</span>
          <span className="text-2xl font-bold">{itinerary.day}</span>
        </div>
        <div className="min-w-0">
          {itinerary.date ? (
            <p className="break-words font-mono text-xs text-[var(--ink-muted)]">
              {itinerary.date}
            </p>
          ) : null}
          <h2 className="mt-1 break-words text-2xl font-semibold">{itinerary.theme}</h2>
          <p className="mt-3 break-words text-sm font-semibold leading-6">
            {itinerary.routeOrder.join(" → ")}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
            {itinerary.routeReason}
          </p>
        </div>
      </header>

      <div className="px-5 sm:px-6">
        <DayPeriod label="上午" items={itinerary.morning} />
        <DayPeriod label="下午" items={itinerary.afternoon} />
        <DayPeriod label="晚上" items={itinerary.evening} />
      </div>

      {itinerary.dailyTips.length > 0 ? (
        <footer className="border-t border-dashed border-[var(--line)] bg-[var(--sage-soft)] px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold text-[var(--sage-deep)]">这天记一下</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sage-deep)]">
            {itinerary.dailyTips.map((tip) => (
              <li key={tip} className="break-words">
                - {tip}
              </li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}
