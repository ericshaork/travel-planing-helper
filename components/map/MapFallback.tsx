interface MapFallbackProps {
  title?: string;
  description?: string;
  className?: string;
}

export function MapFallback({
  title = "地图暂时不可用",
  description = "这里会显示地图。现在先保留稳定占位，不影响你继续看行程内容。",
  className,
}: MapFallbackProps) {
  return (
    <div
      className={`workspace-panel min-h-[280px] overflow-hidden ${className ?? ""}`.trim()}
    >
      <div className="relative flex h-full min-h-[280px] flex-col justify-between px-5 py-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
        >
          <div className="absolute inset-x-4 top-8 h-px border-t border-dashed border-[var(--line)]" />
          <div className="absolute inset-x-10 top-16 h-px border-t border-dashed border-[var(--line)]" />
          <div className="absolute left-8 top-6 h-24 w-24 rounded-full border border-dashed border-[var(--line)] bg-[var(--sand-soft)]/60" />
          <div className="absolute bottom-10 right-8 h-20 w-20 rounded-full border border-dashed border-[var(--line)] bg-[var(--sage-soft)]/50" />
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-12 border border-dashed border-[var(--line-strong)] bg-[var(--paper-bright)]" />
        </div>

        <div className="relative z-[1]">
          <p className="workspace-kicker">MAP STATUS</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">{title}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
            {description}
          </p>
        </div>

        <div className="relative z-[1] mt-6 flex flex-wrap gap-2">
          <span className="workspace-chip">稳定占位</span>
          <span className="workspace-chip">可降级</span>
          <span className="workspace-chip">不影响行程阅读</span>
        </div>
      </div>
    </div>
  );
}
