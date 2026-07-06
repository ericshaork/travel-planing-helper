import type { WeatherImpact } from "@/lib/weather/types";

interface WeatherImpactListProps {
  impacts: WeatherImpact[];
}

const IMPACT_LABELS: Record<WeatherImpact["type"], string> = {
  rain: "降雨",
  heat: "高温",
  cold: "低温",
  wind: "大风",
  unavailable: "天气待确认",
};

export function WeatherImpactList({ impacts }: WeatherImpactListProps) {
  if (impacts.length === 0) {
    return (
      <p className="text-sm leading-6 text-[var(--ink-muted)]">
        这一天暂时没有额外天气提醒。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {impacts.map((impact) => (
        <li
          key={impact.id}
          className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm leading-6"
        >
          <span className="mr-2 text-xs font-semibold tracking-[0.08em] text-[var(--clay-deep)]">
            {IMPACT_LABELS[impact.type]}
          </span>
          <span>{impact.message}</span>
        </li>
      ))}
    </ul>
  );
}
