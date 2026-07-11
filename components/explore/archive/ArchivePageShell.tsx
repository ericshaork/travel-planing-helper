import Image from "next/image";

import { ArchiveViewer } from "./ArchiveViewer";

interface ArchivePageShellProps {
  archiveId: string;
}

export function ArchivePageShell({ archiveId }: ArchivePageShellProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--paper-bright)] p-4 shadow-[0_20px_48px_rgb(55_44_32_/_0.1)] sm:p-5">
      <Image
        src="/images/archive/template/archive-template-mobile.png"
        alt=""
        fill
        sizes="100vw"
        aria-hidden
        className="object-cover opacity-34"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,243,0.95),rgba(252,247,237,0.92))]" />
      <div className="relative z-[1]">
        <ArchiveViewer id={archiveId} mode="page" />
      </div>
    </div>
  );
}
