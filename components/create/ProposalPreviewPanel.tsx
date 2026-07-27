"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadProposalPreview,
  type ProposalPreviewData,
} from "@/lib/projects/proposal-preview-client";
import { moveCreateProposalToAdjusting } from "@/lib/projects/create-copilot-client";
import type { DailyItinerary, TripPlan, TripRequest } from "@/lib/trip/types";

export type ProposalPreviewContext =
  | "first_version"
  | "final_confirmation"
  | "file_import"
  | "explore_archive";

interface ProposalPreviewPanelProps {
  projectId: string;
  context?: ProposalPreviewContext;
}

const CONTEXT_KICKER: Record<ProposalPreviewContext, string> = {
  first_version: "Wanderly · 第一版方案",
  final_confirmation: "Wanderly · 最终方案",
  file_import: "Wanderly · 整理好的清单",
  explore_archive: "Wanderly · 档案整理版",
};

const CONTEXT_INTRO: Record<ProposalPreviewContext, string> = {
  first_version:
    "我们把你说的五件事整理成了一版可以慢慢翻的旅行方案。先翻翻看，再决定是继续和 AI 调整，还是带着它出发。",
  final_confirmation:
    "这版就是最终的样子。你可以再翻一翻下面的细节，满意后直接进入工作台。",
  file_import:
    "你上传的清单已经被 Wanderly 整理成旅行方案。下面是它读到的安排，等你确认后即可出发。",
  explore_archive:
    "你从档案里带来的旅行，已经被 Wanderly 翻回成完整方案。翻一翻下方细节，准备好就进入工作台。",
};

const ADJUST_INTRO_LABEL =
  "回到 AI 对话，继续提一句你想怎么改，Wanderly 会再整理一版新的。";

const ACCEPT_INTRO_LABEL =
  "进入 Workspace 后可以继续微调每天的安排、上车点和停留时长。";

function resolveInterestLabel(value: string): string {
  return value;
}

interface BasicInfoLine {
  label: string;
  value: string;
}

interface TravelPlanInfo {
  destination: string;
  days: number;
  interests: string[];
  travelStyles: string[];
  budgetLabel: string;
  tripTitle: string;
  summary: string;
  travelStyleSummary: string;
  dailyItinerary: DailyItinerary[];
  generalTips: string[];
  warnings: string[];
  budgetSummary: { totalEstimate: string };
}

function asTravelPlan(
  plan: TripPlan | undefined,
  request: TripRequest | undefined | null,
): TravelPlanInfo | null {
  if (!plan) return null;
  const destination = plan.destination?.trim() ||
    request?.destinationCity?.trim() ||
    "";
  const days = plan.days || request?.days || 0;
  const interests = request?.interests?.length
    ? request.interests
    : [];
  const travelStyles = request?.travelStyles?.length
    ? request.travelStyles
    : [];
  const currency = request?.currency?.trim();
  const budgetLabel = plan.budgetSummary?.totalEstimate?.trim()
    ? plan.budgetSummary.totalEstimate
    : request?.budget && currency
      ? `${request.budget} ${currency}`
      : request?.budget
        ? `${request.budget}`
        : "待补充";

  return {
    destination,
    days,
    interests,
    travelStyles,
    budgetLabel,
    tripTitle: plan.tripTitle,
    summary: plan.summary,
    travelStyleSummary: plan.travelStyleSummary,
    dailyItinerary: plan.dailyItinerary ?? [],
    generalTips: plan.generalTips ?? [],
    warnings: plan.warnings ?? [],
    budgetSummary: plan.budgetSummary ?? { totalEstimate: "待补充" },
  };
}

function resolveBasicInfoLines(
  info: TravelPlanInfo | null,
): BasicInfoLine[] {
  if (!info) {
    return [];
  }

  const lines: BasicInfoLine[] = [
    {
      label: "目的地",
      value: info.destination || "待确认",
    },
    {
      label: "天数",
      value: info.days > 0 ? `${info.days} 天` : "待确认",
    },
  ];

  const companions = describeCompanion(info);
  if (companions) {
    lines.push({
      label: "同行",
      value: companions,
    });
  }

  const preference = describePreferences(info);
  if (preference) {
    lines.push({
      label: "偏好",
      value: preference,
    });
  }

  lines.push({
    label: "预算",
    value: info.budgetLabel,
  });

  return lines;
}

function describeCompanion(info: TravelPlanInfo): string | null {
  const styles = info.travelStyles.join(" ").toLowerCase();
  const interestWords = info.interests.join(" ").toLowerCase();
  const combined = `${styles} ${interestWords}`.trim();

  if (!combined) return null;

  if (combined.includes("家庭") || combined.includes("亲子") || combined.includes("孩子")) {
    return "和家人";
  }
  if (combined.includes("情侣") || combined.includes("伴侣")) {
    return "和伴侣";
  }
  if (combined.includes("朋友") || combined.includes("闺蜜")) {
    return "和朋友";
  }
  if (combined.includes("独自") || combined.includes("solo")) {
    return "一个人";
  }
  return info.travelStyles[0] ?? null;
}

