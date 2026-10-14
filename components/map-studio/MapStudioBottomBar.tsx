"use client";

import { useState } from "react";

import { mapStudioScheduleIcons } from "@/lib/map-studio/assets";
import type { MapProject } from "@/lib/map-studio/types";
import type { TimeSlotKey, TripPlan } from "@/lib/trip/types";

interface MapStudioBottomBarProps {
  mapProject: MapProject;
  tripPlan: TripPlan;
  selectedPlaceId?: string;
  assignmentCandidateId?: string;
  assignmentSlot: TimeSlotKey;
  assignmentMessage?: string;
  canUndoAssignment: boolean;
  onAddCandidate: (placeId: string) => void;
  onCandidateSelect: (candidateId: string) => void;
  onDaySelect: (dayId: string) => void;
  onSlotSelect: (slot: TimeSlotKey) => void;
  onConfirmAssignment: () => void;
  onUndoAssignment: () => void;
  onRouteToggle: () => void;
  onImportClick: () => void;
}

const slotButtons: Array<{
  key: TimeSlotKey;
  iconSrc: string;
  label: string;
  tooltip: string;
}> = [
  { key: "morning", iconSrc: mapStudioScheduleIcons.morning, label: "上午", tooltip: "写入上午" },
  { key: "afternoon", iconSrc: mapStudioScheduleIcons.afternoon, label: "下午", tooltip: "写入下午" },
  { key: "evening", iconSrc: mapStudioScheduleIcons.night, label: "晚上", tooltip: "写入晚上" },
];

function AssetGlyph({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
      }}
    />
  );
}

function CommandButton({
  iconSrc,
  label,
  title,
  disabled = false,
  active = false,
  onClick,
}: {
  iconSrc: string;
  label: string;
  title: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-[46px] w-[72px] shrink-0 overflow-hidden rounded-[4px] border bg-[radial-gradient(circle_at_50%_0%,rgba(221,177,78,0.24),transparent_34%),linear-gradient(180deg,#3a4242_0%,#151919_52%,#040505_100%)] text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,230,160,0.3),inset_0_0_0_1px_rgba(255,211,110,0.12),inset_0_-3px_0_rgba(0,0,0,0.72),0_2px_3px_rgba(0,0,0,0.76)] transition active:translate-y-px active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dca54a] ${
        active ? "border-[#b7892c] text-[#fff0c2] brightness-110" : ""
      } ${disabled ? "cursor-not-allowed border-[#2f291f] text-[#817b70] grayscale-[0.25]" : "border-[#75541f] text-[#f4ead2] hover:border-[#c29334] hover:brightness-110"}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3px] rounded-[3px] border border-[rgba(255,224,147,0.12)] shadow-[inset_0_7px_12px_rgba(255,255,255,0.035),inset_0_-9px_14px_rgba(0,0,0,0.4)]"
      />
      <span className="relative z-[1] flex h-full items-center justify-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[#7a5a22] bg-[#101515] shadow-[inset_0_1px_0_rgba(255,230,160,0.18)]">
          <AssetGlyph
            src={iconSrc}
            className="h-[15px] w-[15px] drop-shadow-[0_0_4px_rgba(210,165,83,0.22)]"
          />
        </span>
        {label}
      </span>
    </button>
  );
}

