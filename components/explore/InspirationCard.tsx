"use client";

import type { ReactNode } from "react";

import { ResolvedImage } from "./ResolvedImage";

interface InspirationCardProps {
  title: string;
  description: string;
  active: boolean;
  selectedCount: number;
  onClick: () => void;
  imageCandidates?: string[];
  actionLabel?: string;
  priorityImage?: boolean;
  children?: ReactNode;
}

export function InspirationCard({
  title,
  description,
  active,
  selectedCount,
  onClick,
  imageCandidates = [],
  actionLabel = "打开这条灵感",
  priorityImage = false,
  children,
}: InspirationCardProps) {
  return (
    <article
      className={`workspace-panel px-4 py-4 transition-all sm:px-5 sm:py-5 ${
        active ? "lg:col-span-2" : "lg:col-span-1"
      }`}
    >
      <div className="relative z-[1] space-y-4">
        <button
          type="button"
          onClick={onClick}
          className="group w-full text-left"
          aria-pressed={active}
        >
          <ResolvedImage
            sources={imageCandidates}
            alt={`${title} inspiration cover`}
            sizes="(min-width: 1024px) 30vw, 100vw"
            priority={priorityImage}
            wrapperClassName="relative mb-4 aspect-[4/3] overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)]"
            imageClassName="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="workspace-kicker">{title.toUpperCase()}</p>
              <h3 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                {title}
              </h3>
            </div>
            <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.82)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
              {selectedCount > 0 ? `已选 ${selectedCount}` : "探索"}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">
            {actionLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
            {active ? description : "打开这张卡，看看这个旅行方向。"}
          </p>
        </button>

        {active && children ? <div className="hidden lg:block">{children}</div> : null}
      </div>
    </article>
  );
}
