import { useMemo, useState } from "react";

import type { ItineraryBlockUpdate } from "../../lib/trip/itinerary-view";
import type { ItineraryItemType } from "../../lib/trip/types";
import {
  formatWorkspaceEventTimeLabel,
  parseWorkspaceEventTimeLabel,
  WORKSPACE_EVENT_TIME_OPTIONS,
  WORKSPACE_EVENT_TYPE_OPTIONS,
  type WorkspaceCreateEventInput,
} from "../../lib/trip/workspace-events";

interface WorkspaceEventEditorValue {
  placeName?: string;
  type?: ItineraryItemType;
  timeLabel?: string;
  note?: string;
  reason?: string;
}

interface WorkspaceEventEditorProps {
  mode: "create" | "edit";
  initialValue?: WorkspaceEventEditorValue;
  fallbackTimeLabel?: string;
  compact?: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  onSave: (input: WorkspaceCreateEventInput | ItineraryBlockUpdate) => void;
}

function getSafeEndOptions(startTime: string) {
  return WORKSPACE_EVENT_TIME_OPTIONS.filter((option) => option > startTime);
}

export function WorkspaceEventEditor({
  mode,
  initialValue,
  fallbackTimeLabel,
  compact = false,
  onCancel,
  onDelete,
  onSave,
}: WorkspaceEventEditorProps) {
  const initialTimeRange = useMemo(
    () => parseWorkspaceEventTimeLabel(initialValue?.timeLabel, fallbackTimeLabel),
    [fallbackTimeLabel, initialValue?.timeLabel],
  );
  const [placeName, setPlaceName] = useState(initialValue?.placeName ?? "");
  const [type, setType] = useState<ItineraryItemType>(
    initialValue?.type ?? "attraction",
  );
  const [startTime, setStartTime] = useState(initialTimeRange.startTime);
  const [endTime, setEndTime] = useState(initialTimeRange.endTime);
  const [note, setNote] = useState(
    initialValue?.reason ?? initialValue?.note ?? "",
  );
  const [showError, setShowError] = useState(false);
  const endOptions = getSafeEndOptions(startTime);
  const safeEndTime = endOptions.includes(endTime)
    ? endTime
    : endOptions[0] ?? "24:00";

  function saveEvent() {
    const nextPlaceName = placeName.trim();

    if (!nextPlaceName) {
      setShowError(true);
      return;
    }

    onSave({
      placeName: nextPlaceName,
      type,
      timeLabel: formatWorkspaceEventTimeLabel(startTime, safeEndTime),
      ...(mode === "create"
        ? { note: note.trim() }
        : { reason: note.trim() || "补一句为什么想去这里。" }),
    });
  }

  return (
    <section
      className={`rounded-[18px] border border-[rgba(88,69,52,0.22)] bg-[rgba(255,253,247,0.86)] shadow-[2px_3px_0_var(--sand-soft)] backdrop-blur-sm ${
        compact ? "px-3 py-3" : "px-4 py-4"
      }`}
      data-testid="workspace-event-editor"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="workspace-kicker">
            {mode === "create" ? "新旅行事件" : "编辑旅行事件"}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
            {mode === "create" ? "把这一站放进柜子" : "整理这一块积木"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-bright)]"
        >
          取消
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
          地点名称
          <input
            autoFocus
            value={placeName}
            onChange={(event) => {
              setPlaceName(event.target.value);
              setShowError(false);
            }}
            className="rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm font-semibold text-[var(--ink)] outline-none transition-colors placeholder:text-[rgba(84,71,53,0.42)] focus:border-[var(--clay-deep)]"
            placeholder="例如：酒店、摩天轮、午餐"
          />
          {showError ? (
            <span className="text-xs font-medium text-[var(--clay-deep)]">
              先写一个地点名。
            </span>
          ) : null}
        </label>

        <div className="grid gap-1.5">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">类型</span>
          <div className="flex flex-wrap gap-2">
            {WORKSPACE_EVENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  type === option.value
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                    : "border-[var(--line-strong)] bg-[rgba(255,253,247,0.68)] text-[var(--ink)] hover:bg-[var(--paper-bright)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
            开始
            <select
              value={startTime}
              onChange={(event) => {
                const nextStart = event.target.value;
                const nextEnds = getSafeEndOptions(nextStart);

                setStartTime(nextStart);
                if (!nextEnds.includes(endTime)) {
                  setEndTime(nextEnds[0] ?? "24:00");
                }
              }}
              className="rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 font-mono text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
            >
              {WORKSPACE_EVENT_TIME_OPTIONS.slice(0, -1).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
            结束
            <select
              value={safeEndTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 font-mono text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
            >
              {endOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
          备注
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={compact ? 2 : 3}
            className="resize-none rounded-[14px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none transition-colors placeholder:text-[rgba(84,71,53,0.42)] focus:border-[var(--clay-deep)]"
            placeholder="想拍照、靠近地铁、要预约，都可以先记下。"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveEvent}
          className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] transition-colors hover:bg-[rgba(67,49,37,0.9)]"
        >
          保存
        </button>
        {mode === "edit" && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-dashed border-[var(--clay)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--clay-deep)]"
          >
            删除
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)]"
        >
          先不改
        </button>
      </div>
    </section>
  );
}