export function MapStudioBottomBar({
  mapProject,
  tripPlan,
  selectedPlaceId,
  assignmentCandidateId,
  assignmentSlot,
  assignmentMessage,
  canUndoAssignment,
  onAddCandidate,
  onCandidateSelect,
  onDaySelect,
  onSlotSelect,
  onConfirmAssignment,
  onUndoAssignment,
  onRouteToggle,
  onImportClick,
}: MapStudioBottomBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeDayId = mapProject.activeDayId ?? "1";
  const candidates = mapProject.candidatePlaces;
  const selectedCandidate =
    candidates.find((candidate) => candidate.id === assignmentCandidateId) ??
    candidates[0];
  const selectedPlace = selectedPlaceId
    ? mapProject.places.find((place) => place.id === selectedPlaceId)
    : undefined;
  const canAddCandidate = Boolean(selectedPlace && !selectedPlace.isCandidate);
  const canConfirm = Boolean(selectedCandidate && activeDayId);

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex flex-col items-center gap-1.5 px-4">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="map-studio-command-bar"
        onClick={() => setIsExpanded((current) => !current)}
        className="pointer-events-auto inline-flex min-h-9 items-center gap-2 rounded-full border border-[#75541f] bg-[linear-gradient(180deg,rgba(31,38,38,0.94),rgba(4,5,5,0.92))] px-3.5 text-xs font-black text-[#fff4d6] shadow-[0_8px_18px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,230,160,0.22)] transition hover:border-[#c29334] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dca54a]"
      >
        <AssetGlyph
          src={mapStudioScheduleIcons.day}
          className="h-[16px] w-[16px] drop-shadow-[0_0_4px_rgba(210,165,83,0.22)]"
        />
        <span>行程 · Day {activeDayId}</span>
        <span className="rounded-full border border-[rgba(255,224,147,0.18)] bg-[rgba(255,250,235,0.06)] px-2 py-0.5 text-[11px] text-[rgba(255,250,235,0.76)]">
          候选 {candidates.length}
        </span>
        <span className="text-[11px] text-[#e5cf91]">
          {isExpanded ? "收起" : "展开行程"}
        </span>
      </button>

      <div
        id="map-studio-command-bar"
        className={`relative flex max-w-full items-center gap-1.5 overflow-hidden rounded-[8px] border border-[#614719] bg-[linear-gradient(180deg,rgba(18,24,24,0.94),rgba(4,5,5,0.96))] px-2.5 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,224,147,0.18),inset_0_-2px_0_rgba(0,0,0,0.74)] transition duration-150 ${
          isExpanded
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 translate-y-2 border-transparent py-0 opacity-0"
        }`}
      >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[rgba(255,221,152,0.18)]" />
          <div className="flex items-center gap-[3px]">
            <CommandButton
              iconSrc={mapStudioScheduleIcons.day}
              label={`Day ${activeDayId}`}
              title="当前写回目标日"
              active
              onClick={() => onDaySelect(activeDayId)}
            />
            {slotButtons.map((slot) => (
              <CommandButton
                key={slot.key}
                iconSrc={slot.iconSrc}
                label={slot.label}
                title={slot.tooltip}
                active={assignmentSlot === slot.key}
                onClick={() => onSlotSelect(slot.key)}
              />
            ))}
            <CommandButton
              iconSrc={mapStudioScheduleIcons.addCandidate}
              label="+候选"
              title="将选中地点加入候选"
              disabled={!canAddCandidate}
              onClick={() => {
                if (selectedPlace) {
                  onAddCandidate(selectedPlace.id);
                }
              }}
            />
            <CommandButton
              iconSrc={mapStudioScheduleIcons.writeIn}
              label="写入"
              title="写入当前 Day"
              disabled={!canConfirm}
              active={canConfirm}
              onClick={() => {
                if (selectedCandidate) {
                  onCandidateSelect(selectedCandidate.id);
                }
                onConfirmAssignment();
              }}
            />
            <CommandButton
              iconSrc={mapStudioScheduleIcons.undo}
              label="撤销"
              title="撤销本次写回"
              disabled={!canUndoAssignment}
              onClick={onUndoAssignment}
            />
            <CommandButton
              iconSrc={mapStudioScheduleIcons.route}
              label="路线"
              title="预览当前 Day 路线"
              disabled={candidates.length === 0}
              onClick={onRouteToggle}
            />
            <CommandButton
              iconSrc={mapStudioScheduleIcons.import}
              label="导入"
              title="Phase 2 路径导入"
              onClick={onImportClick}
            />
            <span
              aria-hidden="true"
              className="ml-1 h-[46px] w-[48px] rounded-[5px] border border-dashed border-[#6b4d1d] bg-[linear-gradient(180deg,rgba(12,16,16,0.94),rgba(0,0,0,0.86))] shadow-[inset_0_0_16px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,224,147,0.1)]"
            />
            <span
              aria-hidden="true"
              className="h-[46px] w-[48px] rounded-[5px] border border-dashed border-[#6b4d1d] bg-[linear-gradient(180deg,rgba(12,16,16,0.94),rgba(0,0,0,0.86))] shadow-[inset_0_0_16px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,224,147,0.1)]"
            />
          </div>
          <p className="sr-only">
            {tripPlan.tripTitle} Map Studio command bar, {candidates.length} candidates.
          </p>
          {assignmentMessage ? (
            <p className="ml-1 max-w-[11rem] truncate rounded-[4px] border border-[rgba(255,224,147,0.18)] bg-[rgba(0,0,0,0.32)] px-2 py-1 text-[11px] font-semibold text-[rgba(255,250,235,0.72)]">
              {assignmentMessage}
            </p>
          ) : null}
      </div>
    </footer>
  );
}
