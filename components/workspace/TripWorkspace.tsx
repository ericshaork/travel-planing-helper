"use client";

import type { ReactNode } from "react";

import { AttractionCard } from "@/components/trip/AttractionCard";
import { BudgetSummaryCard } from "@/components/trip/BudgetSummaryCard";
import { DayCabinet } from "@/components/trip/DayCabinet";
import { HotelAreaAdvice } from "@/components/trip/HotelAreaAdvice";
import { MobileCollapsibleSection } from "@/components/trip/MobileCollapsibleSection";
import { ResultDayNav } from "@/components/trip/ResultDayNav";
import { RouteInsightPanel } from "@/components/trip/RouteInsightPanel";
import { TransportAdvice } from "@/components/trip/TransportAdvice";
import { WeatherAlertCard } from "@/components/trip/WeatherAlertCard";
import { useTripWorkspaceState, type AttractionEntry } from "@/hooks/useTripWorkspaceState";
import {
  getMobileOverviewAccentText,
  MOBILE_OVERVIEW_FALLBACK,
  safeDisplayText,
} from "@/lib/trip/result-overview";
import type { TripPlan, TripRequest } from "@/lib/trip/types";

import { MapPanel } from "./MapPanel";
import { ModificationPanel } from "./ModificationPanel";
import { SaveStatus } from "./SaveStatus";
import { TripEditor } from "./TripEditor";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface MobilePageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

interface TripWorkspaceProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
}

function MobilePageShell({
  title,
  description,
  children,
}: MobilePageShellProps) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          手机端分页浏览
        </p>
        <h1 className="mt-1.5 text-xl font-semibold sm:mt-2 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1.5 text-sm leading-5 text-[var(--ink-muted)] sm:mt-2 sm:leading-6">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
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

