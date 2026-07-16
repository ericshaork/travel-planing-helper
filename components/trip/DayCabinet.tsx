import { useState } from "react";

import type { DailyItinerary, DailyTimeSlot } from "../../lib/trip/types";
import type { MapPoint } from "../../lib/trip/enrichment-types";
import {
  mapDailyItineraryToCabinet,
  type DayCabinetView,
  type ItineraryBlockView,
} from "../../lib/trip/itinerary-view";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";

import { TimeSlotSection } from "./TimeSlotSection";

interface DayCabinetProps {
  itinerary?: DailyItinerary;
  cabinet?: DayCabinetView;
  allCabinets?: DayCabinetView[];
  mapPoints?: MapPoint[];
  showActions?: boolean;
  compactBlankReadMode?: boolean;
  activeBlockId?: string | null;
  onRequestEdit?: () => void;
  onAddPlace?: (slotId: string) => void;
  onAddNote?: (note: string) => void;
  onAddDay?: () => void;
  onOpenAiAssist?: () => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: { placeName: string; reason: string },
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockMove?: (
    block: ItineraryBlockView,
    targetDayNumber: number,
    targetSlotId: string,
  ) => void;
  onTimeSlotAdd?: (dayNumber: number, afterSlotId: string) => void;
  onTimeSlotUpdate?: (
    dayNumber: number,
    slotId: string,
    updates: Pick<DailyTimeSlot, "label" | "startTime" | "endTime">,
  ) => void;
  onTimeSlotDelete?: (dayNumber: number, slotId: string) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}

