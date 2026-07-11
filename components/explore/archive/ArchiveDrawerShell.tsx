"use client";

import Image from "next/image";

import { ArchiveViewer } from "./ArchiveViewer";

interface ArchiveDrawerShellProps {
  archiveId: string | null;
  onClose: () => void;
}

export function ArchiveDrawerShell({
  archiveId,
  onClose,
}: ArchiveDrawerShellProps) {
  if (!archiveId) {
    return null;
  }

  return (
    <aside className="hidden lg:block lg:min-w-0">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pb-6">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--paper-bright)] p-4 shadow-[0_20px_48px_rgb(55_44_32_/_0.12)]">
          <Image
            src="/images/archive/template/archive-template-main.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            aria-hidden
            className="object-cover opacity-34"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,243,0.94),rgba(252,247,237,0.9))]" />
          <div className="relative z-[1]">
            <ArchiveViewer id={archiveId} mode="drawer" onClose={onClose} />
          </div>
        </div>
      </div>
    </aside>
  );
}
