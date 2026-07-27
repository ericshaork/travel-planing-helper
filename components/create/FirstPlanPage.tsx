"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadProposalPreview,
  type ProposalPreviewData,
} from "@/lib/projects/proposal-preview-client";
import { moveCreateProposalToAdjusting } from "@/lib/projects/create-copilot-client";
import type { DailyItinerary, ItineraryItem } from "@/lib/trip/types";

interface FirstPlanPageProps {
  projectId: string;
  onAdjust?: () => void;
}

interface FirstPlanViewModel {
  title: string;
  destination: string;
  daysLabel: string;
  summary: string;
  itinerary: DailyItinerary[];
}

export type FirstPlanSlotKey = "morning" | "afternoon" | "evening";

export interface FirstPlanSlotView {
  key: FirstPlanSlotKey;
  label: "上午" | "下午" | "晚上";
  primary: ItineraryItem | null;
  extras: ItineraryItem[];
}

const SLOT_ORDER: Array<{ key: FirstPlanSlotKey; label: FirstPlanSlotView["label"] }> = [
  { key: "morning", label: "上午" },
  { key: "afternoon", label: "下午" },
  { key: "evening", label: "晚上" },
];

export function buildDaySlotViews(day: DailyItinerary): FirstPlanSlotView[] {
  return SLOT_ORDER.map(({ key, label }) => {
    const raw = day[key];
    const items = Array.isArray(raw) ? raw.filter(Boolean) : [];
    return {
      key,
      label,
      primary: items[0] ?? null,
      extras: items.slice(1),
    };
  });
}

function buildViewModel(data: ProposalPreviewData | null): FirstPlanViewModel | null {
  if (!data?.version) {
    return null;
  }

  const plan = data.version.tripPlan;
  const request = data.version.tripRequestSnapshot;
  const destination =
    plan?.destination?.trim() || request?.destinationCity?.trim() || "这段旅程";
  const days = plan?.days || request?.days || 0;
  const daysLabel = days > 0 ? `${days} 天` : "天数待确认";
  const fallbackTitle =
    request?.destinationCity?.trim() && days > 0
      ? `${request.destinationCity.trim()} ${days} 天方案`
      : "第一版方案";

  return {
    title: plan?.tripTitle?.trim() || fallbackTitle,
    destination,
    daysLabel,
    summary: plan?.summary?.trim() || "",
    itinerary: plan?.dailyItinerary ?? [],
  };
}

