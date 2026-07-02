import type { MissingTripRequestField } from "@/lib/trip/normalize";
import type { TripRequestDraft } from "@/lib/trip/types";

interface ParsedTripCardProps {
  draft: TripRequestDraft;
  missingFields: MissingTripRequestField[];
}

interface SummaryItemProps {
  label: string;
  value?: string;
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="border-b border-dashed border-[var(--line)] py-3 last:border-b-0">
      <dt className="text-xs font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm leading-6 ${
          value ? "font-medium text-[var(--ink)]" : "text-[var(--clay)]"
        }`}
      >
        {value ?? "还没填"}
      </dd>
    </div>
  );
}

function travelTimeLabel(draft: TripRequestDraft): string | undefined {
  if (draft.startDate && draft.endDate) {
    return `${draft.startDate} 到 ${draft.endDate}${
      draft.days ? `（${draft.days} 天）` : ""
    }`;
  }

  if (draft.days) {
    return `${draft.days} 天，日期待定`;
  }

  if (draft.startDate) {
    return `${draft.startDate} 出发，结束日期待补`;
  }

  if (draft.endDate) {
    return `${draft.endDate} 结束，开始日期待补`;
  }

  return undefined;
}

export function ParsedTripCard({ draft, missingFields }: ParsedTripCardProps) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-6">
      <div className="overflow-hidden border border-[var(--line-strong)] bg-[var(--sand-soft)] p-5 shadow-[6px_7px_0_rgb(173_96_72_/_12%)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              当前旅行草稿
            </p>
            <h2 className="mt-2 text-xl font-semibold">先看看认得准不准</h2>
          </div>
          <span className="-rotate-2 border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2 py-1 text-xs font-semibold text-[var(--sage-deep)]">
            可随时修改
          </span>
        </div>

        <dl className="mt-5 min-w-0">
          <SummaryItem label="从哪里出发" value={draft.departureCity} />
          <SummaryItem label="想去哪里" value={draft.destinationCity} />
          <SummaryItem label="什么时候去" value={travelTimeLabel(draft)} />
          <SummaryItem
            label="大概预算"
            value={draft.budget ? `${draft.budget} ${draft.currency ?? "元"}` : undefined}
          />
          <SummaryItem
            label="感兴趣"
            value={draft.interests?.length ? draft.interests.join("、") : undefined}
          />
          <SummaryItem
            label="想怎么走"
            value={draft.travelStyles?.length ? draft.travelStyles.join("、") : undefined}
          />
        </dl>

        <div className="mt-5 border-t border-[var(--line-strong)] pt-4 text-sm leading-6">
          {missingFields.length > 0 ? (
            <>
              <p className="font-semibold text-[var(--clay-deep)]">
                还差 {missingFields.length} 项
              </p>
              <ul className="mt-2 space-y-1 text-[var(--ink-muted)]">
                {missingFields.map((item) => (
                  <li key={item.field} className="break-words">
                    - {item.message}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="font-semibold text-[var(--sage-deep)]">
              核心信息齐了。再补一点偏好，就能往下走。
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
