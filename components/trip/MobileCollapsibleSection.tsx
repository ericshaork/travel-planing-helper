import type { ReactNode } from "react";

interface MobileCollapsibleSectionProps {
  title: string;
  summary: string;
  children: ReactNode;
}

export function MobileCollapsibleSection({
  title,
  summary,
  children,
}: MobileCollapsibleSectionProps) {
  return (
    <details className="cabinet-door group">
      <summary className="cursor-pointer list-none p-4 pt-7 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--clay)] [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
              按需展开
            </p>
            <h2 className="mt-1.5 break-words text-lg font-semibold">{title}</h2>
            <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
              {summary}
            </p>
          </div>

          <span className="shrink-0 border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--clay-deep)]">
            <span className="group-open:hidden">展开</span>
            <span className="hidden group-open:inline">收起</span>
          </span>
        </div>
      </summary>

      <div className="border-t border-dashed border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
        {children}
      </div>
    </details>
  );
}
