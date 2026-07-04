"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AttractionCard } from "@/components/trip/AttractionCard";
import { BudgetSummaryCard } from "@/components/trip/BudgetSummaryCard";
import { DayCabinet } from "@/components/trip/DayCabinet";
import { ExportActions } from "@/components/trip/ExportActions";
import { HotelAreaAdvice } from "@/components/trip/HotelAreaAdvice";
import { MobileCollapsibleSection } from "@/components/trip/MobileCollapsibleSection";
import { ModificationQuickActions } from "@/components/trip/ModificationQuickActions";
import { PendingChangesPanel } from "@/components/trip/PendingChangesPanel";
import { RegenerateBox } from "@/components/trip/RegenerateBox";
import { RegenerateShortcut } from "@/components/trip/RegenerateShortcut";
import { ResultDayNav } from "@/components/trip/ResultDayNav";
import { TransportAdvice } from "@/components/trip/TransportAdvice";
import { TripSummaryCard } from "@/components/trip/TripSummaryCard";
import { WeatherAlertCard } from "@/components/trip/WeatherAlertCard";
import {
  mapTripPlanToCabinets,
  type DayCabinetView,
  type ItineraryBlockView,
} from "@/lib/trip/itinerary-view";
import {
  addPendingChangeItem,
  buildPendingChangeItem,
  buildPendingChangesRequest,
  buildQuickModificationRequest,
  mergeModificationRequest,
  type BlockActionType,
  type PendingChangeItem,
  type QuickModificationType,
} from "@/lib/trip/modification-intents";
import {
  loadTripPlan,
  loadTripRequest,
  saveTripPlan,
} from "@/lib/trip/storage";
import type {
  GenerateTripResponse,
  ItineraryItem,
  TripPlan,
  TripRequest,
} from "@/lib/trip/types";

interface AttractionEntry {
  attraction: ItineraryItem;
  day: number;
}

interface ResultDayNavItem {
  key: string;
  label: string;
  badge?: number;
}

interface MobilePageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

type ResultPageState = "loading" | "missing" | "ready";
type MobilePageKey = "overview" | "budget" | "more" | "edit" | `day-${number}`;

