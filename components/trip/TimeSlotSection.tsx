import { useState, type DragEvent } from "react";

import type { ItineraryBlockView, TimeSlotView } from "../../lib/trip/itinerary-view";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";
import type { MapPoint } from "../../lib/trip/enrichment-types";
import type { DailyTimeSlot } from "../../lib/trip/types";
import {
  getItineraryBlockId,
  getItineraryBlockMapStatus,
} from "../../lib/trip/map-point-match";

import { ItineraryBlock } from "./ItineraryBlock";

interface TimeSlotSectionProps {
  dayNumber: number;
  slot: TimeSlotView;
  mapPoints?: MapPoint[];
  showActions?: boolean;
  activeBlockId?: string | null;
  expandedBlockId?: string | null;
  draggingBlockId?: string | null;
  activeDropSlotId?: string | null;
  onToggleExpand?: (blockId: string) => void;
  onDragStart?: (block: ItineraryBlockView) => void;
  onDragEnd?: () => void;
  onDragHoverSlot?: (slotId: string | null) => void;
  onDropBlock?: (targetDayNumber: number, targetSlotId: string) => void;
  onAddPlace?: (slotId: string) => void;
  onAddNote?: (note: string) => void;
  onAddTimeSlot?: (dayNumber: number, afterSlotId: string) => void;
  onTimeSlotUpdate?: (
    dayNumber: number,
    slotId: string,
    updates: Pick<DailyTimeSlot, "label" | "startTime" | "endTime">,
  ) => void;
  onTimeSlotDelete?: (dayNumber: number, slotId: string) => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: { placeName: string; reason: string },
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}

function getSlotTimeRange(slot: TimeSlotView) {
  if (!slot.startTime && !slot.endTime) {
    return null;
  }

  return `${slot.startTime || "--:--"} - ${slot.endTime || "--:--"}`;
}

