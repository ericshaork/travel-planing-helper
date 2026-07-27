"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import loadingMessages from "@/public/images/loading/quotes/loading_messages.json";
import travelQuotes from "@/public/images/loading/quotes/travel_quotes.json";

export type GenerationLoadingContext =
  | "first_version"
  | "final_confirmation"
  | "file_import"
  | "explore_archive";

interface GenerationLoadingPanelProps {
  context: GenerationLoadingContext;
  destinationLabel?: string;
  daysLabel?: string;
  budgetLabel?: string;
  errorMessage?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

interface QuoteEntry {
  text: string;
  author: string;
}

const WATERCOLOR_IMAGES = [
  "/images/loading/watercolor/loading_01_coastal_sunset.png",
  "/images/loading/watercolor/loading_03_japanese_old_town.png",
  "/images/loading/watercolor/loading_05_paris_rainy_street.png",
  "/images/loading/watercolor/loading_13_island_coast.png",
  "/images/loading/watercolor/loading_16_lakeside_town.png",
  "/images/loading/watercolor/loading_18_distant_journey.png",
  "/images/loading/watercolor/loading_02_alpine_lake_valley.png",
  "/images/loading/watercolor/loading_11_mountain_trail.png",
  "/images/loading/watercolor/loading_12_city_arrival.png",
  "/images/loading/watercolor/loading_15_historic_city_lane.png",
] as const;

const CONTEXT_KICKER: Record<GenerationLoadingContext, string> = {
  first_version: "Wanderly · 整理第一版",
  final_confirmation: "Wanderly · 进入工作台",
  file_import: "Wanderly · 整理清单",
  explore_archive: "Wanderly · 整理档案",
};

type QuoteTone = "general" | "city" | "coastal" | "nature" | "culture";

interface QuoteCatalog {
  general: QuoteEntry[];
  city: QuoteEntry[];
  coastal: QuoteEntry[];
  nature: QuoteEntry[];
  culture: QuoteEntry[];
}

interface LoadingMessagesCatalog {
  general: string[];
  city: string[];
  coastal: string[];
  nature: string[];
  culture: string[];
  food: string[];
}

const STATUS_TONE_BY_CONTEXT: Record<
  GenerationLoadingContext,
  { primary: QuoteTone; secondary: QuoteTone[] }
> = {
  first_version: {
    primary: "general",
    secondary: ["city", "nature", "culture"],
  },
  final_confirmation: {
    primary: "general",
    secondary: ["city", "culture"],
  },
  file_import: {
    primary: "general",
    secondary: ["city"],
  },
  explore_archive: {
    primary: "culture",
    secondary: ["general", "city"],
  },
};

function pickInitialIndex(length: number, seed: number) {
  if (length <= 0) return 0;
  return seed % length;
}

function inferQuoteTone(
  context: GenerationLoadingContext,
  destinationLabel?: string,
): QuoteTone {
  const lowered = (destinationLabel ?? "").toLowerCase();
  if (/(海|岛|coast|island|beach|sea)/i.test(lowered)) return "coastal";
  if (/(山|森|林|自然|nature|mountain|forest)/i.test(lowered)) return "nature";
  if (/(古|寺|城|历史|culture|history|museum)/i.test(lowered)) return "culture";
  if (/(city|城市|都市)/i.test(lowered)) return "city";
  return STATUS_TONE_BY_CONTEXT[context].primary;
}

interface Phase {
  id: string;
  title: string;
  detail: string;
}

const PHASE_ORDER: Array<{
  context: GenerationLoadingContext;
  id: string;
  titleFor: (tone: QuoteTone) => string;
  detailFor: (tone: QuoteTone, destination?: string) => string;
}> = [
  {
    context: "first_version",
    id: "phase-1",
    titleFor: (tone) =>
      tone === "coastal"
        ? "正在收集你这次想去的地方"
        : tone === "nature"
          ? "正在翻阅这片土地的轮廓"
          : tone === "culture"
            ? "正在翻阅这座城市的旧事"
            : "正在把你说的五件事翻成旅程",
    detailFor: (tone, destination) =>
      tone === "coastal"
        ? `${destination} 的海风、潮汐与落日已经被写进草稿。`
        : tone === "nature"
          ? `${destination} 的山脉、步道与湖泊已被拼接在草图上。`
          : `${destination} 的节奏、同行人、偏好、预算、目的地都已经拼在一张草稿上。`,
  },
  {
    context: "first_version",
    id: "phase-2",
    titleFor: (tone) =>
      tone === "coastal"
        ? "正在为这片海岸挑选停靠点"
        : tone === "nature"
          ? "正在为这片自然设计走法"
          : "正在为这段旅程选片区",
    detailFor: (tone) =>
      tone === "coastal"
        ? `按潮汐时间整理观景、灯塔、海边小镇和渔港的顺序。`
        : tone === "nature"
          ? `把缆车、栈道和观景台之间的距离理到合适。`
          : `按你的偏好和天数，先把片区顺序理出来。`,
  },
  {
    context: "first_version",
    id: "phase-3",
    titleFor: () => "正在安排每日的停留点",
    detailFor: () =>
      "把候选 POI 按片区和节奏整理，留出吃饭和呼吸的空档。",
  },
  {
    context: "first_version",
    id: "phase-4",
    titleFor: () => "正在把路线装订成册",
    detailFor: () =>
      "排顺之后，旅行就慢慢有了形状，可以翻阅了。",
  },
  {
    context: "final_confirmation",
    id: "phase-1",
    titleFor: () => "正在把这一版方案带回工作台",
    detailFor: () =>
      "会保留所有版本历史，方便你随时回到旧版。",
  },
  {
    context: "final_confirmation",
    id: "phase-2",
    titleFor: () => "正在准备地图和编辑器",
    detailFor: () =>
      "路线会落到地图上，每天的小停留点都可以再微调。",
  },
  {
    context: "final_confirmation",
    id: "phase-3",
    titleFor: () => "正在做最后一遍校对",
    detailFor: () => "出发前的小提示和天气信息也会一起带过去。",
  },
  {
    context: "file_import",
    id: "phase-1",
    titleFor: () => "正在解析你上传的清单",
    detailFor: () => "识别目的地、停留点和节奏，需要一点时间。",
  },
  {
    context: "file_import",
    id: "phase-2",
    titleFor: () => "正在把清单整理成旅程",
    detailFor: () => "你写过的点位会被插入到合适的片区。",
  },
  {
    context: "file_import",
    id: "phase-3",
    titleFor: () => "正在补充建议",
    detailFor: () => "在你已经写下的内容之间，留出慢一点的空档。",
  },
  {
    context: "explore_archive",
    id: "phase-1",
    titleFor: () => "正在打开这份旅行档案",
    detailFor: () => "档案里的路线、节奏和目的地都还在被读取。",
  },
  {
    context: "explore_archive",
    id: "phase-2",
    titleFor: () => "正在把档案回放成完整方案",
    detailFor: () => "你之前的设计会被转换成可编辑的版本。",
  },
  {
    context: "explore_archive",
    id: "phase-3",
    titleFor: () => "正在为你准备进入工作台",
    detailFor: () => "会保留档案的精髓，等待你进一步微调。",
  },
];

function resolvePhasesForContext(context: GenerationLoadingContext): Phase[] {
  return PHASE_ORDER.filter((phase) => phase.context === context).map(
    (phase) => ({
      id: phase.id,
      title: phase.titleFor("general"),
      detail: phase.detailFor("general", ""),
    }),
  );
}

function GenerationLoadingFrame({
  context,
  destinationLabel,
  daysLabel,
  budgetLabel,
  errorMessage,
  onBack,
  onRetry,
}: GenerationLoadingPanelProps) {
  const messagesCatalog = loadingMessages as LoadingMessagesCatalog;
  const quotesCatalog = travelQuotes as QuoteCatalog;

  const destinationText = destinationLabel?.trim()
    ? destinationLabel.trim()
    : "这段旅程";
  const tone = useMemo(
    () => inferQuoteTone(context, destinationLabel),
    [context, destinationLabel],
  );

  const quotePool = useMemo(() => {
    const primary = (quotesCatalog[tone] ?? quotesCatalog.general ?? []) as QuoteEntry[];
    const extras = (STATUS_TONE_BY_CONTEXT[context].secondary ?? []).flatMap(
      (secondary) => (quotesCatalog[secondary] ?? []) as QuoteEntry[],
    );
    return [...primary, ...extras];
  }, [context, quotesCatalog, tone]);

  const messagePool = useMemo(() => {
    const primary = (messagesCatalog[tone] ?? messagesCatalog.general ?? []) as string[];
    return primary;
  }, [messagesCatalog, tone]);

  const basePhases = useMemo(() => {
    return PHASE_ORDER.filter((phase) => phase.context === context).map(
      (phase, index) => ({
        id: phase.id,
        title: phase.titleFor(tone),
        detail: phase.detailFor(tone, destinationText),
        seed: index,
      }),
    );
  }, [context, destinationText, tone]);

  const [statusIndex, setStatusIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(() =>
    pickInitialIndex(quotePool.length, destinationText.length),
  );
  const [bgIndex, setBgIndex] = useState(() =>
    pickInitialIndex(WATERCOLOR_IMAGES.length, destinationText.length),
  );
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const cycleStatus = useCallback(() => {
    if (basePhases.length === 0) return;
    setStatusIndex((i) => (i + 1) % basePhases.length);
  }, [basePhases.length]);

  const cycleQuote = useCallback(() => {
    if (quotePool.length === 0) return;
    setQuoteIndex((i) => (i + 1) % quotePool.length);
  }, [quotePool.length]);

  const cycleBackground = useCallback(() => {
    setBgIndex((i) => (i + 1) % WATERCOLOR_IMAGES.length);
  }, []);

  useEffect(() => {
    if (errorMessage) return;
    const statusTimer = setInterval(cycleStatus, 4200);
    const quoteTimer = setInterval(cycleQuote, 6000);
    const bgTimer = setInterval(cycleBackground, 8000);
    return () => {
      clearInterval(statusTimer);
      clearInterval(quoteTimer);
      clearInterval(bgTimer);
    };
  }, [cycleBackground, cycleQuote, cycleStatus, errorMessage]);

  useEffect(() => {
    if (errorMessage) return;
    const start = startTimeRef.current;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / 95000, 0.96));
    }, 500);
    return () => clearInterval(interval);
  }, [errorMessage]);

  const currentPhase =
    basePhases[statusIndex] ?? resolvePhasesForContext(context)[0] ?? {
      id: "phase-default",
      title: "正在整理",
      detail: "把对话慢慢翻成一版可以翻阅的旅行手册。",
    };

  const currentQuote = quotePool[quoteIndex];
  const currentMessage = messagePool[statusIndex % Math.max(messagePool.length, 1)];
  const metaBits: string[] = [];
  if (daysLabel?.trim()) metaBits.push(daysLabel.trim());
  if (budgetLabel?.trim()) metaBits.push(budgetLabel.trim());

  return (
    <section
      data-testid="create-generation-loading"
      data-context={context}
      className="relative flex min-h-[560px] w-full flex-col overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)]/85 px-4 py-5 sm:px-7 sm:py-6"
    >
      <div className="pointer-events-none absolute inset-0 -z-[1]">
        <Image
          src={WATERCOLOR_IMAGES[bgIndex]}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.18] transition-opacity duration-[3000ms]"
          aria-hidden="true"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgb(255 253 247 / 92%) 0%, rgb(243 238 223 / 86%) 60%, rgb(255 253 247 / 92%) 100%)",
          }}
        />
      </div>

      <header className="relative h-[88px] w-full shrink-0 sm:h-[104px]">
        <Image
          src="/images/loading/loading_top_blank.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-fill"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-4 px-6 sm:px-10">
          <div className="flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-faint)]">
              {CONTEXT_KICKER[context]}
            </p>
            <p className="mt-1 font-serif text-base font-semibold text-[var(--ink)] sm:text-lg">
              {errorMessage ? "整理被打断了" : currentPhase.title}
            </p>
            <p className="mt-1 hidden text-xs leading-5 text-[var(--ink-muted)] sm:block">
              {errorMessage
                ? "刚才的状态还没有回到正轨，可以先回到对话或再试一次。"
                : currentMessage ??
                  `${destinationText} 的旅程正在被慢慢整理，先别担心。`}
            </p>
          </div>
          <div className="hidden flex-col items-end text-right text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)] sm:flex">
            <span>当前阶段</span>
            <span className="font-serif text-sm font-semibold tracking-normal text-[var(--ink)]">
              {metaBits[0] ?? "路线规划"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-stretch justify-center gap-5 py-4">
        {!errorMessage && metaBits.length > 0 ? (
          <p className="text-center text-xs leading-6 text-[var(--ink-muted)]">
            {metaBits.join(" · ")}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="map-desk-chip inline-flex items-center">
            {currentPhase.title}
          </span>
          <p className="max-w-md text-sm leading-7 text-[var(--ink-muted)]">
            {currentPhase.detail}
          </p>
        </div>

        {!errorMessage ? (
          <div className="mx-auto w-full max-w-sm">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--sand-soft)]"
            >
              <div
                className="h-full rounded-full bg-[var(--clay)] transition-[width] duration-700 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              旅行手札 · 准备中
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
            <p
              role="alert"
              className="border-l-2 border-[var(--clay)] bg-[var(--clay-soft)]/35 px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]"
            >
              {errorMessage}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-9 items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] hover:bg-[var(--clay-deep)]"
                >
                  再试一次
                </button>
              ) : null}
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex min-h-9 items-center justify-center border-b border-[var(--ink)] pb-1 text-sm font-semibold text-[var(--ink)] hover:border-[var(--clay)] hover:text-[var(--clay-deep)]"
                >
                  回到对话
                </button>
              ) : null}
            </div>
          </div>
        )}
      </main>

      <footer className="relative mt-auto h-[104px] w-full shrink-0 sm:h-[120px]">
        <Image
          src="/images/loading/loading_bottom_blank.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-fill"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
          {currentQuote ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                旅行手记
              </p>
              <p className="font-serif text-sm leading-7 text-[var(--ink-muted)] sm:text-base">
                「{currentQuote.text}」
              </p>
              <p className="text-[11px] tracking-[0.12em] text-[var(--ink-faint)]">
                —— {currentQuote.author}
              </p>
            </div>
          ) : (
            <p className="font-serif text-sm leading-7 text-[var(--ink-muted)]">
              「慢慢走，城市会告诉你它自己的名字。」
            </p>
          )}
        </div>
      </footer>
    </section>
  );
}

export function GenerationLoadingPanel(props: GenerationLoadingPanelProps) {
  return <GenerationLoadingFrame key={props.context} {...props} />;
}