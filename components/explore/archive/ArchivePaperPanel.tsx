"use client";

import Image from "next/image";
import type { ReactNode } from "react";

interface ArchivePaperPanelProps {
  children: ReactNode;
  paper?: "light" | "warm";
  className?: string;
  contentClassName?: string;
  bookmark?: "default" | "active" | null;
  decoration?: "label" | "tape" | "stamp" | null;
}

const paperMap = {
  light: "/images/archive/paper/archive-paper-light.png",
  warm: "/images/archive/paper/archive-paper-warm.png",
} as const;

const bookmarkMap = {
  default: "/images/archive/bookmark/archive-bookmark-default.png",
  active: "/images/archive/bookmark/archive-bookmark-active.png",
} as const;

const decorationMap = {
  label: "/images/archive/decoration/archive-label-note.png",
  tape: "/images/archive/decoration/archive-tape-corner.png",
  stamp: "/images/archive/decoration/archive-stamp-featured.png",
} as const;

export function ArchivePaperPanel({
  children,
  paper = "light",
  className = "",
  contentClassName = "space-y-3",
  bookmark = null,
  decoration = null,
}: ArchivePaperPanelProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--paper)] px-4 py-4 shadow-[0_8px_30px_rgb(55_44_32_/_0.08)] sm:px-5 sm:py-5 ${className}`}
    >
      <Image
        src={paperMap[paper]}
        alt=""
        fill
        sizes="100vw"
        aria-hidden
        className="object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,252,246,0.9),rgba(255,250,241,0.82))]" />

      {bookmark ? (
        <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-90">
          <Image
            src={bookmarkMap[bookmark]}
            alt=""
            fill
            sizes="48px"
            aria-hidden
            className="object-contain object-top"
          />
        </div>
      ) : null}

      {decoration ? (
        <div
          className={`pointer-events-none absolute opacity-80 ${
            decoration === "stamp"
              ? "right-4 top-4 h-14 w-14"
              : decoration === "tape"
                ? "left-4 top-3 h-12 w-20"
                : "left-4 top-3 h-12 w-24"
          }`}
        >
          <Image
            src={decorationMap[decoration]}
            alt=""
            fill
            sizes="96px"
            aria-hidden
            className="object-contain"
          />
        </div>
      ) : null}

      <div className={`relative z-[1] ${contentClassName}`}>{children}</div>
    </article>
  );
}
