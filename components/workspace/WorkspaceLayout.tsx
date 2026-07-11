import type { ReactNode } from "react";

import { DesktopWorkspaceShell } from "./DesktopWorkspaceShell";

interface WorkspaceLayoutProps {
  mobile: ReactNode;
  topBar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}

export function WorkspaceLayout({
  mobile,
  topBar,
  main,
  inspector,
}: WorkspaceLayoutProps) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">{mobile}</div>

      <DesktopWorkspaceShell
        topBar={topBar}
        main={main}
        inspector={inspector}
      />
    </>
  );
}
