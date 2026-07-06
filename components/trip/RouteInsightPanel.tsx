import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type { TripWeatherSummary } from "@/lib/weather/types";

import { DayRouteSummaryCard } from "./DayRouteSummaryCard";
import { MapPointList } from "./MapPointList";
import { PaceWarningList } from "./PaceWarningList";
import { WeatherImpactList } from "./WeatherImpactList";

interface RouteInsightPanelProps {
  insight?: DayRouteInsight;
  weatherSummary?: TripWeatherSummary;
  loading?: boolean;
  errorMessage?: string;
}

export function RouteInsightPanel({
  insight,
  weatherSummary,
  loading = false,
  errorMessage,
}: RouteInsightPanelProps) {
  if (loading) {
    return (
      <aside className="space-y-4 border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[4px_4px_0_var(--sand-soft)]">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          路线洞察
        </p>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          正在整理点位、路线和天气提示……
        </p>
      </aside>
    );
  }

  if (errorMessage) {
    return (
      <aside className="space-y-4 border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[4px_4px_0_var(--sand-soft)]">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          路线洞察
        </p>
        <p className="border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-3 text-sm leading-6 text-[var(--clay-deep)]">
          {errorMessage}
        </p>
      </aside>
    );
  }

  if (!insight) {
    return null;
  }

  const resolvedCount = insight.mapPoints.filter((point) => point.resolved).length;
  const unresolvedCount = insight.mapPoints.length - resolvedCount;

  return (
    <aside className="space-y-4 border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[4px_4px_0_var(--sand-soft)]">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          Route / Map Insight
        </p>
        <h3 className="mt-2 text-xl font-semibold">
          Day {insight.dayNumber} · {insight.dayTitle}
        </h3>
        {insight.date ? (
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{insight.date}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--clay-deep)]">
            已确认点位
          </p>
          <p className="mt-1 text-lg font-semibold">{resolvedCount}</p>
        </div>
        <div className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--clay-deep)]">
            待确认点位
          </p>
          <p className="mt-1 text-lg font-semibold">{unresolvedCount}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            路线摘要
          </p>
        </div>
        <DayRouteSummaryCard summary={insight.routeSummary} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            节奏提醒
          </p>
        </div>
        <PaceWarningList warnings={insight.routeSummary?.warnings ?? []} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            天气影响
          </p>
          {weatherSummary ? (
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              {weatherSummary.overview}
            </p>
          ) : null}
        </div>
        <WeatherImpactList impacts={insight.weatherImpacts} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            点位列表
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
            阶段 6 先用点位清单和路线摘要代替完整交互地图。
          </p>
        </div>
        <MapPointList points={insight.mapPoints} />
      </section>
    </aside>
  );
}
