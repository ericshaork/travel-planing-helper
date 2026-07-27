import { useState } from "react";

import type { PoiCandidate } from "@/lib/poi/types";
import type { TimeSlotView } from "@/lib/trip/itinerary-view";
import {
  createWorkspaceEventInputFromPoiCandidate,
  type WorkspaceCreateEventInput,
} from "@/lib/trip/workspace-events";

import { WorkspaceEventEditor } from "./WorkspaceEventEditor";

interface WorkspaceEventCreatePanelProps {
  slot: TimeSlotView;
  compact?: boolean;
  searchCity?: string;
  onCancel: () => void;
  onSubmit: (input: WorkspaceCreateEventInput) => void;
}

function getSlotTimeLabel(slot: TimeSlotView) {
  if (!slot.startTime && !slot.endTime) {
    return "";
  }

  return `${slot.startTime || "--:--"}-${slot.endTime || "--:--"}`;
}

export function WorkspaceEventCreatePanel({
  slot,
  compact = false,
  searchCity = "",
  onCancel,
  onSubmit,
}: WorkspaceEventCreatePanelProps) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<PoiCandidate[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const slotTimeLabel = getSlotTimeLabel(slot);

  async function searchPlace() {
    const normalizedKeyword = keyword.trim();
    const normalizedCity = searchCity.trim();

    if (!normalizedCity) {
      setError("先确认目的地城市，再搜索地点。");
      setResults([]);
      return;
    }

    if (!normalizedKeyword) {
      setError("先输入想找的地点。");
      setResults([]);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/map/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: normalizedCity,
          keyword: normalizedKeyword,
          limit: 6,
        }),
      });
      const payload = (await response.json()) as
        | { candidates: PoiCandidate[] }
        | { error?: { message?: string } };

      if (!response.ok || !("candidates" in payload)) {
        throw new Error(
          "error" in payload ? payload.error?.message : "地点搜索暂时不可用。",
        );
      }

      setResults(payload.candidates);
      if (payload.candidates.length === 0) {
        setError("暂时没有结果，试试更具体的地点名。");
      }
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error && searchError.message.trim()
          ? searchError.message
          : "地点搜索暂时不可用。",
      );
    } finally {
      setLoading(false);
    }
  }

  if (manualMode) {
    return (
      <WorkspaceEventEditor
        compact={compact}
        fallbackTimeLabel={slotTimeLabel}
        mode="create"
        onCancel={onCancel}
        onSave={(input) => onSubmit(input as WorkspaceCreateEventInput)}
      />
    );
  }

  return (
    <section
      className={`rounded-[18px] border border-[rgba(88,69,52,0.22)] bg-[rgba(255,253,247,0.86)] shadow-[2px_3px_0_var(--sand-soft)] backdrop-blur-sm ${
        compact ? "px-3 py-3" : "px-4 py-4"
      }`}
      data-testid="workspace-place-search-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="workspace-kicker">搜索地点</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
            先选一个真实地点，再放进行程柜。
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)]"
        >
          取消
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchPlace();
            }
          }}
          className="min-w-[12rem] flex-1 rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay-deep)]"
          placeholder={searchCity ? `在${searchCity}搜索地点` : "输入地点名"}
        />
        <button
          type="button"
          onClick={() => void searchPlace()}
          disabled={loading}
          className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm leading-6 text-[var(--clay-deep)]">{error}</p>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {results.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() =>
                onSubmit(
                  createWorkspaceEventInputFromPoiCandidate({
                    candidate,
                    timeLabel: slotTimeLabel,
                  }),
                )
              }
              className="rounded-[16px] border border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-3 py-2 text-left transition-colors hover:border-[var(--clay-deep)] hover:bg-[var(--paper-bright)]"
            >
              <p className="text-sm font-semibold text-[var(--ink)]">
                {candidate.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                {candidate.address || "地址待补充"}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setManualMode(true)}
        className="mt-3 rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)]"
      >
        搜不到，手动填写
      </button>
    </section>
  );
}
