import Image from "next/image";
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
      <div className="workspace-panel relative overflow-hidden px-5 py-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-20">
          <Image
            src="/images/ui/background/paper-noise-soft.png"
            alt=""
            fill
            aria-hidden
            sizes="900px"
            className="object-cover object-top"
          />
        </div>
        <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-85">
          <Image
            src="/images/archive/bookmark/archive-bookmark-default.png"
            alt=""
            fill
            aria-hidden
            sizes="48px"
            className="object-contain object-top"
          />
        </div>
        <div className="relative z-[1] max-w-2xl">
          <p className="workspace-kicker">PLAN REFERENCE</p>
          <h2 className="mt-1.5 text-xl font-semibold sm:text-2xl">
            Supporting travel notes stay below the editor
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            Weather, budget, transport, and extra notes still matter, but they now sit as supporting reference instead of competing with the active editing area.
          </p>
        </div>
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
                <span className="workspace-chip shrink-0">Open</span>
              </div>
            </summary>

            <div className="relative z-[1] border-t border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.7)] px-4 py-4 sm:px-5 sm:py-5">
              {section.content}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
