import type { ReactNode } from "react";

interface WorkspaceUtilitySection {
  id: string;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  content: ReactNode;
}

interface WorkspaceUtilityPanelProps {
  sections: WorkspaceUtilitySection[];
}

export function WorkspaceUtilityPanel({
  sections,
}: WorkspaceUtilityPanelProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="max-w-2xl">
        <p className="workspace-kicker">PLAN REFERENCE</p>
        <h2 className="mt-1.5 text-xl font-semibold sm:text-2xl">
          其他资料先收在这里
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          预算、天气、住宿和交通都还在，但先把主注意力留给当前 Day，不再把中间主区重新拉成长报告。
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <details
            key={section.id}
            id={section.id}
            open={section.defaultOpen}
            className="workspace-panel overflow-hidden"
          >
            <summary className="relative z-[1] cursor-pointer list-none px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {section.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    {section.summary}
                  </p>
                </div>
                <span className="workspace-chip shrink-0">展开</span>
              </div>
            </summary>

            <div className="relative z-[1] border-t border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.6)] px-4 py-4 sm:px-5 sm:py-5">
              {section.content}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