export function DayCabinet({
  itinerary,
  cabinet,
  allCabinets = [],
  mapPoints = [],
  showActions = false,
  compactBlankReadMode = false,
  activeBlockId = null,
  onRequestEdit,
  onAddPlace,
  onAddNote,
  onAddDay,
  onOpenAiAssist,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockMove,
  onTimeSlotAdd,
  onTimeSlotUpdate,
  onTimeSlotDelete,
  onBlockAction,
}: DayCabinetProps) {
  const resolvedCabinet =
    cabinet ?? (itinerary ? mapDailyItineraryToCabinet(itinerary) : null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<ItineraryBlockView | null>(null);
  const [activeDropSlotId, setActiveDropSlotId] = useState<string | null>(null);

  if (!resolvedCabinet) {
    return null;
  }

  const isEmptyDay = resolvedCabinet.itemCount === 0;
  const isEditSkeleton = showActions && isEmptyDay;
  const otherCabinets = allCabinets.filter(
    (item) => item.dayNumber !== resolvedCabinet.dayNumber,
  );

  function handleToggleExpand(blockId: string) {
    setExpandedBlockId((current) => (current === blockId ? null : blockId));
  }

  function handleDragStart(block: ItineraryBlockView) {
    setDraggingBlock(block);
  }

  function handleDragEnd() {
    setDraggingBlock(null);
    setActiveDropSlotId(null);
  }

  function handleDropBlock(targetDayNumber: number, targetSlotId: string) {
    if (!draggingBlock) {
      return;
    }

    onBlockMove?.(draggingBlock, targetDayNumber, targetSlotId);
    setDraggingBlock(null);
    setActiveDropSlotId(null);
  }

  if (isEditSkeleton) {
    return (
      <article className={compactBlankReadMode ? "pt-0.5" : "pt-1"}>
        <div className="relative z-[1]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="workspace-kicker">编辑草稿</p>
              <h3 className="mt-1.5 text-lg font-semibold text-[var(--ink)] sm:text-xl">
                从这一天开始搭你的旅行柜子
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">
                先补目的地、日期和第一个地点，后面的路线会慢慢长出来。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="journal-chip">{`第 ${resolvedCabinet.dayNumber} 天`}</span>
              <span className="journal-chip">目的地待定</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {resolvedCabinet.slots.map((slot) => (
              <TimeSlotSection
                key={slot.id}
                dayNumber={resolvedCabinet.dayNumber}
                slot={slot}
                showActions
                onAddPlace={onAddPlace}
                onAddNote={onAddNote}
                onAddTimeSlot={onTimeSlotAdd}
                onTimeSlotUpdate={onTimeSlotUpdate}
                onTimeSlotDelete={onTimeSlotDelete}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onAddPlace?.(resolvedCabinet.slots[0]?.id ?? "morning")}
              className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)]"
            >
              添加第一个地点
            </button>
            <button
              type="button"
              onClick={onAddDay}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              添加一天
            </button>
            <button
              type="button"
              onClick={onOpenAiAssist ?? onRequestEdit}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              让 AI 帮我补全
            </button>
          </div>
        </div>
      </article>
    );
  }

  if (isEmptyDay) {
    return (
      <article className={compactBlankReadMode ? "pt-0.5" : "pt-1"}>
        <div className="relative z-[1]">
          <p className="workspace-kicker">旅行手帐</p>
          <h3
            className={
              compactBlankReadMode
                ? "mt-1.5 text-lg font-semibold text-[var(--ink)]"
                : "mt-2 text-lg font-semibold text-[var(--ink)]"
            }
          >
            这一天还没有地点
          </h3>
          <p
            className={
              compactBlankReadMode
                ? "mt-1.5 max-w-xl text-sm leading-6 text-[var(--ink-muted)]"
                : "mt-2 max-w-xl text-sm leading-7 text-[var(--ink-muted)]"
            }
          >
            切到编辑模式，先放进第一个想去的地方。
          </p>

          <div
            className={`journal-slot-empty ${
              compactBlankReadMode ? "mt-4 px-4 py-3" : "mt-6 px-4 py-4"
            }`}
          >
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              添加地点后，这里会慢慢写成这一天的旅行记录。
            </p>
            {onRequestEdit ? (
              <button
                type="button"
                onClick={onRequestEdit}
                className={`inline-flex items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] ${
                  compactBlankReadMode ? "mt-2.5 min-h-9" : "mt-3 min-h-10"
                }`}
              >
                去编辑
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="pt-1">
      <div className="relative z-[1]">
        <header className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-3xl">
              <p className="workspace-kicker">
                {showActions ? "编辑中的行程" : "旅行手帐"}
              </p>
              {resolvedCabinet.date ? (
                <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                  {resolvedCabinet.date}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {resolvedCabinet.routeSummary || "先把地点补齐，再慢慢把顺序排顺。"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="journal-chip">{resolvedCabinet.itemCount} 个地点</span>
              {resolvedCabinet.dailyTips.length > 0 ? (
                <span className="journal-chip">含当天备注</span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="space-y-3">
          {resolvedCabinet.slots.map((slot) => (
            <TimeSlotSection
              key={slot.id}
              dayNumber={resolvedCabinet.dayNumber}
              slot={slot}
              mapPoints={mapPoints}
              showActions={showActions}
              activeBlockId={activeBlockId}
              expandedBlockId={expandedBlockId}
              draggingBlockId={draggingBlock?.item.editorId ?? null}
              activeDropSlotId={activeDropSlotId}
              onToggleExpand={handleToggleExpand}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragHoverSlot={setActiveDropSlotId}
              onDropBlock={(targetDayNumber, targetSlotId) => {
                setActiveDropSlotId(targetSlotId);
                handleDropBlock(targetDayNumber, targetSlotId);
              }}
              onAddPlace={onAddPlace}
              onAddNote={onAddNote}
              onAddTimeSlot={onTimeSlotAdd}
              onTimeSlotUpdate={onTimeSlotUpdate}
              onTimeSlotDelete={onTimeSlotDelete}
              onBlockSelect={onBlockSelect}
              onBlockUpdate={onBlockUpdate}
              onBlockDelete={onBlockDelete}
              onBlockAction={onBlockAction}
            />
          ))}
        </div>

        {showActions && draggingBlock && otherCabinets.length > 0 ? (
          <section className="mt-4 rounded-[18px] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-4 py-4">
            <p className="workspace-kicker">跨日期移动</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              把当前积木拖到其他日期的时间段里。
            </p>
            <div className="mt-3 space-y-3">
              {otherCabinets.map((otherCabinet) => (
                <div key={otherCabinet.dayNumber} className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {`第 ${otherCabinet.dayNumber} 天`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {otherCabinet.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onDragOver={(event) => {
                          event.preventDefault();
                          setActiveDropSlotId(slot.id);
                        }}
                        onDragLeave={() => setActiveDropSlotId((current) => (current === slot.id ? null : current))}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleDropBlock(otherCabinet.dayNumber, slot.id);
                        }}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                          activeDropSlotId === slot.id
                            ? "border-[var(--clay-deep)] bg-[var(--sand-soft)] text-[var(--clay-deep)]"
                            : "border-dashed border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)]"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {showActions ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddDay}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              添加一天
            </button>
            <button
              type="button"
              onClick={onOpenAiAssist ?? onRequestEdit}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              AI 帮我调整
            </button>
          </div>
        ) : null}

        {resolvedCabinet.dailyTips.length > 0 ? (
          <footer className="mt-4 border-t border-dashed border-[var(--line)] pt-4">
            <p className="workspace-kicker">当天备注</p>
            <ul className="mt-2.5 space-y-1.5 text-sm leading-6 text-[var(--ink-muted)]">
              {resolvedCabinet.dailyTips.map((tip) => (
                <li key={tip} className="break-words">
                  - {tip}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </div>
    </article>
  );
}