export function TimeSlotSection({
  dayNumber,
  slot,
  mapPoints = [],
  showActions = false,
  activeBlockId = null,
  expandedBlockId = null,
  draggingBlockId = null,
  activeDropSlotId = null,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDragHoverSlot,
  onDropBlock,
  onAddPlace,
  onAddNote,
  onAddTimeSlot,
  onTimeSlotUpdate,
  onTimeSlotDelete,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockAction,
}: TimeSlotSectionProps) {
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [isWritingNote, setIsWritingNote] = useState(false);
  const [draftLabel, setDraftLabel] = useState(slot.label);
  const [draftStartTime, setDraftStartTime] = useState(slot.startTime ?? "");
  const [draftEndTime, setDraftEndTime] = useState(slot.endTime ?? "");
  const [draftNote, setDraftNote] = useState("");
  const slotTimeRange = getSlotTimeRange(slot);
  const isActiveDropTarget = activeDropSlotId === slot.id;

  function openSlotEditor() {
    setDraftLabel(slot.label);
    setDraftStartTime(slot.startTime ?? "");
    setDraftEndTime(slot.endTime ?? "");
    setIsEditingSlot(true);
  }

  function saveSlotEditor() {
    onTimeSlotUpdate?.(dayNumber, slot.id, {
      label: draftLabel.trim() || slot.label,
      startTime: draftStartTime,
      endTime: draftEndTime,
    });
    setIsEditingSlot(false);
  }

  function submitNote() {
    if (!draftNote.trim()) {
      return;
    }

    onAddNote?.(draftNote.trim());
    setDraftNote("");
    setIsWritingNote(false);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!draggingBlockId || !showActions) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDragHoverSlot?.(slot.id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!draggingBlockId || !showActions) {
      return;
    }

    event.preventDefault();
    onDragHoverSlot?.(slot.id);
    onDropBlock?.(dayNumber, slot.id);
  }

  return (
    <section
      className={`journal-slot rounded-[18px] border border-dashed px-4 py-4 transition-colors ${
        isActiveDropTarget
          ? "border-[var(--clay-deep)] bg-[rgba(245,236,220,0.75)]"
          : "border-[var(--line)] bg-[rgba(255,253,247,0.5)]"
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="workspace-kicker">时间段</p>
          {isEditingSlot ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                className="min-w-[9rem] rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)]"
                placeholder="时间段名称"
              />
              <input
                type="time"
                value={draftStartTime}
                onChange={(event) => setDraftStartTime(event.target.value)}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)]"
              />
              <input
                type="time"
                value={draftEndTime}
                onChange={(event) => setDraftEndTime(event.target.value)}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)]"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--ink)]">
                {slot.label}
              </h3>
              {slotTimeRange ? (
                <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                  {slotTimeRange}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="journal-chip">
            {slot.isEmpty ? "还没有地点" : `${slot.items.length} 个安排`}
          </span>
          {showActions && !isEditingSlot ? (
            <button
              type="button"
              onClick={openSlotEditor}
              className="rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
            >
              编辑时间段
            </button>
          ) : null}
          {showActions && isEditingSlot ? (
            <>
              <button
                type="button"
                onClick={saveSlotEditor}
                className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--paper-bright)]"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setIsEditingSlot(false)}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                取消
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showActions && isActiveDropTarget ? (
        <p className="mt-2 text-xs font-semibold text-[var(--clay-deep)]">
          拖到这里
        </p>
      ) : null}

      {slot.isEmpty ? (
        <div className="mt-3 rounded-[16px] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-4 py-4">
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            {showActions
              ? `先把 ${slot.label} 想去的地方放进来。`
              : `${slot.label} 暂时留白。`}
          </p>
          {showActions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAddPlace?.(slot.id)}
                className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-[var(--paper-bright)]"
              >
                + 添加地点
              </button>
              <button
                type="button"
                onClick={() => setIsWritingNote(true)}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                写一点备注
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {slot.items.map((block) => {
            const blockId = getItineraryBlockId(block);

            return (
              <ItineraryBlock
                key={blockId}
                block={block}
                showActions={showActions}
                isSelected={activeBlockId === blockId}
                isExpanded={expandedBlockId === blockId}
                onToggleExpand={onToggleExpand ? () => onToggleExpand(blockId) : undefined}
                mapStatus={getItineraryBlockMapStatus(block, mapPoints)}
                onSelect={onBlockSelect ? () => onBlockSelect(block) : undefined}
                onUpdate={onBlockUpdate ? (updates) => onBlockUpdate(block, updates) : undefined}
                onDelete={onBlockDelete ? () => onBlockDelete(block) : undefined}
                onAction={onBlockAction}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            );
          })}

          {showActions ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onAddPlace?.(slot.id)}
                className="rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                + 再加一个地点
              </button>
              <button
                type="button"
                onClick={() => setIsWritingNote(true)}
                className="rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                写备注
              </button>
            </div>
          ) : null}
        </div>
      )}

      {showActions && isWritingNote ? (
        <div className="mt-3 rounded-[16px] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.78)] px-4 py-4">
          <p className="workspace-kicker">当天备注</p>
          <textarea
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
            placeholder="写一点这段安排的提醒、交通或小想法。"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitNote}
              className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-[var(--paper-bright)]"
            >
              保存备注
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftNote("");
                setIsWritingNote(false);
              }}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {showActions ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-[var(--line)] pt-3">
          <button
            type="button"
            onClick={() => onAddTimeSlot?.(dayNumber, slot.id)}
            className="rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
          >
            添加时间段
          </button>
          {slot.id !== slot.key ? (
            <button
              type="button"
              onClick={() => onTimeSlotDelete?.(dayNumber, slot.id)}
              disabled={!slot.isEmpty}
              className="rounded-full border border-dashed border-[var(--clay)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {slot.isEmpty ? "删除时间段" : "先清空再删除"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
