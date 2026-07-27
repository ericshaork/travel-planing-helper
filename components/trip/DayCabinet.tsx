import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import type { MapPoint } from "../../lib/trip/enrichment-types";
import {
  mapDailyItineraryToCabinet,
  type DayCabinetView,
  type ItineraryBlockUpdate,
  type ItineraryBlockView,
  type TimeSlotView,
} from "../../lib/trip/itinerary-view";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";
import {
  getItineraryBlockId,
  getItineraryBlockMapStatus,
} from "../../lib/trip/map-point-match";
import type { DailyItinerary, DailyTimeSlot } from "../../lib/trip/types";
import type { WorkspaceCreateEventInput } from "../../lib/trip/workspace-events";

import { ItineraryBlock } from "./ItineraryBlock";
import { TimeSlotSection } from "./TimeSlotSection";
import { WorkspaceEventCreatePanel } from "./WorkspaceEventCreatePanel";
import { WorkspaceEventEditor } from "./WorkspaceEventEditor";

interface DayCabinetProps {
  itinerary?: DailyItinerary;
  cabinet?: DayCabinetView;
  allCabinets?: DayCabinetView[];
  mapPoints?: MapPoint[];
  showActions?: boolean;
  compactBlankReadMode?: boolean;
  compactEmptyEditMode?: boolean;
  activeBlockId?: string | null;
  searchCity?: string;
  onRequestEdit?: () => void;
  editEmptyToolbar?: ReactNode;
  onAddPlace?: (slotId: string, input?: WorkspaceCreateEventInput) => void;
  onAddNote?: (note: string) => void;
  onAddDay?: () => void;
  onOpenAiAssist?: () => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: ItineraryBlockUpdate,
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockSelectionClear?: () => void;
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
  onTimeSlotsChange?: (dayNumber: number, timeSlots: DailyTimeSlot[]) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}

const EDIT_EMPTY_CABINET_IMAGE = "/images/workspace/edit-empty-cabinet-bg.png";
const EMPTY_READ_COVER_IMAGE = "/images/workspace/empty-read-mode-cover.png";
const CABINET_START_MINUTES = 6 * 60;
const CABINET_END_MINUTES = 24 * 60;
const CABINET_TOTAL_MINUTES = CABINET_END_MINUTES - CABINET_START_MINUTES;
const CABINET_TIME_STEP_MINUTES = 15;
const CABINET_MIN_SLOT_MINUTES = 60;
const CABINET_MIN_SLOT_PERCENT =
  (CABINET_MIN_SLOT_MINUTES / CABINET_TOTAL_MINUTES) * 100;
const CABINET_STEP_PERCENT =
  (CABINET_TIME_STEP_MINUTES / CABINET_TOTAL_MINUTES) * 100;
const CABINET_SLOT_KEYS: DailyTimeSlot["baseSlot"][] = [
  "morning",
  "afternoon",
  "evening",
];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseTimeToMinutes(value?: string) {
  if (!value) {
    return null;
  }

  const [hourText, minuteText = "0"] = value.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return clampNumber(hours * 60 + minutes, CABINET_START_MINUTES, CABINET_END_MINUTES);
}