export function FirstPlanPage({ projectId, onAdjust }: FirstPlanPageProps) {
  const router = useRouter();
  const [data, setData] = useState<ProposalPreviewData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

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
            : "暂时还没把第一版方案读出来，可以稍后再试。",
        );
        setSnapshotLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const viewModel = useMemo(() => buildViewModel(data), [data]);

  const handleAdjust = useCallback(async () => {
    setActionError(null);
    setIsAdjusting(true);

    try {
      if (onAdjust) {
        onAdjust();
        return;
      }

      await moveCreateProposalToAdjusting(projectId);
      router.refresh();
    } catch (error) {
      setIsAdjusting(false);
      setActionError(
        error instanceof Error
          ? error.message
          : "这一版暂时切不回可调整状态，可以重试。",
      );
    }
  }, [onAdjust, projectId, router]);

  const handleAccept = useCallback(() => {
    if (!projectId) return;
    setActionError(null);
    setIsAccepting(true);

    window.setTimeout(() => {
      router.replace("/workspace");
    }, 650);
  }, [projectId, router]);

  if (!snapshotLoaded) {
    return (
      <section
        data-testid="create-first-plan"
        className="flex min-h-[560px] flex-col items-center justify-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)]/85 px-6 py-10 text-center"
      >
        <p className="journey-kicker">Wanderly · 第一版方案</p>
        <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
          正在把这版方案从手札里翻出来...
        </h2>
        <p className="max-w-md text-sm leading-7 text-[var(--ink-muted)]">
          旅行的起点在加载中，先别担心。
        </p>
      </section>
    );
  }

  if (loadError || !viewModel) {
    return (
      <section
        data-testid="create-first-plan"
        className="flex min-h-[560px] flex-col items-center justify-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)]/85 px-6 py-10 text-center"
      >
        <p className="journey-kicker">Wanderly · 第一版方案</p>
        <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
          这一版方案还没准备好
        </h2>
        <p className="max-w-md text-sm leading-7 text-[var(--ink-muted)]">
          {loadError ?? "我们还在把这版方案从手札里翻出来，稍后再试一次。"}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-2 inline-flex min-h-9 items-center border-b border-[var(--ink)] pb-1 text-sm font-semibold text-[var(--ink)] hover:border-[var(--clay)] hover:text-[var(--clay-deep)]"
        >
          再翻一次
        </button>
      </section>
    );
  }

  return (
    <section
      data-testid="create-first-plan"
      data-project-id={projectId}
      className="grid gap-6 rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)]/90 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
    >
      <article className="space-y-5">
        <header className="space-y-1.5 border-b border-[var(--line)]/70 pb-3">
          <p className="journey-kicker">Wanderly · 第一版方案</p>
          <h1 className="font-serif text-2xl font-semibold leading-[1.1] tracking-[-0.04em] text-[var(--ink)] sm:text-[28px]">
            {viewModel.title} · {viewModel.destination}
          </h1>
          <p className="text-sm leading-7 text-[var(--ink-muted)]">
            {viewModel.daysLabel}
            {viewModel.summary ? ` · ${viewModel.summary}` : ""}
          </p>
        </header>

        <section>
          <p className="mb-3 font-serif text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            每日路线（上午 / 下午 / 晚上）
          </p>
          {viewModel.itinerary.length > 0 ? (
            <ol className="space-y-5">
              {viewModel.itinerary.map((day, index) => {
                const slots = buildDaySlotViews(day);
                return (
                  <li
                    key={`${day.day}-${index}`}
                    data-testid={`first-plan-day-${day.day}`}
                    className="border-l-2 border-[var(--clay)]/45 pl-4"
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

                    {day.routeReason ? (
                      <p className="mt-2 text-xs leading-6 text-[var(--ink-muted)]">
                        {day.routeReason}
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-3">
                      {slots.map((slot) => (
                        <div
                          key={slot.key}
                          data-testid={`first-plan-day-${day.day}-slot-${slot.key}`}
                          className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3"
                        >
                          <span className="pt-0.5 font-serif text-sm font-semibold text-[var(--clay-deep)]">
                            {slot.label}
                          </span>
                          <div className="min-w-0 space-y-1">
                            {slot.primary ? (
                              <>
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="font-serif text-sm font-semibold text-[var(--ink)]">
                                    {slot.primary.placeName}
                                  </span>
                                  {slot.primary.suggestedDuration ? (
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                                      {slot.primary.suggestedDuration}
                                    </span>
                                  ) : null}
                                </div>
                                {slot.primary.reason ? (
                                  <p className="text-xs leading-6 text-[var(--ink-muted)]">
                                    {slot.primary.reason}
                                  </p>
                                ) : null}
                                {slot.primary.transportFromPrevious ? (
                                  <p className="text-[11px] leading-5 text-[var(--ink-faint)]">
                                    交通：{slot.primary.transportFromPrevious}
                                  </p>
                                ) : null}
                                {slot.extras.length > 0 ? (
                                  <p className="text-[11px] leading-5 text-[var(--ink-faint)]">
                                    + 备选：
                                    {slot.extras
                                      .map((extra) => extra.placeName)
                                      .filter(Boolean)
                                      .join("、")}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <p className="text-xs leading-6 text-[var(--ink-faint)]">
                                这个时段还没排具体活动，进入工作台后可以补上。
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {day.dailyTips && day.dailyTips.length > 0 ? (
                      <p className="mt-3 border-l border-[var(--sand-deep)]/50 pl-2 text-[11px] leading-5 text-[var(--ink-muted)]">
                        小贴士：{day.dailyTips.join("；")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="border-l border-[var(--line)] pl-4 text-sm leading-7 text-[var(--ink-muted)]">
              这版方案的详细安排还在整理中，确认后会一起带去工作台。
            </p>
          )}
        </section>
      </article>

      <aside className="border-t border-[var(--line)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <div className="space-y-5">
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
            data-testid="first-plan-adjust-button"
            className="group flex w-full flex-col items-start gap-1.5 border border-[var(--ink)] bg-[var(--paper-bright)] px-4 py-3 text-left transition-colors hover:border-[var(--clay)] hover:bg-[var(--clay-soft)]/35 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              方式一 · 慢一点
            </span>
            <span className="font-serif text-base font-semibold text-[var(--ink)]">
              {isAdjusting ? "正在回到对话..." : "继续和 AI 调整"}
            </span>
            <span className="text-xs leading-6 text-[var(--ink-muted)]">
              回到 AI 对话，继续提一句你想怎么改，Wanderly 会再整理一版新的。
            </span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAdjusting || isAccepting}
            data-testid="first-plan-accept-button"
            className="group flex w-full flex-col items-start gap-1.5 border border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-left text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sand-deep)]">
              方式二 · 进入工作台
            </span>
            <span className="font-serif text-base font-semibold">
              {isAccepting ? "正在为你打开工作台..." : "满意，进入旅行工作台"}
            </span>
            <span className="text-xs leading-6 text-[var(--sand-soft)]">
              进入 Workspace 后可以继续微调每天的安排、上车点和停留时长。
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
        </div>
      </aside>
    </section>
  );
}
