import type { DayRouteSummary } from "@/lib/trip/enrichment-types";

interface DayRouteSummaryCardProps {
  summary?: DayRouteSummary;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function formatDuration(durationMinutes: number): string {
  if (durationMinutes >= 60) {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return `${hours} 小时`;
    }

    return `${hours} 小时 ${minutes} 分钟`;
  }

  return `${durationMinutes} 分钟`;
}

export function DayRouteSummaryCard({ summary }: DayRouteSummaryCardProps) {
  if (!summary) {
    return (
      <div className="border border-[var(--line)] bg-[var(--paper)] px-4 py-4">
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          这一天的路线估算暂时还没拿到。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--clay-deep)]">
            总距离
          </p>
          <p className="mt-1 text-base font-semibold">
            {formatDistance(summary.totalDistanceMeters)}
          </p>
        </div>
        <div className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--clay-deep)]">
            总通勤
          </p>
          <p className="mt-1 text-base font-semibold">
            {formatDuration(summary.totalDurationMinutes)}
          </p>
        </div>
      </div>

      {summary.legs.length > 0 ? (
        <ul className="space-y-2">
          {summary.legs.map((leg, index) => (
            <li
              key={`${leg.fromName ?? "from"}-${leg.toName ?? "to"}-${index}`}
              className="border border-[var(--line)] bg-[var(--paper)] px-3 py-3"
            >
              <p className="text-sm font-semibold">
                {leg.fromName ?? "上一站"} → {leg.toName ?? "下一站"}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {leg.mode} · {formatDuration(leg.durationMinutes)} ·{" "}
                {formatDistance(leg.distanceMeters)}
              </p>
              {leg.summary ? (
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {leg.summary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          这一天还没有足够的已确认点位来生成路线 legs。
        </p>
      )}
    </div>
  );
}
