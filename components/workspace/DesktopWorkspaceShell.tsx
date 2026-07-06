import type { ReactNode } from "react";

interface DesktopWorkspaceShellProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}

export function DesktopWorkspaceShell({
  sidebar,
  topBar,
  main,
  inspector,
}: DesktopWorkspaceShellProps) {
  return (
    <section className="hidden lg:block">
      <div className="grid min-w-0 grid-cols-[84px_minmax(0,1fr)] items-start gap-5 xl:gap-6">
        <div className="relative sticky top-5 h-[calc(100vh-2.5rem)] min-h-0 overflow-visible">
          {sidebar}
        </div>

        <div className="min-w-0 space-y-5 xl:space-y-6">
          <div className="min-w-0">{topBar}</div>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,372px)] xl:grid-cols-[minmax(0,1fr)_minmax(344px,392px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,408px)] xl:gap-6">
            <div className="min-w-0">{main}</div>
            <div className="min-w-0">{inspector}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
