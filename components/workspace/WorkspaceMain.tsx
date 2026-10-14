import type { ReactNode } from "react";

interface WorkspaceMainProps {
  children: ReactNode;
  compact?: boolean;
}

export function WorkspaceMain({
  children,
  compact = false,
}: WorkspaceMainProps) {
  return (
    <div
      className={`min-h-0 min-w-0 ${
        compact
          ? "flex h-full flex-col overflow-hidden"
          : "space-y-3 xl:space-y-4"
      }`}
    >
      {children}
    </div>
  );
}
