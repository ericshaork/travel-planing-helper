import type {
  WorkspaceReadDayModel,
  WorkspaceReadPlace,
} from "@/lib/workspace/read-model";

interface WorkspaceReadDayProps {
  day: WorkspaceReadDayModel;
  activePlaceId?: string | null;
  onPlaceSelect?: (place: WorkspaceReadPlace) => void;
}

const PLACE_TYPE_ICONS: Record<string, string> = {
  attraction: "景",
  food: "食",
  hotel: "宿",
  transport: "行",
  free_time: "闲",
  shopping: "逛",
  other: "程",
};

function resolvePlaceTypeKey(place: WorkspaceReadPlace): string {
  const label = place.typeLabel;
  if (label === "景点") return "attraction";
  if (label === "餐饮") return "food";
  if (label === "住宿") return "hotel";
  if (label === "交通") return "transport";
  if (label === "留白") return "free_time";
  if (label === "逛街") return "shopping";
  return "other";
}

export function WorkspaceReadDay({
  day,
  activePlaceId = null,
  onPlaceSelect,
}: WorkspaceReadDayProps) {
  return (
    <article
      className="journal-sheet px-5 py-5 sm:px-6 sm:py-6"
      data-testid="workspace-read-day"
    >
      <div className="relative z-[1]">
        <header className="pb-4">
          <p className="read-kicker">当天手帐</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-3xl">
              <h2 className="read-title text-2xl sm:text-3xl">{day.title}</h2>
              {day.date ? (
                <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                  {day.date}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                {day.routeReason}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="journal-chip">{`第 ${day.dayNumber} 天`}</span>
              <span className="read-count-chip">
                {day.placeCount > 0 ? `${day.placeCount} 个地点` : "待补充"}
              </span>
            </div>
          </div>
          <hr className="read-divider mt-4" />
        </header>

        <section className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <div className="space-y-3">
            {day.places.length > 0 ? (
              day.places.map((place) => {
                const isActive = activePlaceId === place.id;
                const typeKey = resolvePlaceTypeKey(place);
                const typeIcon = PLACE_TYPE_ICONS[typeKey] ?? "程";

                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => onPlaceSelect?.(place)}
                    data-type={typeKey}
                    className={`read-place-card w-full px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                      isActive ? "read-place-card--active" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`read-type-badge mt-0.5`}
                        data-type={typeKey}
                      >
                        {typeIcon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {place.title}
                          </p>
                          <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]">
                            {place.typeLabel}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-faint)]">
                          <span>{place.slotLabel}</span>
                          {place.timeLabel ? (
                            <>
                              <span className="text-[var(--line)]">&middot;</span>
                              <span className="font-mono">{place.timeLabel}</span>
                            </>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                          {place.summary}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <section className="journal-slot-empty px-4 py-6 text-center text-sm leading-6 text-[var(--ink-muted)]">
                这一天暂时还没有地点。
              </section>
            )}
          </div>

          <aside className="space-y-3">
            <section className="read-route-box px-4 py-4">
              <p className="read-kicker">路线摘要</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {day.routeSummary || "还在等这一天的路线慢慢成形。"}
              </p>
            </section>

            <section className="read-highlight-box px-4 py-4">
              <p className="read-kicker">当天亮点</p>
              {day.highlights.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--ink-muted)]">
                  {day.highlights.map((highlight) => (
                    <li key={highlight}>- {highlight}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  这一天暂时还没有单独标出亮点。
                </p>
              )}
            </section>

            {day.tips.length > 0 ? (
              <section className="read-tip-box px-4 py-4">
                <p className="read-kicker">当天备注</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--ink-muted)]">
                  {day.tips.map((tip) => (
                    <li key={tip}>- {tip}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </article>
  );
}
