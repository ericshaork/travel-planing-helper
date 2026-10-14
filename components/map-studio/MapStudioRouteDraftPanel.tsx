"use client";

import type { BasicRouteDraft } from "@/src/lib/data-hub/planningTypes";

type BasicRouteDraftStatus = "idle" | "loading" | "success" | "error";

interface MapStudioRouteDraftPanelProps {
  status: BasicRouteDraftStatus;
  draft?: BasicRouteDraft | null;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0 分钟";
  return `${Math.round(seconds / 60)} 分钟`;
}

function formatRouteDuration(seconds?: number | null) {
  if (typeof seconds !== "number") return "耗时暂缺";
  return `${Math.round(seconds / 60)} 分钟`;
}

function getProviderSummary(draft: BasicRouteDraft) {
  const providers = new Set<string>();
  for (const day of draft.days) {
    for (const slot of day.slots) {
      for (const source of slot.sourceSummary) {
        providers.add(String(source.provider));
      }
      if (slot.routeFromPrevious?.provider) {
        providers.add(slot.routeFromPrevious.provider);
      }
    }
  }
  return providers.size ? Array.from(providers).join(" / ") : "DataHub";
}

export function MapStudioRouteDraftPanel({
  status,
  draft,
  error,
  onClose,
  onConfirm,
}: MapStudioRouteDraftPanelProps) {
  if (status === "idle" && !draft && !error) {
    return null;
  }

  const canConfirm = status === "success" && Boolean(draft?.days.some((day) => day.slots.length > 0));

  return (
    <section
      aria-label="基础路线规划预览"
      className="absolute bottom-24 right-20 z-40 max-h-[62vh] w-[22rem] overflow-y-auto rounded-[8px] border border-[#8a6428] bg-[linear-gradient(180deg,rgba(22,29,29,0.97),rgba(5,7,7,0.95))] p-3 text-[rgba(255,250,235,0.86)] shadow-[inset_0_1px_0_rgba(255,224,147,0.2),inset_0_-14px_28px_rgba(0,0,0,0.42),0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-[3px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(255,224,147,0.16)] pb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(255,224,147,0.52)]">
            BASIC ROUTE
          </p>
          <h2 className="mt-0.5 text-sm font-black text-[#fff3d2]">
            基础路线预览
          </h2>
        </div>
        <button
          type="button"
          aria-label="关闭基础路线预览"
          onClick={onClose}
          className="h-7 w-7 rounded-[4px] border border-[rgba(255,224,147,0.22)] bg-[rgba(0,0,0,0.28)] text-xs font-black text-[rgba(255,250,235,0.72)] hover:border-[#d2a044] hover:text-[#fff7df]"
        >
          X
        </button>
      </div>

      {status === "loading" ? (
        <p className="mt-3 rounded-[5px] border border-[rgba(255,224,147,0.14)] bg-[rgba(255,250,235,0.04)] px-2.5 py-2 text-xs font-semibold leading-5 text-[rgba(255,250,235,0.72)]">
          正在根据候选地点、DataHub 坐标和路线缓存整理 Day Plan...
        </p>
      ) : null}

      {status === "error" ? (
        <p className="mt-3 rounded-[5px] border border-[rgba(255,184,104,0.28)] bg-[rgba(120,58,28,0.18)] px-2.5 py-2 text-xs font-semibold leading-5 text-[rgba(255,232,204,0.78)]">
          {error ?? "基础路线规划暂时不可用。"}
        </p>
      ) : null}

      {draft ? (
        <div className="mt-3 grid gap-2.5">
          {draft.warnings.length ? (
            <div className="rounded-[5px] border border-[rgba(255,184,104,0.22)] bg-[rgba(120,58,28,0.14)] px-2.5 py-2 text-xs leading-5 text-[rgba(255,232,204,0.76)]">
              {draft.warnings.join(" / ")}
            </div>
          ) : null}

          {draft.days.map((day) => (
            <article
              key={day.dayNumber}
              className="rounded-[6px] border border-[rgba(255,224,147,0.14)] bg-[rgba(255,250,235,0.045)] p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-[#fff3d2]">
                  Day {day.dayNumber}
                </h3>
                <span className="text-[10px] font-bold text-[rgba(255,250,235,0.5)]">
                  路程 {formatDuration(day.totalTravelTimeSeconds)}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[rgba(255,250,235,0.58)]">
                {day.title}
              </p>
              {day.slots.length ? (
                <ol className="mt-2 grid gap-1.5">
                  {day.slots.map((slot, index) => (
                    <li
                      key={`${day.dayNumber}-${slot.placeId}`}
                      className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.18)] px-2 py-1.5 text-xs"
                    >
                      <p className="font-bold text-[rgba(255,250,235,0.82)]">
                        {index + 1}. {slot.name}
                      </p>
                      <p className="mt-0.5 text-[rgba(255,250,235,0.52)]">
                        {slot.startTime ?? "--:--"} - {slot.endTime ?? "--:--"} · 停留 {slot.recommendedDurationMinutes ?? "待定"} 分钟
                      </p>
                      {slot.routeFromPrevious ? (
                        <p className="mt-0.5 text-[rgba(255,250,235,0.48)]">
                          上一站过来：{formatRouteDuration(slot.routeFromPrevious.durationSeconds)} · {slot.routeFromPrevious.provider}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[rgba(255,250,235,0.6)]">
                        {slot.reason}
                      </p>
                      {slot.warnings.length ? (
                        <p className="mt-1 text-[rgba(255,200,150,0.76)]">
                          {slot.warnings.join(" / ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-[rgba(255,250,235,0.5)]">
                  这一天暂无可写入地点。
                </p>
              )}
              {day.feasibilityWarnings.length ? (
                <p className="mt-2 text-[11px] leading-5 text-[rgba(255,200,150,0.72)]">
                  {day.feasibilityWarnings.slice(0, 3).join(" / ")}
                </p>
              ) : null}
            </article>
          ))}

          {draft.unresolved.length ? (
            <div className="rounded-[6px] border border-[rgba(255,184,104,0.22)] bg-[rgba(120,58,28,0.14)] px-2.5 py-2 text-xs leading-5 text-[rgba(255,232,204,0.78)]">
              未参与规划：{draft.unresolved.map((place) => `${place.placeId}（${place.reason}）`).join("、")}
            </div>
          ) : null}

          <div className="rounded-[5px] border border-[rgba(255,224,147,0.12)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2 text-[11px] leading-5 text-[rgba(255,250,235,0.58)]">
            <p>数据来源：{getProviderSummary(draft)}</p>
            <p>证据记录：{draft.evidence.length} 条 · 缺失字段 {draft.missingFields.length} 条</p>
            <p>确认前不会覆盖正式行程。</p>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="min-h-8 flex-1 rounded-[4px] border border-[#9b762b] bg-[rgba(224,180,82,0.14)] px-3 text-xs font-black text-[#fff0c2] disabled:cursor-not-allowed disabled:border-[rgba(255,224,147,0.12)] disabled:bg-[rgba(255,250,235,0.04)] disabled:text-[rgba(255,250,235,0.34)]"
        >
          确认写入
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-8 rounded-[4px] border border-[rgba(255,224,147,0.16)] bg-[rgba(0,0,0,0.22)] px-3 text-xs font-black text-[rgba(255,250,235,0.72)]"
        >
          先不写
        </button>
      </div>
    </section>
  );
}