function MobilePageShell({
  title,
  description,
  children,
}: MobilePageShellProps) {
  return (
    <section className="space-y-4">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          手机端分页浏览
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function collectAttractions(tripPlan: TripPlan): AttractionEntry[] {
  const seen = new Set<string>();
  const attractions: AttractionEntry[] = [];

  for (const day of tripPlan.dailyItinerary) {
    const items = [...day.morning, ...day.afternoon, ...day.evening];

    for (const item of items) {
      const key = item.placeName.trim().toLocaleLowerCase();

      if (item.type === "attraction" && !seen.has(key)) {
        seen.add(key);
        attractions.push({ attraction: item, day: day.day });
      }
    }
  }

  return attractions;
}

function truncateSummary(text: string, maxLength = 44) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function summarizeWeather(weather: TripPlan["weatherSummary"]) {
  if (weather.alerts.length > 0) {
    return `有 ${weather.alerts.length} 条天气预警，出发前先确认。`;
  }

  if (weather.reminders.length > 0) {
    return truncateSummary(weather.reminders[0]);
  }

  return truncateSummary(weather.overview);
}

function summarizeAttractions(attractions: AttractionEntry[]) {
  if (attractions.length === 0) {
    return "这版重点放在每日路线里，暂时没有单独展开景点卡。";
  }

  const previewNames = attractions
    .slice(0, 2)
    .map(({ attraction }) => attraction.placeName)
    .join("、");

  return `共 ${attractions.length} 个地点，先看 ${previewNames}。`;
}

function summarizeHotelAdvice(advice: TripPlan["hotelAreaAdvice"]) {
  if (advice.length === 0) {
    return "这版没有单独给出住宿区域建议。";
  }

  const previewAreas = advice
    .slice(0, 2)
    .map((item) => item.area)
    .join("、");

  return `优先看看 ${previewAreas}。`;
}

function summarizeTransport(advice: TripPlan["transportAdvice"]) {
  return truncateSummary(advice.summary);
}

function summarizeNotes(tripPlan: TripPlan) {
  if (tripPlan.warnings.length > 0) {
    return `有 ${tripPlan.warnings.length} 条出发前提醒，建议先过一眼。`;
  }

  if (tripPlan.generalTips.length > 0) {
    return truncateSummary(tripPlan.generalTips[0]);
  }

  return "这版暂时没有额外注意事项。";
}

function desktopNavKeyForMobilePage(page: MobilePageKey): string {
  if (page === "more") {
    return "transport";
  }

  if (page === "edit") {
    return "regenerate";
  }

  return page;
}

export default function ResultPage() {
  const [pageState, setPageState] = useState<ResultPageState>("loading");
  const [tripPlan, setTripPlan] = useState<TripPlan>();
  const [tripRequest, setTripRequest] = useState<TripRequest | null>(null);
  const [activeDesktopNavKey, setActiveDesktopNavKey] = useState("overview");
  const [activeMobilePage, setActiveMobilePage] =
    useState<MobilePageKey>("overview");
  const [modificationDraft, setModificationDraft] = useState("");
  const [pendingChanges, setPendingChanges] = useState<PendingChangeItem[]>([]);
  const [externalDraftVersion, setExternalDraftVersion] = useState(0);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedTripPlan = loadTripPlan();
      const savedTripRequest = loadTripRequest();

      setTripRequest(savedTripRequest);

      if (!savedTripPlan) {
        setPageState("missing");
        return;
      }

      setTripPlan(savedTripPlan);
      setPageState("ready");
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  const attractions = useMemo(
    () => (tripPlan ? collectAttractions(tripPlan) : []),
    [tripPlan],
  );
  const cabinets = useMemo(
    () => (tripPlan ? mapTripPlanToCabinets(tripPlan) : []),
    [tripPlan],
  );
  const firstCabinet = cabinets[0];
  const pendingChangesCount = pendingChanges.length;
  const mobileNavItems = useMemo<ResultDayNavItem[]>(
    () => [
      { key: "overview", label: "总览" },
      ...cabinets.map((cabinet) => ({
        key: `day-${cabinet.dayNumber}`,
        label: `Day ${cabinet.dayNumber}`,
      })),
      { key: "budget", label: "预算" },
      { key: "more", label: "更多" },
      { key: "edit", label: "修改", badge: pendingChangesCount },
    ],
    [cabinets, pendingChangesCount],
  );
  const desktopNavItems = useMemo<ResultDayNavItem[]>(
    () => [
      { key: "overview", label: "总览" },
      ...cabinets.map((cabinet) => ({
        key: `day-${cabinet.dayNumber}`,
        label: `Day ${cabinet.dayNumber}`,
      })),
      { key: "budget", label: "预算" },
      { key: "transport", label: "交通" },
      { key: "regenerate", label: "修改", badge: pendingChangesCount },
    ],
    [cabinets, pendingChangesCount],
  );

  const activeMobileCabinet = useMemo<DayCabinetView | undefined>(() => {
    if (!activeMobilePage.startsWith("day-")) {
      return undefined;
    }

    const dayNumber = Number(activeMobilePage.replace("day-", ""));

    if (Number.isNaN(dayNumber)) {
      return undefined;
    }

    return cabinets.find((cabinet) => cabinet.dayNumber === dayNumber);
  }, [activeMobilePage, cabinets]);

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToRegenerateIfDesktop() {
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollToSection("result-regenerate");
    });
  }

  function goToMobilePage(page: MobilePageKey) {
    setActiveMobilePage(page);
    setActiveDesktopNavKey(desktopNavKeyForMobilePage(page));
  }

  function handleRegenerated(response: GenerateTripResponse) {
    const savedTripPlan = saveTripPlan(response.tripPlan);

    setTripPlan(savedTripPlan);
    setActiveDesktopNavKey("overview");
    setActiveMobilePage("overview");
    setPendingChanges([]);
    setModificationDraft("");
  }

  function handleBlockAction(
    actionType: BlockActionType,
    block: ItineraryBlockView,
  ) {
    const nextPendingChange = buildPendingChangeItem(actionType, block);

    setPendingChanges((current) =>
      addPendingChangeItem(current, nextPendingChange),
    );
  }

  function handleQuickModification(type: QuickModificationType) {
    const nextDraft = buildQuickModificationRequest(type);

    setModificationDraft(nextDraft);
    setExternalDraftVersion((currentVersion) => currentVersion + 1);
    setActiveDesktopNavKey("regenerate");
    setActiveMobilePage("edit");
    scrollToRegenerateIfDesktop();
  }

  function handleRemovePendingChange(id: string) {
    setPendingChanges((current) => current.filter((item) => item.id !== id));
  }

  function handleClearPendingChanges() {
    setPendingChanges([]);
  }

  function handleWritePendingChangesToDraft() {
    const compiledChanges = buildPendingChangesRequest(pendingChanges);

    if (!compiledChanges) {
      return;
    }

    const mergedDraft = mergeModificationRequest(
      modificationDraft,
      compiledChanges,
    );

    setModificationDraft(mergedDraft);
    setPendingChanges([]);
    setExternalDraftVersion((currentVersion) => currentVersion + 1);
    setActiveDesktopNavKey("regenerate");
    setActiveMobilePage("edit");
    scrollToRegenerateIfDesktop();
  }

  function handleMobileNavSelect(key: string) {
    if (key === "overview" || key === "budget" || key === "more" || key === "edit") {
      goToMobilePage(key);
      return;
    }

    if (key.startsWith("day-")) {
      goToMobilePage(key as MobilePageKey);
    }
  }

  function handleDesktopNavSelect(key: string) {
    setActiveDesktopNavKey(key);

    if (key === "overview") {
      scrollToSection("result-overview-desktop");
      return;
    }

    if (key === "budget") {
      scrollToSection("result-budget-desktop");
      return;
    }

    if (key === "transport") {
      scrollToSection("result-transport-desktop");
      return;
    }

    if (key === "regenerate") {
      scrollToSection("result-regenerate");
      return;
    }

    if (key.startsWith("day-")) {
      const dayNumber = Number(key.replace("day-", ""));

      if (Number.isNaN(dayNumber)) {
        return;
      }

      window.requestAnimationFrame(() => {
        scrollToSection(`result-day-desktop-${dayNumber}`);
      });
    }
  }

  function renderAttractionsContent(columnClassName = "grid gap-4 lg:grid-cols-2") {
    if (attractions.length === 0) {
      return (
        <p className="border-l-2 border-[var(--sand-deep)] bg-[var(--sand-soft)] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]">
          这版没有单独标成景点的安排，具体走法都放在每日行程里了。
        </p>
      );
    }

    return (
      <div className={columnClassName}>
        {attractions.map(({ attraction, day }) => (
          <AttractionCard
            key={attraction.placeName}
            attraction={attraction}
            day={day}
          />
        ))}
      </div>
    );
  }

  const notesContent = tripPlan ? (
    <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
        临走前再核实
      </p>
      <h2 id="notes-title" className="mt-2 text-xl font-semibold sm:text-2xl">
        注意事项
      </h2>

      {tripPlan.warnings.length > 0 ? (
        <ul className="mt-4 space-y-2 bg-[var(--clay-soft)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)] sm:mt-5">
          {tripPlan.warnings.map((warning) => (
            <li key={warning}>- {warning}</li>
          ))}
        </ul>
      ) : null}

      {tripPlan.generalTips.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
          {tripPlan.generalTips.map((tip) => (
            <li key={tip}>- {tip}</li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null;

  if (pageState === "loading") {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="text-sm font-semibold text-[var(--ink-muted)]">
            正在翻开刚排好的行程...
          </p>
        </main>
      </div>
    );
  }

  if (pageState === "missing" || !tripPlan) {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto max-w-xl px-5 py-10 sm:py-16">
          <section className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-7 shadow-[8px_9px_0_var(--sand)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              这张纸还空着
            </p>
            <h1 className="mt-3 text-3xl font-semibold">还没有行程结果</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              可以回上一步补信息再生成。要是想彻底换个目的地，就回首页重新写。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/plan"
                className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                回上一步补信息
              </Link>
              <Link
                href="/"
                className="border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                回首页重新写
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-4 pt-2 sm:px-8 sm:pb-20 sm:pt-8">
        <nav
          aria-label="结果页返回入口"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-6"
        >
          <Link
            href="/plan"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回上一步看信息
          </Link>
          <Link
            href="/"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回首页重新写
          </Link>
        </nav>

        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <div className="sticky top-2.5 z-20 -mx-1 px-1">
            <ResultDayNav
              items={mobileNavItems}
              activeKey={activeMobilePage}
              onSelect={handleMobileNavSelect}
              ariaLabel="结果页分页导航"
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-3">
            {activeMobilePage === "overview" ? (
              <MobilePageShell
                title="旅行总览"
                description="这一页只放总览和下一步入口，不把整份结果一次性摊开。"
              >
                <section className="space-y-4 border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[4px_5px_0_var(--sand)]">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                      这一版怎么走
                    </p>
                    <h2 className="mt-2 break-words text-2xl font-semibold">
                      {tripPlan.tripTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      {tripPlan.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="border border-[var(--line)] bg-[var(--sand-soft)] px-3 py-1.5 font-semibold">
                      {tripPlan.destination}
                    </span>
                    <span className="border border-[var(--line)] bg-[var(--sage-soft)] px-3 py-1.5 font-semibold text-[var(--sage-deep)]">
                      {tripPlan.days} 天
                    </span>
                  </div>

                  <div className="grid gap-2">
                    <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                      预算：{tripPlan.budgetSummary.totalEstimate}
                    </div>
                    <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                      天气：{summarizeWeather(tripPlan.weatherSummary)}
                    </div>
                    <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                      交通：{summarizeTransport(tripPlan.transportAdvice)}
                    </div>
                  </div>
                </section>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                    下一步做什么
                  </p>

                  {firstCabinet ? (
                    <button
                      type="button"
                      onClick={() => goToMobilePage(`day-${firstCabinet.dayNumber}`)}
                      className="w-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-4 text-left shadow-[3px_3px_0_var(--sand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                    >
                      <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                        看第一天
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        Day {firstCabinet.dayNumber} · {firstCabinet.theme}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                        {truncateSummary(firstCabinet.routeSummary, 52)}
                      </p>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => goToMobilePage("edit")}
                    className="w-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-4 text-left text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                  >
                    <p className="text-xs font-semibold tracking-[0.12em] text-[var(--paper-bright)]/80">
                      想直接改
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {pendingChangesCount > 0
                        ? `去修改页处理 ${pendingChangesCount} 项`
                        : "去修改页"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--paper-bright)]/80">
                      快捷修改、导出和重新生成都在那里。
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => goToMobilePage("edit")}
                    className="w-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-4 text-left shadow-[3px_3px_0_var(--sand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                  >
                    <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
                      想带走这版
                    </p>
                    <p className="mt-1 text-lg font-semibold">去导出方案</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                      复制完整方案和下载 Markdown 都放在修改工作台里。
                    </p>
                  </button>
                </div>
              </MobilePageShell>
            ) : null}

            {activeMobileCabinet ? (
              <MobilePageShell
                title={`Day ${activeMobileCabinet.dayNumber}`}
                description="这一页只看当天路线。需要改单个积木时，直接在这里操作。"
              >
                {pendingChangesCount > 0 ? (
                  <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[3px_3px_0_var(--sand-soft)]">
                    <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                      已选 {pendingChangesCount} 项待修改
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      你可以继续在这天选积木，也可以先去修改页统一处理，不会强制跳走。
                    </p>
                    <button
                      type="button"
                      onClick={() => goToMobilePage("edit")}
                      className="mt-3 min-h-10 border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                    >
                      去修改页查看
                    </button>
                  </div>
                ) : null}

                <DayCabinet
                  cabinet={activeMobileCabinet}
                  onBlockAction={handleBlockAction}
                />
              </MobilePageShell>
            ) : null}

            {activeMobilePage === "budget" ? (
              <MobilePageShell
                title="预算页"
                description="这一页只看预算相关内容，不把其他信息一起压上来。"
              >
                <BudgetSummaryCard budget={tripPlan.budgetSummary} />
              </MobilePageShell>
            ) : null}

            {activeMobilePage === "more" ? (
              <MobilePageShell
                title="更多信息"
                description="天气、景点攻略、住宿、交通和注意事项都放在这里，按需展开就行。"
              >
                <MobileCollapsibleSection
                  title="天气提醒"
                  summary={summarizeWeather(tripPlan.weatherSummary)}
                >
                  <WeatherAlertCard weather={tripPlan.weatherSummary} />
                </MobileCollapsibleSection>

                <MobileCollapsibleSection
                  title="景点攻略"
                  summary={summarizeAttractions(attractions)}
                >
                  {renderAttractionsContent("grid gap-4")}
                </MobileCollapsibleSection>

                <MobileCollapsibleSection
                  title="住宿区域建议"
                  summary={summarizeHotelAdvice(tripPlan.hotelAreaAdvice)}
                >
                  <HotelAreaAdvice advice={tripPlan.hotelAreaAdvice} />
                </MobileCollapsibleSection>

                <MobileCollapsibleSection
                  title="交通建议"
                  summary={summarizeTransport(tripPlan.transportAdvice)}
                >
                  <TransportAdvice advice={tripPlan.transportAdvice} />
                </MobileCollapsibleSection>

                <MobileCollapsibleSection
                  title="注意事项"
                  summary={summarizeNotes(tripPlan)}
                >
                  {notesContent}
                </MobileCollapsibleSection>
              </MobilePageShell>
            ) : null}

            {activeMobilePage === "edit" ? (
              <MobilePageShell
                title="修改工作台"
                description="先看待修改清单，再补整体方向，最后确认重排或导出，顺序都收在这一页。"
              >
                <section className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[3px_3px_0_var(--sand-soft)]">
                  <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                    调整这版
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">
                    先收修改，再决定要不要重排。
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    现在有 {pendingChangesCount} 项待修改。积木操作会先进清单，真正提交还是下面这个修改框。
                  </p>
                </section>

                <PendingChangesPanel
                  items={pendingChanges}
                  onRemove={handleRemovePendingChange}
                  onClear={handleClearPendingChanges}
                  onWriteToDraft={handleWritePendingChangesToDraft}
                />

                <ModificationQuickActions onSelect={handleQuickModification} />

                <RegenerateBox
                  tripPlan={tripPlan}
                  tripRequest={tripRequest}
                  modificationRequest={modificationDraft}
                  externalDraftVersion={externalDraftVersion}
                  onModificationRequestChange={setModificationDraft}
                  onRegenerated={handleRegenerated}
                />

                <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4">
                  <ExportActions tripPlan={tripPlan} />
                </div>
              </MobilePageShell>
            ) : null}
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="space-y-4 sm:space-y-5">
            <div className="sticky top-3 z-20 -mx-1 px-1">
              <ResultDayNav
                items={desktopNavItems}
                activeKey={activeDesktopNavKey}
                onSelect={handleDesktopNavSelect}
                ariaLabel="结果页滚动导航"
              />
            </div>

            <div
              id="result-overview-desktop"
              className="scroll-mt-32 space-y-4 sm:space-y-5"
            >
              <TripSummaryCard tripPlan={tripPlan} />
              <RegenerateShortcut
                onJump={() => handleDesktopNavSelect("regenerate")}
              />
            </div>
          </div>

          <div className="mt-6 grid items-start gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <WeatherAlertCard weather={tripPlan.weatherSummary} />

            <div id="result-budget-desktop" className="scroll-mt-32">
              <BudgetSummaryCard budget={tripPlan.budgetSummary} />
            </div>
          </div>

          <section aria-labelledby="daily-title" className="mt-12 sm:mt-14">
            <div className="mb-5 max-w-2xl sm:mb-6">
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                按天照着走
              </p>
              <h2 id="daily-title" className="mt-2 text-2xl font-semibold sm:text-3xl">
                每日行程
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                同一天尽量排在相近片区。累了就删一项，别为了打卡把自己赶着跑。
              </p>
            </div>

            {pendingChangesCount > 0 ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-3 shadow-[3px_3px_0_var(--sand-soft)] sm:mb-6">
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                    已选 {pendingChangesCount} 项待修改
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    可以继续看 Day，也可以去右侧修改区统一写入修改框。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDesktopNavSelect("regenerate")}
                  className="min-h-10 border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                >
                  去修改区查看
                </button>
              </div>
            ) : null}

            <div className="space-y-7">
              {cabinets.map((cabinet) => (
                <div
                  key={cabinet.dayNumber}
                  id={`result-day-desktop-${cabinet.dayNumber}`}
                  className="scroll-mt-32"
                >
                  <DayCabinet
                    cabinet={cabinet}
                    onBlockAction={handleBlockAction}
                  />
                </div>
              ))}
            </div>
          </section>

          <section
            id="result-attractions-desktop"
            aria-labelledby="attraction-title"
            className="mt-12 sm:mt-14"
          >
            <div className="mb-4 sm:mb-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
                到地方别只看简介
              </p>
              <h2
                id="attraction-title"
                className="mt-2 text-2xl font-semibold sm:text-3xl"
              >
                景点攻略
              </h2>
            </div>
            {renderAttractionsContent()}
          </section>

          <div className="mt-12 sm:mt-14">
            <HotelAreaAdvice advice={tripPlan.hotelAreaAdvice} />
          </div>

          <div
            id="result-transport-desktop"
            className="mt-12 scroll-mt-32 sm:mt-14"
          >
            <TransportAdvice advice={tripPlan.transportAdvice} />
          </div>

          <section className="mt-12 grid items-start gap-5 sm:mt-14 sm:gap-6 lg:grid-cols-[1fr_0.9fr]">
            {notesContent}

            <div className="space-y-4 sm:space-y-5">
              <section
                id="result-regenerate"
                className="scroll-mt-32 border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 shadow-[4px_4px_0_var(--sand-soft)] sm:p-5"
              >
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                  修改工作台
                </p>
                <h2 className="mt-2 text-xl font-semibold">先收修改，再统一重排。</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  待修改清单、整体快捷修改、重新生成和导出都放在这一列。积木操作不会直接提交，最后还是由修改框统一确认。
                </p>
              </section>

              <PendingChangesPanel
                items={pendingChanges}
                onRemove={handleRemovePendingChange}
                onClear={handleClearPendingChanges}
                onWriteToDraft={handleWritePendingChangesToDraft}
              />

              <ModificationQuickActions onSelect={handleQuickModification} />

              <RegenerateBox
                tripPlan={tripPlan}
                tripRequest={tripRequest}
                modificationRequest={modificationDraft}
                externalDraftVersion={externalDraftVersion}
                onModificationRequestChange={setModificationDraft}
                onRegenerated={handleRegenerated}
              />

              <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 sm:p-6">
                <ExportActions tripPlan={tripPlan} />
              </div>
            </div>
          </section>
        </div>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
