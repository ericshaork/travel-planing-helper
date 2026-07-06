import type { DayRouteInsight } from "@/lib/trip/route-insight";
import { buildWorkspaceInsightStats } from "@/lib/trip/workspace-inspector";

interface InspectorMapPreviewProps {
  insight?: DayRouteInsight;
  loading?: boolean;
  errorMessage?: string;
}

const POINT_POSITIONS = [
  { left: "16%", top: "26%" },
  { left: "50%", top: "18%" },
  { left: "76%", top: "34%" },
  { left: "32%", top: "58%" },
  { left: "66%", top: "68%" },
  { left: "22%", top: "78%" },
];

export function InspectorMapPreview({
  insight,
  loading = false,
  errorMessage,
}: InspectorMapPreviewProps) {
  const points = insight?.mapPoints ?? [];
  const stats = buildWorkspaceInsightStats(insight);

  if (loading) {
    return (
      <section className="workspace-panel px-4 py-4">
        <div className="relative z-[1] space-y-3">
          <div>
            <p className="workspace-kicker">MAP PREVIEW</p>
            <h3 className="mt-1 text-base font-semibold">地图预览</h3>
          </div>
          <div className="h-48 animate-pulse rounded-[24px] border border-[var(--line)] bg-[var(--paper)]" />
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            正在整理当前 Day 的点位和路线。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="workspace-kicker">MAP PREVIEW</p>
            <h3 className="mt-1 text-base font-semibold">地图预览</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              真实地图会在 v1.5 接入，这里先用路线画布承接当前 Day。
            </p>
          </div>
          <span className="workspace-chip">{points.length} 个点位</span>
        </div>

        <div className="mt-4 relative h-48 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,var(--paper)_0%,var(--paper-bright)_100%)]">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-position:-1px_-1px] [background-size:32px_32px]" />
          <div className="absolute inset-[10%] rounded-full border border-dashed border-[var(--line)] opacity-60" />

          {points.length > 1 ? (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <path
                d="M18 26 C34 18, 46 16, 50 18 S69 24, 76 34 S51 58, 32 58 S62 70, 66 68"
                fill="none"
                stroke="var(--clay)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
                opacity="0.8"
              />
            </svg>
          ) : null}

          {points.map((point, index) => {
            const position = POINT_POSITIONS[index % POINT_POSITIONS.length];

            return (
              <div
                key={point.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={position}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold shadow-[2px_2px_0_var(--sand-soft)] ${
                    point.resolved
                      ? "border-[var(--ink)] bg-[var(--paper-bright)] text-[var(--ink)]"
                      : "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]"
                  }`}
                >
                  {index + 1}
                </div>
              </div>
            );
          })}

          {points.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="max-w-xs text-sm leading-6 text-[var(--ink-muted)]">
                这一天暂时没有可确认点位，先把行程读顺，出发前再核对名称和地址。
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="workspace-chip">已确认 {stats.resolvedPoints}</span>
          <span className="workspace-chip">待确认 {stats.unresolvedPoints}</span>
          {errorMessage ? (
            <span className="workspace-chip workspace-chip-warm">
              {errorMessage}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
