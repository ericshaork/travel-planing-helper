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

interface GenerationLoadingPageProps {
  context: GenerationLoadingContext;
  destinationLabel?: string;
  daysLabel?: string;
  budgetLabel?: string;
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

export function GenerationLoadingPage({
  context,
  destinationLabel,
  daysLabel,
  budgetLabel,
}: GenerationLoadingPageProps) {
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
    const statusTimer = setInterval(cycleStatus, 4200);
    const quoteTimer = setInterval(cycleQuote, 6000);
    const bgTimer = setInterval(cycleBackground, 8000);
    return () => {
      clearInterval(statusTimer);
      clearInterval(quoteTimer);
      clearInterval(bgTimer);
    };
  }, [cycleBackground, cycleQuote, cycleStatus]);

  useEffect(() => {
    const start = startTimeRef.current;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / 95000, 0.96));
    }, 500);
    return () => clearInterval(interval);
  }, []);

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
      className="relative w-full overflow-hidden"
      style={{ minHeight: "calc(100vh - 160px)" }}
    >
      <div className="absolute inset-0">
        <Image
          key={WATERCOLOR_IMAGES[bgIndex]}
          src={WATERCOLOR_IMAGES[bgIndex]}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover transition-opacity duration-[1800ms]"
          aria-hidden="true"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/70"
        />
      </div>

      <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center sm:inset-x-8 sm:top-7">
        <div className="paper-texture pointer-events-auto w-full max-w-[440px] rounded-[18px] border border-[var(--line)]/45 bg-[var(--paper-bright)]/94 px-5 py-3.5 shadow-[0_10px_24px_rgba(60,42,24,0.16)] backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            {CONTEXT_KICKER[context]}
          </p>
          <h2 className="mt-1 font-serif text-base font-semibold leading-snug text-[var(--ink)] sm:text-[17px]">
            {currentPhase.title}
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-[var(--ink-muted)]">
            {currentMessage ??
              `${destinationText} 的旅程正在被慢慢整理，先别担心。`}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-[132px] flex justify-center text-white sm:inset-x-8 sm:bottom-[148px]">
        <div className="pointer-events-auto w-full max-w-2xl">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 font-serif text-base font-semibold leading-snug drop-shadow sm:text-lg">
                {currentPhase.detail}
              </p>
              <div
                role="progressbar"
                aria-label="旅行计划生成进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-white/90 drop-shadow">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center sm:inset-x-8 sm:bottom-7">
        {currentQuote ? (
          <div className="paper-texture pointer-events-auto w-full max-w-[520px] rounded-[18px] border border-[var(--line)]/45 bg-[var(--paper-bright)]/94 px-5 py-3 text-center shadow-[0_10px_24px_rgba(60,42,24,0.16)] backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-faint)]">
              旅行手记 · Wanderly Journal
            </p>
            <p className="mt-1 font-serif text-sm leading-6 text-[var(--ink)] sm:text-[15px]">
              「{currentQuote.text}」
            </p>
            <p className="mt-1 text-[11px] tracking-[0.12em] text-[var(--ink-faint)]">
              —— {currentQuote.author}
            </p>
          </div>
        ) : (
          <div className="paper-texture pointer-events-auto w-full max-w-[520px] rounded-[18px] border border-[var(--line)]/45 bg-[var(--paper-bright)]/94 px-5 py-3 text-center shadow-[0_10px_24px_rgba(60,42,24,0.16)] backdrop-blur-sm">
            <p className="font-serif text-sm leading-6 text-[var(--ink)] sm:text-[15px]">
              「慢慢走，城市会告诉你它自己的名字。」
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