function formatMinutesAsTime(minutes: number) {
  if (minutes >= CABINET_END_MINUTES) {
    return "24:00";
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(restMinutes).padStart(2, "0")}`;
}

function roundToCabinetStep(minutes: number) {
  return Math.round(minutes / CABINET_TIME_STEP_MINUTES) * CABINET_TIME_STEP_MINUTES;
}

function minutesToDividerPercent(minutes: number) {
  return ((minutes - CABINET_START_MINUTES) / CABINET_TOTAL_MINUTES) * 100;
}

function dividerPercentToMinutes(percent: number) {
  const rawMinutes =
    CABINET_START_MINUTES + (percent / 100) * CABINET_TOTAL_MINUTES;

  return clampNumber(
    roundToCabinetStep(rawMinutes),
    CABINET_START_MINUTES + CABINET_MIN_SLOT_MINUTES,
    CABINET_END_MINUTES - CABINET_MIN_SLOT_MINUTES,
  );
}

function clampDividerPercent(percent: number, min: number, max: number) {
  return clampNumber(percent, min, max);
}

function pointerPositionToDividerPercent(
  clientY: number,
  bounds: Pick<DOMRect, "top" | "height">,
) {
  if (bounds.height <= 0) {
    return 0;
  }

  return ((clientY - bounds.top) / bounds.height) * 100;
}

function getClosestCabinetTick(minutes: number) {
  const ticks = [6, 9, 12, 15, 18, 21, 24].map((hour) => hour * 60);

  return ticks.reduce((closest, current) =>
    Math.abs(current - minutes) < Math.abs(closest - minutes) ? current : closest,
  );
}

function normalizeDividerPercents(first: number, second: number) {
  const minFirst = CABINET_MIN_SLOT_PERCENT;
  const maxSecond = 100 - CABINET_MIN_SLOT_PERCENT;
  const normalizedFirst = clampNumber(
    first,
    minFirst,
    Math.min(second - CABINET_MIN_SLOT_PERCENT, maxSecond - CABINET_MIN_SLOT_PERCENT),
  );
  const normalizedSecond = clampNumber(
    second,
    normalizedFirst + CABINET_MIN_SLOT_PERCENT,
    maxSecond,
  );

  return [normalizedFirst, normalizedSecond] as const;
}

function getFallbackCabinetBoundaries(slotCount: number) {
  const safeSlotCount = Math.max(slotCount, 1);
  const segmentMinutes = CABINET_TOTAL_MINUTES / safeSlotCount;

  return Array.from({ length: safeSlotCount + 1 }, (_, index) => {
    if (index === 0) {
      return CABINET_START_MINUTES;
    }

    if (index === safeSlotCount) {
      return CABINET_END_MINUTES;
    }

    return roundToCabinetStep(CABINET_START_MINUTES + segmentMinutes * index);
  });
}

function normalizeCabinetBoundaryMinutes(
  candidateBoundaries: Array<number | null | undefined>,
  slotCount: number,
) {
  if (slotCount <= 0) {
    return [CABINET_START_MINUTES, CABINET_END_MINUTES];
  }

  if (
    candidateBoundaries.length !== slotCount - 1 ||
    candidateBoundaries.some((boundary) => boundary === null || boundary === undefined)
  ) {
    return getFallbackCabinetBoundaries(slotCount);
  }

  const normalized = [CABINET_START_MINUTES];

  for (let index = 0; index < candidateBoundaries.length; index += 1) {
    const rawBoundary = candidateBoundaries[index] ?? CABINET_START_MINUTES;
    const remainingSlots = slotCount - index - 1;
    const minAllowed = normalized[index] + CABINET_MIN_SLOT_MINUTES;
    const maxAllowed =
      CABINET_END_MINUTES - remainingSlots * CABINET_MIN_SLOT_MINUTES;

    normalized.push(
      clampNumber(roundToCabinetStep(rawBoundary), minAllowed, maxAllowed),
    );
  }

  normalized.push(CABINET_END_MINUTES);

  return normalized;
}

export function getCabinetBoundaryMinutes(
  slots: Pick<DailyTimeSlot, "startTime" | "endTime">[],
) {
  const slotCount = slots.length;

  if (slotCount <= 1) {
    return [CABINET_START_MINUTES, CABINET_END_MINUTES];
  }

  const candidateBoundaries = slots
    .slice(0, -1)
    .map(
      (slot, index) =>
        parseTimeToMinutes(slot.endTime) ??
        parseTimeToMinutes(slots[index + 1]?.startTime),
    );

  return normalizeCabinetBoundaryMinutes(candidateBoundaries, slotCount);
}

export function getCabinetDividerPercentsArray(
  slots: Pick<DailyTimeSlot, "startTime" | "endTime">[],
) {
  return getCabinetBoundaryMinutes(slots)
    .slice(1, -1)
    .map(minutesToDividerPercent);
}

export function getCabinetBoundaryMinutesFromDividerPercents(
  dividerPercents: number[],
) {
  const candidateBoundaries = dividerPercents.map((percent) =>
    dividerPercentToMinutes(percent),
  );

  return normalizeCabinetBoundaryMinutes(
    candidateBoundaries,
    Math.max(dividerPercents.length + 1, 1),
  );
}

export function updateCabinetDividerPercentsAtIndex(
  dividerPercents: number[],
  dividerIndex: number,
  dividerPercent: number,
) {
  const nextDividerPercents = [...dividerPercents];

  nextDividerPercents[dividerIndex] = dividerPercent;

  return getCabinetBoundaryMinutesFromDividerPercents(nextDividerPercents)
    .slice(1, -1)
    .map(minutesToDividerPercent);
}

export function insertCabinetDividerPercent(dividerPercents: number[]) {
  const boundaries = getCabinetBoundaryMinutesFromDividerPercents(dividerPercents);
  const segments = boundaries
    .slice(0, -1)
    .map((boundary, index) => ({
      index,
      duration: (boundaries[index + 1] ?? boundary) - boundary,
      start: boundary,
      end: boundaries[index + 1] ?? boundary,
    }))
    .sort((left, right) => right.duration - left.duration);
  const targetSegment = segments[0];

  if (!targetSegment || targetSegment.duration < CABINET_MIN_SLOT_MINUTES * 2) {
    return dividerPercents;
  }

  const dividerMinutes = clampNumber(
    roundToCabinetStep(targetSegment.start + targetSegment.duration / 2),
    targetSegment.start + CABINET_MIN_SLOT_MINUTES,
    targetSegment.end - CABINET_MIN_SLOT_MINUTES,
  );

  return getCabinetBoundaryMinutesFromDividerPercents([
    ...dividerPercents,
    minutesToDividerPercent(dividerMinutes),
  ])
    .slice(1, -1)
    .map(minutesToDividerPercent);
}

export function removeCabinetDividerPercent(
  dividerPercents: number[],
  dividerIndex: number,
) {
  const nextDividerPercents = dividerPercents.filter(
    (_, index) => index !== dividerIndex,
  );

  return getCabinetBoundaryMinutesFromDividerPercents(nextDividerPercents)
    .slice(1, -1)
    .map(minutesToDividerPercent);
}

export function getCabinetDividerPercents(
  slots: Pick<DailyTimeSlot, "startTime" | "endTime">[],
) {
  const [first = minutesToDividerPercent(12 * 60), second = minutesToDividerPercent(18 * 60)] =
    getCabinetDividerPercentsArray(slots);

  return normalizeDividerPercents(first, second);
}

export function buildCabinetTimeSlotsFromDividerPercentsArray(
  slots: Pick<DailyTimeSlot, "id" | "baseSlot" | "label" | "startTime" | "endTime">[],
  dividerPercents: number[],
): DailyTimeSlot[] {
  const slotCount = Math.max(slots.length, 1);
  const candidateBoundaries = dividerPercents
    .slice(0, Math.max(slotCount - 1, 0))
    .map((percent) => dividerPercentToMinutes(percent));
  const boundaries = normalizeCabinetBoundaryMinutes(
    candidateBoundaries,
    slotCount,
  );

  return Array.from({ length: slotCount }, (_, index) => {
    const previous =
      slots[index] ??
      slots[slots.length - 1] ?? {
        id: CABINET_SLOT_KEYS[index] ?? `slot-${index + 1}`,
        baseSlot:
          CABINET_SLOT_KEYS[index] ??
          slots[slots.length - 1]?.baseSlot ??
          "evening",
        label: "",
      };
    const startTime = formatMinutesAsTime(boundaries[index] ?? CABINET_START_MINUTES);
    const endTime = formatMinutesAsTime(
      boundaries[index + 1] ?? CABINET_END_MINUTES,
    );

    return {
      id: previous.id,
      baseSlot: previous.baseSlot,
      label: `${startTime}-${endTime}`,
      startTime,
      endTime,
    };
  });
}

export function buildCabinetTimeSlotsFromDividerPercents(
  slots: Pick<DailyTimeSlot, "id" | "baseSlot" | "label" | "startTime" | "endTime">[],
  firstPercent: number,
  secondPercent: number,
): DailyTimeSlot[] {
  return buildCabinetTimeSlotsFromDividerPercentsArray(slots, [
    firstPercent,
    secondPercent,
  ]);
}

export function updateCabinetTimeSlotsAtDivider(
  slots: Pick<DailyTimeSlot, "id" | "baseSlot" | "label" | "startTime" | "endTime">[],
  dividerIndex: number,
  dividerPercent: number,
) {
  const nextDividerPercents = getCabinetDividerPercentsArray(slots);

  nextDividerPercents[dividerIndex] = dividerPercent;

  return buildCabinetTimeSlotsFromDividerPercentsArray(
    slots,
    nextDividerPercents,
  );
}

type DayDividerOverride = {
  sourceSignature: string;
  positions: number[];
};

type DayDividerOverrideMap = Record<number, DayDividerOverride | undefined>;

export function resolveDayDividerPositions(input: {
  dayNumber: number;
  sourceSignature: string;
  initialPositions: number[];
  overrides: DayDividerOverrideMap;
}) {
  const dayOverride = input.overrides[input.dayNumber];

  if (!dayOverride || dayOverride.sourceSignature !== input.sourceSignature) {
    return input.initialPositions;
  }

  return dayOverride.positions;
}

export function updateDayDividerOverrides(input: {
  dayNumber: number;
  sourceSignature: string;
  positions: number[];
  overrides: DayDividerOverrideMap;
}) {
  return {
    ...input.overrides,
    [input.dayNumber]: {
      sourceSignature: input.sourceSignature,
      positions: input.positions,
    },
  };
}

function createCabinetSlotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `slot-${crypto.randomUUID()}`;
  }

  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function insertCabinetTimeSlot(
  slots: Pick<DailyTimeSlot, "id" | "baseSlot" | "label" | "startTime" | "endTime">[],
  afterSlotId?: string,
): DailyTimeSlot[] {
  if (slots.length === 0) {
    return [];
  }

  const boundaries = getCabinetBoundaryMinutes(slots);
  const explicitIndex = afterSlotId
    ? slots.findIndex((slot) => slot.id === afterSlotId)
    : -1;
  const splitIndex =
    explicitIndex >= 0
      ? explicitIndex
      : boundaries
          .slice(0, -1)
          .map((boundary, index) => ({
            index,
            duration: (boundaries[index + 1] ?? boundary) - boundary,
          }))
          .sort((left, right) => right.duration - left.duration)[0]?.index ?? 0;
  const slotStart = boundaries[splitIndex] ?? CABINET_START_MINUTES;
  const slotEnd = boundaries[splitIndex + 1] ?? CABINET_END_MINUTES;

  if (slotEnd - slotStart < CABINET_MIN_SLOT_MINUTES * 2) {
    return buildCabinetTimeSlotsFromDividerPercentsArray(slots, [
      ...getCabinetDividerPercentsArray(slots),
    ]);
  }

  const midpoint = roundToCabinetStep(slotStart + (slotEnd - slotStart) / 2);
  const dividerMinutes = clampNumber(
    midpoint,
    slotStart + CABINET_MIN_SLOT_MINUTES,
    slotEnd - CABINET_MIN_SLOT_MINUTES,
  );
  const nextSlots = [...slots];

  nextSlots.splice(splitIndex + 1, 0, {
    id: createCabinetSlotId(),
    baseSlot: slots[splitIndex]?.baseSlot ?? "afternoon",
    label: "",
    startTime: "",
    endTime: "",
  });

  const nextDividerPercents = getCabinetDividerPercentsArray(slots);
  nextDividerPercents.splice(
    splitIndex,
    0,
    minutesToDividerPercent(dividerMinutes),
  );

  return buildCabinetTimeSlotsFromDividerPercentsArray(
    nextSlots,
    nextDividerPercents,
  );
}

export function EmptyReadDayNotebook({
  dayNumber,
  onRequestEdit,
  compact = false,
}: {
  dayNumber: number;
  onRequestEdit?: () => void;
  compact?: boolean;
}) {
  return (
    <article className={compact ? "min-h-0 flex-1 pt-0" : "pt-1"}>
      <div
        className={`relative overflow-hidden rounded-[22px] border border-[rgba(158,136,110,0.16)] bg-cover shadow-[4px_5px_0_var(--sand-soft)] ${
          compact ? "h-full min-h-0 bg-[position:center_45%]" : "min-h-[32rem] bg-center"
        }`}
        style={{
          backgroundImage: `url('${EMPTY_READ_COVER_IMAGE}')`,
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,247,0.86)_0%,rgba(255,253,247,0.72)_36%,rgba(255,253,247,0.18)_72%,rgba(255,253,247,0.04)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(67,49,37,0.04)_0%,rgba(67,49,37,0.1)_100%)]" />

        <div className="relative z-[1] flex h-full min-h-0 max-w-[26rem] flex-col justify-between px-5 py-5 sm:px-6 sm:py-5">
          <div>
            <p className="workspace-kicker">空白旅行手帐</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-3xl">
              这一页还在等待第一站
            </h3>
            <p className="mt-3 max-w-[21rem] text-sm leading-6 text-[var(--ink-muted)]">
              先放入一个想去的地方，路线和故事会慢慢长出来。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-dashed border-[rgba(158,136,110,0.2)] pt-3">
            <span className="journal-chip bg-[rgba(255,253,247,0.66)] py-1 text-[11px]">{`第 ${dayNumber} 天`}</span>
            <span className="journal-chip bg-[rgba(255,253,247,0.66)] py-1 text-[11px]">
              未填写
            </span>
            {onRequestEdit ? (
              <button
                type="button"
                onClick={onRequestEdit}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-[rgba(88,69,52,0.42)] bg-[rgba(255,253,247,0.76)] px-4 py-1.5 text-sm font-semibold text-[var(--ink)] shadow-[2px_2px_0_var(--sand-soft)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                开始填写
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function EditEmptyCabinet({
  dayNumber,
  slots,
  mapPoints = [],
  toolbar,
  compact = false,
  activeBlockId = null,
  selectedEventId = null,
  expandedBlockId = null,
  draggingBlockId = null,
  activeDropSlotId = null,
  createEventPanel,
  selectedEventBlock,
  onOpenCreateEvent,
  onAddNote,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDragHoverSlot,
  onDropBlock,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onCloseEventEditor,
  onBlockAction,
}: {
  dayNumber: number;
  slots: DayCabinetView["slots"];
  mapPoints?: MapPoint[];
  toolbar?: ReactNode;
  compact?: boolean;
  activeBlockId?: string | null;
  selectedEventId?: string | null;
  expandedBlockId?: string | null;
  draggingBlockId?: string | null;
  activeDropSlotId?: string | null;
  createEventPanel?: ReactNode;
  selectedEventBlock?: ItineraryBlockView | null;
  onOpenCreateEvent?: (slotId: string) => void;
  onAddNote?: (note: string) => void;
  onToggleExpand?: (blockId: string) => void;
  onDragStart?: (block: ItineraryBlockView) => void;
  onDragEnd?: () => void;
  onDragHoverSlot?: (slotId: string | null) => void;
  onDropBlock?: (targetDayNumber: number, targetSlotId: string) => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: ItineraryBlockUpdate,
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onCloseEventEditor?: () => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}) {
  const cabinetSurfaceRef = useRef<HTMLDivElement | null>(null);
  const dividerSourceSlots = useMemo<DailyTimeSlot[]>(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        baseSlot: slot.key,
        label: slot.label,
        startTime: slot.startTime ?? "",
        endTime: slot.endTime ?? "",
      })),
    [slots],
  );
  const dividerSourceSignature = useMemo(
    () =>
      dividerSourceSlots
        .map((slot) => `${slot.id}:${slot.startTime}:${slot.endTime}`)
        .join("|"),
    [dividerSourceSlots],
  );
  const initialDividerPositions = useMemo(
    () => getCabinetDividerPercentsArray(dividerSourceSlots),
    [dividerSourceSlots],
  );
  const [dividerOverrides, setDividerOverrides] = useState<DayDividerOverrideMap>(
    {},
  );
  const dividerPositions = resolveDayDividerPositions({
    dayNumber,
    sourceSignature: dividerSourceSignature,
    initialPositions: initialDividerPositions,
    overrides: dividerOverrides,
  });
  const dividerPositionsRef = useRef<number[]>(dividerPositions);
  const [draggingDividerIndex, setDraggingDividerIndex] = useState<number | null>(null);
  const ticks = ["06", "09", "12", "15", "18", "21", "24"];

  useEffect(() => {
    dividerPositionsRef.current = dividerPositions;
  }, [dividerPositions]);

  const dividerBoundaries = useMemo(
    () => getCabinetBoundaryMinutesFromDividerPercents(dividerPositions),
    [dividerPositions],
  );
  const activeDividerMinutes =
    draggingDividerIndex === null
      ? null
      : dividerBoundaries[draggingDividerIndex + 1] ?? null;
  const activeTickMinutes =
    activeDividerMinutes === null ? null : getClosestCabinetTick(activeDividerMinutes);

  const dividerDescriptors = dividerPositions.map((value, index) => ({
    index,
    value,
    min: minutesToDividerPercent(
      (dividerBoundaries[index] ?? CABINET_START_MINUTES) + CABINET_MIN_SLOT_MINUTES,
    ),
    max: minutesToDividerPercent(
      (dividerBoundaries[index + 2] ?? CABINET_END_MINUTES) - CABINET_MIN_SLOT_MINUTES,
    ),
    currentTimeLabel:
      draggingDividerIndex === index && dividerBoundaries[index + 1] !== undefined
        ? formatMinutesAsTime(dividerBoundaries[index + 1]!)
        : null,
  }));

  function updateDividerPreview(dividerIndex: number, dividerPercent: number) {
    const nextPositions = updateCabinetDividerPercentsAtIndex(
      dividerPositionsRef.current,
      dividerIndex,
      dividerPercent,
    );

    dividerPositionsRef.current = nextPositions;
    setDividerOverrides((current) =>
      updateDayDividerOverrides({
        dayNumber,
        sourceSignature: dividerSourceSignature,
        positions: nextPositions,
        overrides: current,
      }),
    );
  }

  function commitDividerChange(dividerIndex: number, dividerPercent: number) {
    const nextPositions = updateCabinetDividerPercentsAtIndex(
      dividerPositionsRef.current,
      dividerIndex,
      dividerPercent,
    );

    dividerPositionsRef.current = nextPositions;
    setDividerOverrides((current) =>
      updateDayDividerOverrides({
        dayNumber,
        sourceSignature: dividerSourceSignature,
        positions: nextPositions,
        overrides: current,
      }),
    );
    setDraggingDividerIndex(null);
  }

  function handleAddDivider() {
    const nextPositions = insertCabinetDividerPercent(dividerPositionsRef.current);

    dividerPositionsRef.current = nextPositions;
    setDividerOverrides((current) =>
      updateDayDividerOverrides({
        dayNumber,
        sourceSignature: dividerSourceSignature,
        positions: nextPositions,
        overrides: current,
      }),
    );
  }

  function handleRemoveDivider(dividerIndex: number) {
    const nextPositions = removeCabinetDividerPercent(
      dividerPositionsRef.current,
      dividerIndex,
    );

    dividerPositionsRef.current = nextPositions;
    setDividerOverrides((current) =>
      updateDayDividerOverrides({
        dayNumber,
        sourceSignature: dividerSourceSignature,
        positions: nextPositions,
        overrides: current,
      }),
    );
    setDraggingDividerIndex((current) => {
      if (current === null) {
        return null;
      }

      if (current === dividerIndex) {
        return null;
      }

      return current > dividerIndex ? current - 1 : current;
    });
  }

  return (
    <article className={compact ? "min-h-0 flex-1 pt-0" : "pt-1"}>
      <div
        className={`relative overflow-hidden bg-cover bg-center ${
          compact
            ? "h-full min-h-0 rounded-none border-0 shadow-none"
            : "min-h-[30rem] rounded-[22px] border border-[rgba(158,136,110,0.12)] shadow-[4px_5px_0_var(--sand-soft)]"
        }`}
        data-testid="edit-empty-cabinet"
        style={{
          backgroundImage: `url('${EDIT_EMPTY_CABINET_IMAGE}')`,
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,247,0.58)_0%,rgba(255,253,247,0.22)_26%,rgba(255,253,247,0.03)_58%,rgba(255,253,247,0)_100%)]" />
        <div className="absolute inset-y-4 left-4 z-[1] flex flex-col border-r border-dashed border-[rgba(88,69,52,0.16)] pr-2">
          <span className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-[rgba(84,71,53,0.62)]">
            {"\u65f6\u95f4"}
          </span>
          <div className="flex min-h-0 flex-1 flex-col justify-between">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={`font-mono text-[11px] font-semibold transition-all ${
                  activeTickMinutes === Number(tick) * 60
                    ? "scale-[1.06] text-[rgba(84,71,53,0.9)]"
                    : "text-[rgba(84,71,53,0.52)]"
                }`}
              >
                {tick}
              </span>
            ))}
          </div>
        </div>

        <div
          className={`relative z-[2] ml-14 flex flex-col ${
            compact ? "h-full min-h-0" : "min-h-[30rem]"
          } px-3 py-3 sm:px-4 sm:py-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="journal-chip bg-[rgba(255,253,247,0.58)] py-1 text-[11px]">{`\u7b2c ${dayNumber} \u5929`}</span>
              <button
                type="button"
                onClick={() => onOpenCreateEvent?.(slots[0]?.id ?? "morning")}
                className="inline-flex min-h-8 items-center justify-center rounded-full border border-[rgba(88,69,52,0.38)] bg-[rgba(255,253,247,0.72)] px-3 py-1 text-xs font-semibold text-[var(--ink)] shadow-[2px_2px_0_var(--sand-soft)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                {"\u002b \u6dfb\u52a0\u5730\u70b9"}
              </button>
              <button
                type="button"
                onClick={handleAddDivider}
                className="inline-flex min-h-8 items-center justify-center rounded-full border border-[rgba(88,69,52,0.28)] bg-[rgba(255,253,247,0.62)] px-3 py-1 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                {"\u002b \u589e\u52a0\u9694\u677f"}
              </button>
              <button
                type="button"
                onClick={() => onAddNote?.("\u8fd9\u91cc\u5148\u7559\u7ed9\u5f53\u5929\u5907\u6ce8\u3002")}
                className="inline-flex min-h-8 items-center justify-center rounded-full border border-[rgba(158,136,110,0.26)] bg-[rgba(255,253,247,0.54)] px-3 py-1 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                {"\u5199\u5907\u6ce8"}
              </button>
            </div>
            {toolbar ? (
              <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
            ) : null}
          </div>

          {createEventPanel ? (
            <div className="mt-3 max-w-[25rem]">{createEventPanel}</div>
          ) : null}

          {selectedEventBlock ? (
            <div
              className="mt-3 max-w-[29rem]"
              data-testid="event-detail-editor-card"
            >
              <WorkspaceEventEditor
                compact={compact}
                initialValue={{
                  placeName: selectedEventBlock.item.placeName,
                  type: selectedEventBlock.item.type,
                  timeLabel: selectedEventBlock.item.timeLabel,
                  reason: selectedEventBlock.item.reason,
                }}
                mode="edit"
                onCancel={() => onCloseEventEditor?.()}
                onDelete={
                  onBlockDelete
                    ? () => {
                        onBlockDelete(selectedEventBlock);
                        onCloseEventEditor?.();
                      }
                    : undefined
                }
                onSave={(updates) => {
                  onBlockUpdate?.(
                    selectedEventBlock,
                    updates as ItineraryBlockUpdate,
                  );
                  onCloseEventEditor?.();
                }}
              />
            </div>
          ) : null}

          <div
            ref={cabinetSurfaceRef}
            className="relative mt-3 min-h-0 flex-1"
            data-testid="cabinet-surface"
          >
              {dividerDescriptors.map((divider) => (
                <CabinetDivider
                  key={`divider-${divider.index}`}
                  active={draggingDividerIndex === divider.index}
                  containerRef={cabinetSurfaceRef}
                  currentTimeLabel={divider.currentTimeLabel}
                label={`\u7b2c ${divider.index + 1} \u5757\u9694\u677f`}
                max={divider.max}
                min={divider.min}
                  onActiveChange={(active) =>
                    setDraggingDividerIndex(active ? divider.index : null)
                  }
                  onRemove={
                    dividerDescriptors.length > 1
                      ? () => handleRemoveDivider(divider.index)
                      : undefined
                  }
                  onCommitChange={(value) => commitDividerChange(divider.index, value)}
                  onPreviewChange={(value) => updateDividerPreview(divider.index, value)}
                  value={divider.value}
                />
              ))}
            <CabinetEventLayer
              activeBlockId={activeBlockId}
              activeDropSlotId={activeDropSlotId}
              dayNumber={dayNumber}
              draggingBlockId={draggingBlockId}
              expandedBlockId={expandedBlockId}
              mapPoints={mapPoints}
              selectedEventId={selectedEventId}
              slots={slots}
              onBlockAction={onBlockAction}
              onBlockDelete={onBlockDelete}
              onBlockSelect={onBlockSelect}
              onBlockUpdate={onBlockUpdate}
              onDragEnd={onDragEnd}
              onDragHoverSlot={onDragHoverSlot}
              onDragStart={onDragStart}
              onDropBlock={onDropBlock}
              onToggleExpand={onToggleExpand}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function CabinetDivider({
  active = false,
  containerRef,
  currentTimeLabel = null,
  label,
  value,
  min,
  max,
  onActiveChange,
  onRemove,
  onPreviewChange,
  onCommitChange,
}: {
  active?: boolean;
  containerRef?: { current: HTMLDivElement | null };
  currentTimeLabel?: string | null;
  label: string;
  value: number;
  min: number;
  max: number;
  onActiveChange?: (active: boolean) => void;
  onRemove?: () => void;
  onPreviewChange: (value: number) => void;
  onCommitChange: (value: number) => void;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const dragTargetRef = useRef<HTMLDivElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  function getPointerPercent(clientY: number) {
    const bounds = containerRef?.current?.getBoundingClientRect();

    if (!bounds) {
      return value;
    }

    const rawPercent = pointerPositionToDividerPercent(clientY, bounds);
    const snappedMinutes = dividerPercentToMinutes(rawPercent);
    const snappedPercent = minutesToDividerPercent(snappedMinutes);

    return clampDividerPercent(snappedPercent, min, max);
  }

  function stopDragging() {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    pointerIdRef.current = null;
    onActiveChange?.(false);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const dragTarget = event.currentTarget;

    dragTargetRef.current = dragTarget;
    pointerIdRef.current = event.pointerId;
    dragTarget.setPointerCapture(event.pointerId);
    onActiveChange?.(true);
    onPreviewChange(getPointerPercent(event.clientY));

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      if (pointerIdRef.current !== moveEvent.pointerId) {
        return;
      }

      moveEvent.preventDefault();
      onPreviewChange(getPointerPercent(moveEvent.clientY));
    };

    const handleWindowPointerUp = (upEvent: PointerEvent) => {
      if (pointerIdRef.current !== upEvent.pointerId) {
        return;
      }

      upEvent.preventDefault();
      if (dragTarget.hasPointerCapture(upEvent.pointerId)) {
        dragTarget.releasePointerCapture(upEvent.pointerId);
      }
      const finalPercent = getPointerPercent(upEvent.clientY);

      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
      pointerIdRef.current = null;
      onCommitChange(finalPercent);
      onActiveChange?.(false);
    };

    const handleWindowPointerCancel = (cancelEvent: PointerEvent) => {
      if (pointerIdRef.current !== cancelEvent.pointerId) {
        return;
      }

      if (dragTarget.hasPointerCapture(cancelEvent.pointerId)) {
        dragTarget.releasePointerCapture(cancelEvent.pointerId);
      }
      stopDragging();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleWindowPointerUp, {
      passive: false,
    });
    window.addEventListener("pointercancel", handleWindowPointerCancel, {
      passive: false,
    });

    dragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }

  function handleLostPointerCapture() {
    stopDragging();
  }

  return (
    <div className="absolute left-0 right-4 z-[3]" style={{ top: `${value}%` }}>
      <div
        aria-label={label}
        aria-orientation="horizontal"
          className={`relative h-1 rounded-full shadow-[0_1px_0_rgba(255,253,247,0.8)] transition-all ${
            active
              ? "bg-[rgba(107,77,47,0.82)]"
              : "bg-[rgba(88,69,52,0.42)] hover:bg-[rgba(88,69,52,0.62)]"
          }`}
          role="separator"
        >
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 ${
              active ? "cursor-row-resize" : "cursor-grab"
            } touch-none select-none`}
            data-testid="cabinet-divider-hit-area"
            onPointerDown={handlePointerDown}
            onLostPointerCapture={handleLostPointerCapture}
            style={{ touchAction: "none", userSelect: "none" }}
          />
        {currentTimeLabel ? (
          <span className="absolute right-0 top-1/2 -translate-y-[calc(100%+0.65rem)] rounded-full border border-[rgba(88,69,52,0.18)] bg-[rgba(255,253,247,0.94)] px-2.5 py-1 font-mono text-sm font-semibold text-[var(--ink)] shadow-[2px_2px_0_var(--sand-soft)]">
            {currentTimeLabel}
          </span>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            aria-label={`${label}${"\u5220\u9664"}`}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(88,69,52,0.22)] bg-[rgba(255,253,247,0.92)] text-[10px] font-bold leading-none text-[var(--ink-muted)] shadow-[1px_1px_0_var(--sand-soft)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            onClick={onRemove}
          >
            ×
          </button>
        ) : null}
        <span
          className={`absolute left-1/2 top-1/2 h-6 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[rgba(255,253,247,0.9)] shadow-[2px_2px_0_var(--sand-soft)] transition-all ${
            active
              ? "border-[rgba(107,77,47,0.48)] scale-[1.04] cursor-row-resize"
              : "border-[rgba(88,69,52,0.34)] cursor-grab"
          } pointer-events-none`}
        >
          <span
            className={`mx-auto mt-[0.68rem] block h-0.5 w-6 rounded-full transition-colors pointer-events-none ${
              active ? "bg-[rgba(107,77,47,0.72)]" : "bg-[rgba(88,69,52,0.48)]"
            }`}
          />
        </span>
      </div>
      <input
        aria-label={`${label}${"\u4f4d\u7f6e"}`}
        className="pointer-events-none absolute inset-x-0 -top-5 h-10 opacity-0"
        max={max}
        min={min}
        onChange={(event) => onCommitChange(Number(event.target.value))}
        step={CABINET_STEP_PERCENT}
        type="range"
        value={value}
      />
    </div>
  );
}

function getSlotFlexBasis(slot: TimeSlotView) {
  const start = parseTimeToMinutes(slot.startTime);
  const end = parseTimeToMinutes(slot.endTime);

  if (start === null || end === null || end <= start) {
    return `${100 / 3}%`;
  }

  return `${((end - start) / CABINET_TOTAL_MINUTES) * 100}%`;
}

function CabinetEventLayer({
  dayNumber,
  slots,
  mapPoints,
  activeBlockId,
  selectedEventId,
  expandedBlockId,
  draggingBlockId,
  activeDropSlotId,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDragHoverSlot,
  onDropBlock,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockAction,
}: {
  dayNumber: number;
  slots: TimeSlotView[];
  mapPoints: MapPoint[];
  activeBlockId?: string | null;
  selectedEventId?: string | null;
  expandedBlockId?: string | null;
  draggingBlockId?: string | null;
  activeDropSlotId?: string | null;
  onToggleExpand?: (blockId: string) => void;
  onDragStart?: (block: ItineraryBlockView) => void;
  onDragEnd?: () => void;
  onDragHoverSlot?: (slotId: string | null) => void;
  onDropBlock?: (targetDayNumber: number, targetSlotId: string) => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: ItineraryBlockUpdate,
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}) {
  const orderedGroups = slots
    .map((slot) => ({
      slot,
      items: slot.items,
    }))
    .filter((group) => group.items.length > 0 || draggingBlockId);

  const hasAnyItems = slots.some((slot) => slot.items.length > 0);

  return (
    <div
      className="absolute inset-0 z-[1] overflow-visible px-1 pb-1 pr-4 pt-1"
      data-testid="cabinet-event-layer"
    >
      <div className="flex min-h-full flex-col gap-3 overflow-visible">
        {orderedGroups.map(({ slot, items }) => {
          const isActiveDropTarget = activeDropSlotId === slot.id;

          function handleDragOver(event: DragEvent<HTMLDivElement>) {
            if (!draggingBlockId) {
              return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            onDragHoverSlot?.(slot.id);
          }

          function handleDrop(event: DragEvent<HTMLDivElement>) {
            if (!draggingBlockId) {
              return;
            }

            event.preventDefault();
            onDragHoverSlot?.(slot.id);
            onDropBlock?.(dayNumber, slot.id);
          }

          return (
            <section
              key={slot.id}
              className={`edit-drawer ${isActiveDropTarget ? "edit-drawer--drop-target" : ""}`}
              data-testid="cabinet-event-group"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="edit-time-label">
                  {slot.startTime || "--:--"}-{slot.endTime || "--:--"}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 overflow-visible">
                {items.length > 0 ? (
                  items.map((block) => {
                    const blockId = getItineraryBlockId(block);

                    return (
                      <ItineraryBlock
                        key={blockId}
                        block={block}
                        compactCabinetBlock
                        isExpanded={expandedBlockId === blockId}
                        isSelected={
                          activeBlockId === blockId || selectedEventId === blockId
                        }
                        mapStatus={getItineraryBlockMapStatus(block, mapPoints)}
                        showActions
                        onAction={onBlockAction}
                        onDelete={
                          onBlockDelete ? () => onBlockDelete(block) : undefined
                        }
                        onDragEnd={onDragEnd}
                        onDragStart={onDragStart}
                        onSelect={
                          onBlockSelect ? () => onBlockSelect(block) : undefined
                        }
                        onToggleExpand={
                          onToggleExpand ? () => onToggleExpand(blockId) : undefined
                        }
                        onUpdate={
                          onBlockUpdate
                            ? (updates) => onBlockUpdate(block, updates)
                            : undefined
                        }
                      />
                    );
                  })
                ) : (
                  <div className="edit-drawer--empty px-3 py-3">
                    可以把事件拖到这里
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {!hasAnyItems ? (
          <div
            className="edit-drawer--empty flex min-h-[12rem] flex-1 items-center justify-center"
            data-testid="cabinet-event-empty-layer"
          >
            先从柜子顶部放进第一站。
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CabinetTimeSlotShelf({
  dayNumber,
  slot,
  mapPoints,
  activeBlockId,
  selectedEventId,
  expandedBlockId,
  draggingBlockId,
  activeDropSlotId,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDragHoverSlot,
  onDropBlock,
  onAddPlace,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockAction,
}: {
  dayNumber: number;
  slot: TimeSlotView;
  mapPoints: MapPoint[];
  activeBlockId?: string | null;
  selectedEventId?: string | null;
  expandedBlockId?: string | null;
  draggingBlockId?: string | null;
  activeDropSlotId?: string | null;
  onToggleExpand?: (blockId: string) => void;
  onDragStart?: (block: ItineraryBlockView) => void;
  onDragEnd?: () => void;
  onDragHoverSlot?: (slotId: string | null) => void;
  onDropBlock?: (targetDayNumber: number, targetSlotId: string) => void;
  onAddPlace?: (slotId: string) => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: ItineraryBlockUpdate,
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}) {
  const isActiveDropTarget = activeDropSlotId === slot.id;

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!draggingBlockId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDragHoverSlot?.(slot.id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!draggingBlockId) {
      return;
    }

    event.preventDefault();
    onDragHoverSlot?.(slot.id);
    onDropBlock?.(dayNumber, slot.id);
  }

  return (
    <section
      className={`min-h-0 overflow-visible rounded-[14px] border border-dashed px-2.5 py-2 transition-colors ${
        isActiveDropTarget
          ? "border-[var(--clay-deep)] bg-[rgba(245,236,220,0.58)]"
          : "border-[rgba(88,69,52,0.1)] bg-[rgba(255,253,247,0.1)]"
      }`}
      style={{ flexBasis: getSlotFlexBasis(slot) }}
      data-testid="cabinet-time-slot-shelf"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex min-h-full flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-[rgba(158,136,110,0.16)] bg-[rgba(255,253,247,0.32)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[rgba(84,71,53,0.42)]">
            {slot.startTime || "--:--"}-{slot.endTime || "--:--"}
          </span>
          <button
            type="button"
            onClick={() => onAddPlace?.(slot.id)}
            className="rounded-full border border-[rgba(88,69,52,0.26)] bg-[rgba(255,253,247,0.48)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            + 添加地点
          </button>
        </div>

        <div
          className="min-h-0 flex-1 space-y-1.5 overflow-visible"
          data-testid="cabinet-time-slot-items"
        >
          {slot.items.length > 0 ? (
            slot.items.map((block) => {
              const blockId = getItineraryBlockId(block);

              return (
                <ItineraryBlock
                  key={blockId}
                  block={block}
                  compactCabinetBlock
                  isExpanded={expandedBlockId === blockId}
                  isSelected={activeBlockId === blockId || selectedEventId === blockId}
                  mapStatus={getItineraryBlockMapStatus(block, mapPoints)}
                  showActions
                  onAction={onBlockAction}
                  onDelete={onBlockDelete ? () => onBlockDelete(block) : undefined}
                  onDragEnd={onDragEnd}
                  onDragStart={onDragStart}
                  onSelect={onBlockSelect ? () => onBlockSelect(block) : undefined}
                  onToggleExpand={
                    onToggleExpand ? () => onToggleExpand(blockId) : undefined
                  }
                  onUpdate={
                    onBlockUpdate
                      ? (updates) => onBlockUpdate(block, updates)
                      : undefined
                  }
                />
              );
            })
          ) : (
            <button
              type="button"
              onClick={() => onAddPlace?.(slot.id)}
              className="flex h-full min-h-10 w-full items-center justify-center rounded-[14px] border border-dashed border-[rgba(88,69,52,0.16)] bg-[rgba(255,253,247,0.16)] px-3 py-2 text-xs font-semibold text-[rgba(84,71,53,0.58)] transition-colors hover:bg-[rgba(255,253,247,0.42)]"
            >
              把地点放进这里
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function DayCabinet({
  itinerary,
  cabinet,
  allCabinets = [],
  mapPoints = [],
  showActions = false,
  compactBlankReadMode = false,
  compactEmptyEditMode = false,
  activeBlockId = null,
  searchCity = "",
  onRequestEdit,
  editEmptyToolbar,
  onAddPlace,
  onAddNote,
  onAddDay,
  onOpenAiAssist,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockSelectionClear,
  onBlockMove,
  onTimeSlotAdd,
  onTimeSlotUpdate,
  onTimeSlotDelete,
  onBlockAction,
}: DayCabinetProps) {
  const resolvedCabinet =
    cabinet ?? (itinerary ? mapDailyItineraryToCabinet(itinerary) : null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<ItineraryBlockView | null>(
    null,
  );
  const [activeDropSlotId, setActiveDropSlotId] = useState<string | null>(null);
  const [creatingSlotId, setCreatingSlotId] = useState<string | null>(null);

  if (!resolvedCabinet) {
    return null;
  }

  const isEmptyDay = resolvedCabinet.itemCount === 0;
  const isCabinetWorkspace = showActions;
  const otherCabinets = allCabinets.filter(
    (item) => item.dayNumber !== resolvedCabinet.dayNumber,
  );
  const creatingSlot =
    resolvedCabinet.slots.find((slot) => slot.id === creatingSlotId) ?? null;
  const selectedEventBlock =
    activeBlockId === null
      ? null
      : (resolvedCabinet.slots
          .flatMap((slot) => slot.items)
          .find((block) => getItineraryBlockId(block) === activeBlockId) ?? null);

  function handleToggleExpand(blockId: string) {
    setExpandedBlockId((current) => (current === blockId ? null : blockId));
  }

  function handleOpenCreateEvent(slotId: string) {
    setCreatingSlotId(slotId);
    onBlockSelectionClear?.();
  }

  function handleCreateEvent(input: WorkspaceCreateEventInput) {
    if (!creatingSlotId) {
      return;
    }

    onAddPlace?.(creatingSlotId, input);
    setCreatingSlotId(null);
    onBlockSelectionClear?.();
  }

  function handleSelectEvent(block: ItineraryBlockView) {
    setCreatingSlotId(null);
    onBlockSelect?.(block);
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

  const createEventPanel =
    creatingSlot && showActions ? (
      <WorkspaceEventCreatePanel
        compact={compactEmptyEditMode}
        searchCity={searchCity}
        slot={creatingSlot}
        onCancel={() => setCreatingSlotId(null)}
        onSubmit={handleCreateEvent}
      />
    ) : null;

  if (isCabinetWorkspace) {
    return (
      <EditEmptyCabinet
        activeBlockId={activeBlockId}
        activeDropSlotId={activeDropSlotId}
        dayNumber={resolvedCabinet.dayNumber}
        draggingBlockId={draggingBlock?.item.editorId ?? null}
        expandedBlockId={expandedBlockId}
        mapPoints={mapPoints}
        selectedEventBlock={selectedEventBlock}
        selectedEventId={activeBlockId}
        slots={resolvedCabinet.slots}
        toolbar={editEmptyToolbar}
        compact={compactEmptyEditMode}
        createEventPanel={createEventPanel}
        onAddNote={onAddNote}
        onBlockAction={onBlockAction}
        onBlockDelete={onBlockDelete}
        onBlockSelect={handleSelectEvent}
        onBlockUpdate={onBlockUpdate}
        onCloseEventEditor={onBlockSelectionClear}
        onDragEnd={handleDragEnd}
        onDragHoverSlot={setActiveDropSlotId}
        onDragStart={handleDragStart}
        onDropBlock={(targetDayNumber, targetSlotId) => {
          setActiveDropSlotId(targetSlotId);
          handleDropBlock(targetDayNumber, targetSlotId);
        }}
        onOpenCreateEvent={handleOpenCreateEvent}
        onToggleExpand={handleToggleExpand}
      />
    );
  }

  if (isEmptyDay) {
    return (
      <EmptyReadDayNotebook
        compact={compactBlankReadMode}
        dayNumber={resolvedCabinet.dayNumber}
        onRequestEdit={onRequestEdit}
      />
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
                {resolvedCabinet.routeSummary ||
                  "先把地点补齐，再慢慢把顺序排顺。"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="journal-chip">
                {resolvedCabinet.itemCount} 个地点
              </span>
              {resolvedCabinet.dailyTips.length > 0 ? (
                <span className="journal-chip">含当天备注</span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="space-y-3">
          {createEventPanel ? (
            <div className="max-w-2xl">{createEventPanel}</div>
          ) : null}
          {resolvedCabinet.slots.map((slot) => (
            <TimeSlotSection
              key={slot.id}
              activeBlockId={activeBlockId}
              activeDropSlotId={activeDropSlotId}
              dayNumber={resolvedCabinet.dayNumber}
              draggingBlockId={draggingBlock?.item.editorId ?? null}
              expandedBlockId={expandedBlockId}
              mapPoints={mapPoints}
              showActions={showActions}
              slot={slot}
              onAddNote={onAddNote}
              onAddPlace={handleOpenCreateEvent}
              onAddTimeSlot={onTimeSlotAdd}
              onBlockAction={onBlockAction}
              onBlockDelete={onBlockDelete}
              onBlockSelect={onBlockSelect}
              onBlockUpdate={onBlockUpdate}
              onDragEnd={handleDragEnd}
              onDragHoverSlot={setActiveDropSlotId}
              onDragStart={handleDragStart}
              onDropBlock={(targetDayNumber, targetSlotId) => {
                setActiveDropSlotId(targetSlotId);
                handleDropBlock(targetDayNumber, targetSlotId);
              }}
              onTimeSlotDelete={onTimeSlotDelete}
              onTimeSlotUpdate={onTimeSlotUpdate}
              onToggleExpand={handleToggleExpand}
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
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                          activeDropSlotId === slot.id
                            ? "border-[var(--clay-deep)] bg-[var(--sand-soft)] text-[var(--clay-deep)]"
                            : "border-dashed border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)]"
                        }`}
                        type="button"
                        onDragLeave={() =>
                          setActiveDropSlotId((current) =>
                            current === slot.id ? null : current,
                          )
                        }
                        onDragOver={(event) => {
                          event.preventDefault();
                          setActiveDropSlotId(slot.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleDropBlock(otherCabinet.dayNumber, slot.id);
                        }}
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
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              type="button"
              onClick={onAddDay}
            >
              添加一天
            </button>
            <button
              className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              type="button"
              onClick={onOpenAiAssist ?? onRequestEdit}
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
