import type { MapPoint } from "@/lib/trip/enrichment-types";

interface MapPointListProps {
  points: MapPoint[];
}

function formatCoordinates(point: MapPoint): string | null {
  if (!point.coordinates) {
    return null;
  }

  return `${point.coordinates.lat.toFixed(4)}, ${point.coordinates.lng.toFixed(4)}`;
}

export function MapPointList({ points }: MapPointListProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm leading-6 text-[var(--ink-muted)]">
        这一天还没有可展示的点位。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {points.map((point) => {
        const coordinates = formatCoordinates(point);

        return (
          <li
            key={point.id}
            className="border border-[var(--line)] bg-[var(--paper)] px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{point.name}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {point.resolved ? "已确认地点" : "未确认地点"}
                  {point.provider ? ` · ${point.provider}` : ""}
                </p>
              </div>
              <span className="border border-[var(--line)] bg-[var(--paper-bright)] px-2 py-1 text-[11px] font-semibold text-[var(--ink-muted)]">
                {point.slot}
              </span>
            </div>

            {point.address ? (
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {point.address}
              </p>
            ) : null}

            {coordinates ? (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                坐标：{coordinates}
              </p>
            ) : null}

            {point.warning ? (
              <p className="mt-2 border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-2.5 py-2 text-xs leading-5 text-[var(--clay-deep)]">
                {point.warning}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
