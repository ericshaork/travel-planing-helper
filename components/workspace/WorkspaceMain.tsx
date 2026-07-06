import type { ReactNode } from "react";

interface WorkspaceMainProps {
  children: ReactNode;
}

export function WorkspaceMain({ children }: WorkspaceMainProps) {
  return <div className="min-w-0 space-y-5 xl:space-y-6">{children}</div>;
}
