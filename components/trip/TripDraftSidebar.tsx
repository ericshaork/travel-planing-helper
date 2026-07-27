import {
  resolveTripRequestDraftDates,
} from "@/lib/trip/normalize";
import type { TripRequestDraft } from "@/lib/trip/types";
import type { MissingTripRequestField } from "@/lib/trip/normalize";
import {
  getMissingTripRequestFieldDetails,
} from "@/lib/trip/plan-fields";

interface TripDraftSidebarProps {
  draft: TripRequestDraft;
  missingFields: MissingTripRequestField[];
}

function formatChineseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function travelTimeLabel(draft: TripRequestDraft): string {
  if (draft.startDate && draft.endDate) {
    return `${formatChineseDate(draft.startDate)} – ${formatChineseDate(draft.endDate)}${
      draft.days ? `（${draft.days}天）` : ""
    }`;
  }
  if (draft.days) return `${draft.days}天`;
  if (draft.startDate) return `${formatChineseDate(draft.startDate)}出发`;
  if (draft.endDate) return `${formatChineseDate(draft.endDate)}结束`;
  return "时间待定";
}

interface TagRowProps {
  label: string;
  value?: string;
}

function TagRow({ label, value }: TagRowProps) {
  return (
    <div className="flex items-baseline gap-1.5 py-0.5">
      <dt className="shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--ink-faint)]">
        {label}
      </dt>
      <dd
        className={`min-w-0 break-words text-sm ${
          value ? "font-medium text-[var(--ink)]" : "italic text-[var(--ink-faint)]"
        }`}
      >
        {value || "待补"}
      </dd>
    </div>
  );
}

export function TripDraftSidebar({ draft, missingFields }: TripDraftSidebarProps) {
  const resolvedDraft = { ...draft, ...resolveTripRequestDraftDates(draft) };
  const missingDetails = getMissingTripRequestFieldDetails(missingFields);
  const hasMissing = missingDetails.length > 0;

  return (
    <aside className="lg:sticky lg:top-3">
      {/* Clay left bar — hand-book feel */}
      <div className="relative pl-2">
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-[var(--clay)] opacity-40"
        />

        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--ink-faint)]">
          当前旅行草稿
        </p>

        <dl className="mt-0.5 space-y-0">
          <TagRow
            label="出发"
            value={resolvedDraft.departureCity}
          />
          <TagRow
            label="目的地"
            value={resolvedDraft.destinationCity}
          />
          <TagRow
            label="时间"
            value={travelTimeLabel(resolvedDraft)}
          />
          <TagRow
            label="预算"
            value={
              resolvedDraft.budget
                ? `${resolvedDraft.budget} ${resolvedDraft.currency ?? "元"}`
                : undefined
            }
          />
          <TagRow
            label="兴趣"
            value={
              resolvedDraft.interests?.length
                ? resolvedDraft.interests.join("、")
                : undefined
            }
          />
          <TagRow
            label="风格"
            value={
              resolvedDraft.travelStyles?.length
                ? resolvedDraft.travelStyles.join("、")
                : undefined
            }
          />
        </dl>

        {hasMissing && (
          <p className="mt-0.5 text-xs font-semibold text-[var(--clay-deep)]">
            还差 {missingDetails.length} 项
          </p>
        )}
        {!hasMissing && (
          <p className="mt-0.5 text-xs font-semibold text-[var(--sage-deep)]">
            核心信息齐了
          </p>
        )}
      </div>
    </aside>
  );
}
