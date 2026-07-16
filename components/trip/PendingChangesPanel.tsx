import type { PendingChangeItem } from "@/lib/trip/modification-intents";

interface PendingChangesPanelProps {
  items: PendingChangeItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onWriteToDraft: () => void;
}

export function PendingChangesPanel({
  items,
  onRemove,
  onClear,
  onWriteToDraft,
}: PendingChangesPanelProps) {
  const hasItems = items.length > 0;

  return (
    <section className="cabinet-door p-4 pt-6 sm:p-5 sm:pt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
            待调整内容
          </p>
          <h3 className="mt-2 text-base font-semibold sm:text-lg">
            先把想交给 AI 的改动收在这里
          </h3>
        </div>
        <span
          aria-live="polite"
          className="shrink-0 rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 py-1 text-xs font-semibold text-[var(--clay-deep)]"
        >
          {items.length} 项
        </span>
      </div>

      {hasItems ? (
        <div className="mt-4 space-y-3">
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--clay)] bg-[var(--clay-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--clay-deep)]">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold text-[var(--ink)]">
                      {item.summary}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`移除 ${item.summary}`}
                    className="min-h-9 shrink-0 rounded-full border border-[var(--line)] bg-[var(--paper-bright)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
                  >
                    移除
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onWriteToDraft}
              className="min-h-11 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5"
            >
              写进 AI 调整
            </button>

            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
            >
              清空
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
          暂无待调整内容。只有“让 AI 换一个 / 让 AI 加类似 / 让 AI 调整”这类操作才会进入这里。
        </div>
      )}
    </section>
  );
}