function describePreferences(info: TravelPlanInfo): string | null {
  const parts: string[] = [];
  if (info.interests.length > 0) {
    parts.push(info.interests.map(resolveInterestLabel).join(" · "));
  }
  if (info.travelStyleSummary?.trim()) {
    parts.push(info.travelStyleSummary);
  }
  return parts.length ? parts.join(" · ") : null;
}

function pickDayHighlights(day: DailyItinerary): string[] {
  const all: string[] = [];
  for (const slot of [day.morning, day.afternoon, day.evening]) {
    if (!Array.isArray(slot)) continue;
    for (const item of slot) {
      if (item?.placeName) {
        all.push(item.placeName);
      }
      if (all.length >= 3) return all;
    }
  }
  return all;
}

export function ProposalPreviewPanel({
  projectId,
  context = "first_version",
}: ProposalPreviewPanelProps) {
  const router = useRouter();
  const [data, setData] = useState<ProposalPreviewData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    loadProposalPreview(projectId)
      .then((result) => {
        if (!active) return;
        setData(result);
        setSnapshotLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "暂时还没把这一版方案读出来，可以稍后再试一次。",
        );
        setSnapshotLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const tripPlan = useMemo(
    () =>
      asTravelPlan(
        data?.version?.tripPlan,
        data?.version?.tripRequestSnapshot,
      ),
    [data?.version?.tripPlan, data?.version?.tripRequestSnapshot],
  );

  const basicInfoLines = useMemo(
    () => resolveBasicInfoLines(tripPlan),
    [tripPlan],
  );

  const handleAdjust = useCallback(async () => {
    if (!projectId) return;
    setActionError(null);
    setIsAdjusting(true);

    try {
      await moveCreateProposalToAdjusting(projectId);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "这一版暂时切不回可调整状态，可以重试。",
      );
    } finally {
      setIsAdjusting(false);
    }
  }, [projectId, router]);

  const handleAccept = useCallback(() => {
    if (!projectId) return;
    setActionError(null);
    setIsAccepting(true);

    window.setTimeout(() => {
      router.replace("/workspace");
    }, 650);
  }, [projectId, router]);

  if (loadError) {
    return (
      <PreviewShell kicker={CONTEXT_KICKER[context]} title="这一页暂时翻不开">
        <p className="text-sm leading-7 text-[var(--ink-muted)]">{loadError}</p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-4 inline-flex min-h-9 items-center border-b border-[var(--ink)] pb-1 text-sm font-semibold text-[var(--ink)] hover:border-[var(--clay)] hover:text-[var(--clay-deep)]"
        >
          再翻一次
        </button>
      </PreviewShell>
    );
  }

  if (!snapshotLoaded) {
    return (
      <PreviewShell
        kicker={CONTEXT_KICKER[context]}
        title="正在把这版方案从手札里翻出来..."
        dim
      >
        <p className="text-sm leading-7 text-[var(--ink-muted)]">
          旅行的起点在加载中，先别担心。
        </p>
      </PreviewShell>
    );
  }

  const displayTitle = tripPlan?.tripTitle?.trim() || "第一版方案";
  const destination = tripPlan?.destination?.trim() || "待确认";
  const daysLabel =
    tripPlan && tripPlan.days > 0 ? `${tripPlan.days} 天` : "天数待确认";
  const introText = tripPlan?.summary?.trim() || CONTEXT_INTRO[context];

  return (
    <PreviewShell
      kicker={CONTEXT_KICKER[context]}
      title={`${displayTitle} · ${destination}`}
      subtitle={`${daysLabel} · ${introText}`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <article className="space-y-7">
          {tripPlan?.travelStyleSummary ? (
            <section className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                这一版旅行的格调
              </p>
              <p className="font-serif text-base leading-7 text-[var(--ink)]">
                {tripPlan.travelStyleSummary}
              </p>
            </section>
          ) : null}

          {basicInfoLines.length > 0 ? (
            <section>
              <SectionLabel>基础信息</SectionLabel>
              <dl className="grid grid-cols-1 gap-y-3 border-l border-[var(--line)] pl-4 sm:grid-cols-2 sm:gap-x-6">
                {basicInfoLines.map((line) => (
                  <div key={line.label} className="space-y-0.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      {line.label}
                    </dt>
                    <dd className="font-serif text-base font-semibold text-[var(--ink)]">
                      {line.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section>
            <SectionLabel>每日简版路线</SectionLabel>
            {tripPlan && tripPlan.dailyItinerary.length > 0 ? (
              <ol className="space-y-4">
                {tripPlan.dailyItinerary.map((day, index) => {
                  const highlights = pickDayHighlights(day);
                  return (
                    <li
                      key={`${day.day}-${index}`}
                      className="border-l border-[var(--clay)]/45 pl-4 sm:border-l-2"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-serif text-xl font-semibold text-[var(--clay-deep)]">
                          D{day.day.toString().padStart(2, "0")}
                        </span>
                        <span className="font-serif text-base font-semibold text-[var(--ink)]">
                          {day.theme}
                        </span>
                        {day.date ? (
                          <span className="text-xs text-[var(--ink-faint)]">
                            {day.date}
                          </span>
                        ) : null}
                      </div>
                      {highlights.length > 0 ? (
                        <p className="mt-1.5 text-sm leading-7 text-[var(--ink-muted)]">
                          {highlights.join(" · ")}
                        </p>
                      ) : day.routeReason ? (
                        <p className="mt-1.5 text-sm leading-7 text-[var(--ink-muted)]">
                          {day.routeReason}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="border-l border-[var(--line)] pl-4 text-sm leading-7 text-[var(--ink-muted)]">
                这版方案还在收尾。等你确认后，完整的每日安排会同步到工作台。
              </p>
            )}
          </section>

          <section>
            <SectionLabel>Wanderly · 关于这一版的整理说明</SectionLabel>
            <aside className="border-l-2 border-[var(--clay)] bg-[var(--clay-soft)]/35 px-4 py-3 text-sm leading-7 text-[var(--ink)]">
              {tripPlan?.generalTips?.length ? (
                <ul className="space-y-1.5">
                  {tripPlan.generalTips.map((tip, idx) => (
                    <li key={`${tip}-${idx}`} className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--clay)]"
                      />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--ink-muted)]">
                  Wanderly 会把这一版方案按你的偏好组织：先讲目的地节奏，
                  再排每日停留点，最后用预算和交通串起来。下面是这一版目前的整体花销参考。
                </p>
              )}
              {tripPlan ? (
                <p className="mt-3 border-t border-[var(--clay)]/30 pt-2 text-xs leading-6 text-[var(--ink-muted)]">
                  预算参考 · {tripPlan.budgetSummary?.totalEstimate ?? "待补充"}
                </p>
              ) : null}
            </aside>
          </section>

          {tripPlan?.warnings?.length ? (
            <section>
              <SectionLabel>需要留意的小事</SectionLabel>
              <ul className="space-y-1.5 text-sm leading-7 text-[var(--ink-muted)]">
                {tripPlan.warnings.map((warning, idx) => (
                  <li
                    key={`${warning}-${idx}`}
                    className="border-l border-[var(--sand-deep)]/55 pl-3"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5 border-t border-[var(--line)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                接下来
              </p>
              <h2 className="mt-1 font-serif text-lg font-semibold text-[var(--ink)]">
                满意就出发，还想改就继续聊
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                两个选择都能把这段旅程带去下一个阶段，但节奏不同。
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleAdjust()}
              disabled={isAdjusting || isAccepting}
              data-testid="proposal-preview-adjust-button"
              className="group flex w-full flex-col items-start gap-1.5 border border-[var(--ink)] bg-[var(--paper-bright)] px-4 py-3 text-left transition-colors hover:border-[var(--clay)] hover:bg-[var(--clay-soft)]/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                方式一 · 慢一点
              </span>
              <span className="font-serif text-base font-semibold text-[var(--ink)]">
                {isAdjusting ? "正在回到对话..." : "继续和 AI 调整"}
              </span>
              <span className="text-xs leading-6 text-[var(--ink-muted)]">
                {ADJUST_INTRO_LABEL}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={isAdjusting || isAccepting}
              data-testid="proposal-preview-accept-button"
              className="group flex w-full flex-col items-start gap-1.5 border border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-left text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sand-deep)]">
                方式二 · 进入工作台
              </span>
              <span className="font-serif text-base font-semibold">
                {isAccepting ? "正在为你打开工作台..." : "满意，进入旅行工作台"}
              </span>
              <span className="text-xs leading-6 text-[var(--sand-soft)]">
                {ACCEPT_INTRO_LABEL}
              </span>
            </button>

            {actionError ? (
              <p
                role="alert"
                className="border-l-2 border-[var(--clay)] bg-[var(--clay-soft)]/35 px-3 py-1.5 text-sm leading-6 text-[var(--clay-deep)]"
              >
                {actionError}
              </p>
            ) : null}

            <p className="text-xs leading-6 text-[var(--ink-faint)]">
              进入 Workspace 后仍可以随时回到对话继续修改，Wanderly 不会丢上下文。
            </p>
          </div>
        </aside>
      </div>
    </PreviewShell>
  );
}

interface PreviewShellProps {
  kicker: string;
  title: string;
  subtitle?: string;
  dim?: boolean;
  children: React.ReactNode;
}

function PreviewShell({
  kicker,
  title,
  subtitle,
  dim = false,
  children,
}: PreviewShellProps) {
  return (
    <section
      data-testid="create-proposal-preview"
      data-context={kicker}
      className={`paper-texture relative grid h-full gap-5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)]/90 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 ${
        dim ? "opacity-90" : ""
      }`}
    >
      <header className="space-y-1.5 border-b border-[var(--line)]/70 pb-3">
        <p className="journey-kicker">{kicker}</p>
        <h1 className="journey-title text-2xl leading-[1.1] tracking-[-0.04em] sm:text-[28px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="journey-subtitle max-w-2xl text-sm leading-7">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-serif text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
      {children}
    </p>
  );
}
