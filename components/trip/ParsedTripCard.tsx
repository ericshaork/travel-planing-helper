import {
  getMissingTripRequestFieldDetails,
} from "@/lib/trip/plan-fields";
import {
  resolveTripRequestDraftDates,
  type MissingTripRequestField,
} from "@/lib/trip/normalize";
import type { TripRequestDraft } from "@/lib/trip/types";

interface ParsedTripCardProps {
  draft: TripRequestDraft;
  missingFields: MissingTripRequestField[];
}

interface SummaryItemProps {
  label: string;
  value?: string;
}

function SummaryItem({
  label,
  value,
  compact = false,
}: SummaryItemProps & { compact?: boolean }) {
  return (
    <div
      className={`border-b border-dashed border-[var(--line)] last:border-b-0 ${
        compact ? "py-2.5" : "py-3"
      }`}
    >
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

function formatChineseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function travelTimeLabel(draft: TripRequestDraft): string | undefined {
  if (draft.startDate && draft.endDate) {
    return `${formatChineseDate(draft.startDate)} 到 ${formatChineseDate(draft.endDate)}${
      draft.days ? `（${draft.days} 天）` : ""
    }`;
  }

  if (draft.days) {
    return `${draft.days} 天，日期待定`;
  }

  if (draft.startDate) {
    return `${formatChineseDate(draft.startDate)}出发，结束日期待补`;
  }

  if (draft.endDate) {
    return `${formatChineseDate(draft.endDate)}结束，开始日期待补`;
  }

  return undefined;
}

function routeLabel(draft: TripRequestDraft): string {
  return `${draft.departureCity || "出发地待补"} → ${
    draft.destinationCity || "目的地待补"
  }`;
}

function MissingStatus({
  missingFields,
}: {
  missingFields: MissingTripRequestField[];
}) {
  const missingFieldDetails = getMissingTripRequestFieldDetails(missingFields);

  return (
    <div className="mt-4 border-t border-[var(--line-strong)] pt-3.5 text-sm leading-6">
      {missingFields.length > 0 ? (
        <>
          <p className="font-semibold text-[var(--clay-deep)]">
            还差 {missingFields.length} 项
          </p>
          <ul className="mt-1.5 space-y-1 text-[var(--ink-muted)]">
            {missingFieldDetails.map((item) => (
              <li key={item.field} className="break-words">
                - {item.label}
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
  );
}

function FullSummary({
  draft,
  missingFields,
  compact = false,
}: ParsedTripCardProps & { compact?: boolean }) {
  return (
    <>
      <dl className={compact ? "mt-3 min-w-0" : "mt-5 min-w-0"}>
        <SummaryItem compact={compact} label="从哪里出发" value={draft.departureCity} />
        <SummaryItem compact={compact} label="想去哪里" value={draft.destinationCity} />
        <SummaryItem compact={compact} label="什么时候去" value={travelTimeLabel(draft)} />
        <SummaryItem
          compact={compact}
          label="大概预算"
          value={
            draft.budget
              ? `${draft.budget} ${draft.currency ?? "元"}`
              : undefined
          }
        />
        <SummaryItem
          compact={compact}
          label="感兴趣"
          value={
            draft.interests?.length ? draft.interests.join("、") : undefined
          }
        />
        <SummaryItem
          compact={compact}
          label="想怎么走"
          value={
            draft.travelStyles?.length
              ? draft.travelStyles.join("、")
              : undefined
          }
        />
      </dl>
      <MissingStatus missingFields={missingFields} />
    </>
  );
}

export function ParsedTripCard({ draft, missingFields }: ParsedTripCardProps) {
  const resolvedDraft = {
    ...draft,
    ...resolveTripRequestDraftDates(draft),
  };

  return (
    <>
      <details className="group min-w-0 overflow-hidden border border-[var(--line-strong)] bg-[var(--sand-soft)] shadow-[4px_5px_0_rgb(173_96_72_/_12%)] lg:hidden">
        <summary className="cursor-pointer list-none p-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--clay)] [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                当前旅行草稿
              </p>
              <p className="mt-1.5 break-words text-base font-semibold">
                {routeLabel(resolvedDraft)}
              </p>
            </div>
            <span className="shrink-0 border border-[var(--line-strong)] bg-[var(--paper-bright)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)]">
              <span className="group-open:hidden">展开查看</span>
              <span className="hidden group-open:inline">收起草稿</span>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs leading-5 text-[var(--ink-muted)]">
            <p className="min-w-0 break-words">
              {travelTimeLabel(resolvedDraft) ?? "时间待补"}
            </p>
            <p className="min-w-0 break-words text-right">
              {resolvedDraft.budget
                ? `预算 ${resolvedDraft.budget} 元`
                : "预算待补"}
            </p>
          </div>
        </summary>

        <div className="border-t border-dashed border-[var(--line-strong)] px-4 pb-4">
          <FullSummary
            compact
            draft={resolvedDraft}
            missingFields={missingFields}
          />
        </div>
      </details>

      <aside className="hidden min-w-0 lg:sticky lg:top-6 lg:block">
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

          <FullSummary draft={resolvedDraft} missingFields={missingFields} />
        </div>
      </aside>
    </>
  );
}