export function TripWorkspace({
  tripPlan,
  tripRequest,
}: TripWorkspaceProps) {
  const {
    currentTripPlan,
    workspaceMode,
    tripEnrichment,
    enrichmentState,
    enrichmentError,
    attractions,
    cabinets,
    firstCabinet,
    activeWorkspaceCabinet,
    pendingChanges,
    pendingChangesCount,
    modificationDraft,
    externalDraftVersion,
    activeMobilePage,
    mobileNavItems,
    activeMobileCabinet,
    insightDayItems,
    effectiveSelectedInsightDay,
    selectedInsight,
    desktopSelectedInsight,
    resolvedActiveMapPointId,
    resolvedActiveItineraryBlockId,
    unmatchedBlockPlaceName,
    setModificationDraft,
    handleRegenerated,
    handleBlockAction,
    handleQuickModification,
    handleRemovePendingChange,
    handleClearPendingChanges,
    handleWritePendingChangesToDraft,
    handleWorkspaceModeChange,
    handleDesktopMapPointSelect,
    handleWorkspaceBlockSelect,
    handleWorkspaceFocusEdit,
    handleWorkspaceFocusExport,
    handleMobileNavSelect,
    handleInsightDaySelect,
    handleWorkspaceDaySelect,
  } = useTripWorkspaceState({
    tripPlan,
    tripRequest,
  });

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

  const notesContent = (
    <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-4 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
        临走前再核实
      </p>
      <h2 id="notes-title" className="mt-2 text-xl font-semibold sm:text-2xl">
        注意事项
      </h2>

      {currentTripPlan.warnings.length > 0 ? (
        <ul className="mt-4 space-y-2 bg-[var(--clay-soft)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)] sm:mt-5">
          {currentTripPlan.warnings.map((warning) => (
            <li key={warning}>- {warning}</li>
          ))}
        </ul>
      ) : null}

      {currentTripPlan.generalTips.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
          {currentTripPlan.generalTips.map((tip) => (
            <li key={tip}>- {tip}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const mobileContent = (
    <>
      <div className="sticky top-2.5 z-20 -mx-1 px-1">
        <ResultDayNav
          items={mobileNavItems}
          activeKey={activeMobilePage}
          onSelect={handleMobileNavSelect}
          ariaLabel="结果页分页导航"
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-2">
        {activeMobilePage === "overview" ? (
          <MobilePageShell
            title="旅行总览"
            description="这一页只放总览和下一步入口，不把整份结果一次性摊开。"
          >
            <section className="space-y-3 border border-[var(--line-strong)] bg-[var(--paper-bright)] p-3.5 shadow-[4px_5px_0_var(--sand)]">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                  这一版怎么走
                </p>
                <h2 className="mt-1.5 break-words text-xl font-semibold sm:text-2xl">
                  {currentTripPlan.tripTitle}
                </h2>
                <p className="mt-1.5 text-sm leading-5 text-[var(--ink-muted)] sm:leading-6">
                  {safeDisplayText(
                    currentTripPlan.summary,
                    MOBILE_OVERVIEW_FALLBACK,
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 text-sm">
                <span className="border border-[var(--line)] bg-[var(--sand-soft)] px-2.5 py-1 font-semibold">
                  {currentTripPlan.destination}
                </span>
                <span className="border border-[var(--line)] bg-[var(--sage-soft)] px-2.5 py-1 font-semibold text-[var(--sage-deep)]">
                  {currentTripPlan.days} 天
                </span>
              </div>

              <div className="hidden grid gap-2">
                <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                  预算：{currentTripPlan.budgetSummary.totalEstimate}
                </div>
                <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                  天气：{summarizeWeather(currentTripPlan.weatherSummary)}
                </div>
                <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                  交通：{summarizeTransport(currentTripPlan.transportAdvice)}
                </div>
              </div>

              <p className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs leading-5 text-[var(--ink-muted)]">
                {getMobileOverviewAccentText(currentTripPlan)}
              </p>
            </section>

            <div className="grid gap-2.5">
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                下一步做什么
              </p>

              {firstCabinet ? (
                <button
                  type="button"
                  onClick={() => handleMobileNavSelect(`day-${firstCabinet.dayNumber}`)}
                  className="w-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3.5 py-3 text-left shadow-[3px_3px_0_var(--sand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                >
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
                    看第一天
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    Day {firstCabinet.dayNumber} · {firstCabinet.theme}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">
                    {truncateSummary(firstCabinet.routeSummary, 52)}
                  </p>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => handleMobileNavSelect("edit")}
                className="w-full border border-[var(--ink)] bg-[var(--ink)] px-3.5 py-3 text-left text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--paper-bright)]/80">
                  想直接改
                </p>
                <p className="mt-1 text-base font-semibold">
                  {pendingChangesCount > 0
                    ? `去修改页处理 ${pendingChangesCount} 项`
                    : "去修改页"}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--paper-bright)]/80">
                  快捷修改、导出和重新生成都在那里。
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleMobileNavSelect("edit")}
                className="w-full border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-3 text-left shadow-[3px_3px_0_var(--sand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
                  想带走这版
                </p>
                <p className="mt-1 text-lg font-semibold">去导出方案</p>
                <p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">
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
                  onClick={() => handleMobileNavSelect("edit")}
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
            <BudgetSummaryCard budget={currentTripPlan.budgetSummary} />
          </MobilePageShell>
        ) : null}

        {activeMobilePage === "more" ? (
          <MobilePageShell
            title="更多信息"
            description="天气、景点攻略、住宿、交通和注意事项都放在这里，按需展开就行。"
          >
            <MobileCollapsibleSection
              title="天气提醒"
              summary={summarizeWeather(currentTripPlan.weatherSummary)}
            >
              <WeatherAlertCard weather={currentTripPlan.weatherSummary} />
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              title="景点攻略"
              summary={summarizeAttractions(attractions)}
            >
              {renderAttractionsContent("grid gap-4")}
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              title="住宿区域建议"
              summary={summarizeHotelAdvice(currentTripPlan.hotelAreaAdvice)}
            >
              <HotelAreaAdvice advice={currentTripPlan.hotelAreaAdvice} />
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              title="交通建议"
              summary={summarizeTransport(currentTripPlan.transportAdvice)}
            >
              <TransportAdvice advice={currentTripPlan.transportAdvice} />
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              title="注意事项"
              summary={summarizeNotes(currentTripPlan)}
            >
              {notesContent}
            </MobileCollapsibleSection>
          </MobilePageShell>
        ) : null}

        {activeMobilePage === "route" ? (
          <MobilePageShell
            title="路线洞察"
            description="这一页只看当前 Day 的点位、路线摘要、节奏提醒和天气影响。"
          >
            {insightDayItems.length > 0 ? (
              <ResultDayNav
                items={insightDayItems}
                activeKey={`day-${effectiveSelectedInsightDay}`}
                onSelect={handleInsightDaySelect}
                ariaLabel="路线洞察日期导航"
              />
            ) : null}

            <RouteInsightPanel
              insight={selectedInsight}
              weatherSummary={tripEnrichment?.weatherSummary}
              loading={enrichmentState === "loading"}
              errorMessage={
                enrichmentState === "error" ? enrichmentError : undefined
              }
            />
          </MobilePageShell>
        ) : null}

        {activeMobilePage === "edit" ? (
          <MobilePageShell
            title="修改工作台"
            description="先看待修改清单，再补整体方向，最后确认重排或导出，顺序都收在这一页。"
          >
            <ModificationPanel
              tripPlan={currentTripPlan}
              tripRequest={tripRequest}
              pendingChanges={pendingChanges}
              modificationDraft={modificationDraft}
              externalDraftVersion={externalDraftVersion}
              onRemovePendingChange={handleRemovePendingChange}
              onClearPendingChanges={handleClearPendingChanges}
              onWritePendingChangesToDraft={handleWritePendingChangesToDraft}
              onQuickModification={handleQuickModification}
              onModificationRequestChange={setModificationDraft}
              onRegenerated={handleRegenerated}
            />
          </MobilePageShell>
        ) : null}
      </div>
    </>
  );

  const desktopTopBar = (
    <WorkspaceTopBar
      tripPlan={currentTripPlan}
      tripRequest={tripRequest}
      activeCabinet={activeWorkspaceCabinet}
      enrichmentState={enrichmentState}
      workspaceMode={workspaceMode}
      onWorkspaceModeChange={handleWorkspaceModeChange}
      onFocusExport={handleWorkspaceFocusExport}
      onFocusRegenerate={handleWorkspaceFocusEdit}
      saveAction={
        <SaveStatus
          tripPlan={currentTripPlan}
          tripRequest={tripRequest}
          tripEnrichment={tripEnrichment}
        />
      }
    />
  );

  const desktopMain = (
    <>
      <TripEditor
        cabinets={cabinets}
        activeCabinet={activeWorkspaceCabinet}
        activeDayNumber={activeWorkspaceCabinet?.dayNumber ?? 1}
        insight={desktopSelectedInsight}
        showActions={workspaceMode === "edit"}
        activeBlockId={resolvedActiveItineraryBlockId}
        onSelectDay={handleWorkspaceDaySelect}
        onBlockSelect={handleWorkspaceBlockSelect}
        onBlockAction={handleBlockAction}
      />
      {workspaceMode === "edit" ? (
        <ModificationPanel
          tripPlan={currentTripPlan}
          tripRequest={tripRequest}
          pendingChanges={pendingChanges}
          modificationDraft={modificationDraft}
          externalDraftVersion={externalDraftVersion}
          onRemovePendingChange={handleRemovePendingChange}
          onClearPendingChanges={handleClearPendingChanges}
          onWritePendingChangesToDraft={handleWritePendingChangesToDraft}
          onQuickModification={handleQuickModification}
          onModificationRequestChange={setModificationDraft}
          onRegenerated={handleRegenerated}
        />
      ) : null}
    </>
  );

  const desktopInspector = (
    <MapPanel
      insight={desktopSelectedInsight}
      loading={enrichmentState === "loading"}
      errorMessage={enrichmentState === "error" ? enrichmentError : undefined}
      activePointId={resolvedActiveMapPointId}
      unmatchedPlaceName={unmatchedBlockPlaceName}
      onPointSelect={handleDesktopMapPointSelect}
    />
  );

  return (
    <WorkspaceLayout
      mobile={mobileContent}
      topBar={desktopTopBar}
      main={desktopMain}
      inspector={desktopInspector}
    />
  );
}
