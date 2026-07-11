import type { ReactNode } from "react";

interface DesktopWorkspaceShellProps {
  topBar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}

export function DesktopWorkspaceShell({
  topBar,
  main,
  inspector,
}: DesktopWorkspaceShellProps) {
  return (
    <section className="hidden lg:block">
      <div className="min-w-0 space-y-5 xl:space-y-6">
        <div className="min-w-0">{topBar}</div>

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,55%)_minmax(0,45%)] xl:gap-6">
          <div className="min-w-0">{main}</div>
          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">{inspector}</div>
        </div>
      </div>
    </section>
  );
}
