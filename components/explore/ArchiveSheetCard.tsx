"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import {
  formatArchiveMeta,
  type CuratedArchiveEntry,
} from "@/lib/explore/curated-archives";
import { getExploreFeedImageCandidates } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "./ResolvedImage";

interface ArchiveSheetCardProps {
  entry: CuratedArchiveEntry;
  onOpen?: (entry: CuratedArchiveEntry) => void;
}

export function ArchiveSheetCard({ entry, onOpen }: ArchiveSheetCardProps) {
  const href = `/explore/${entry.slug ?? entry.id}`;

  function handleOpen(event: MouseEvent<HTMLAnchorElement>) {
    if (!onOpen) {
      return;
    }

    event.preventDefault();
    onOpen(entry);
  }

  return (
    <Link
      href={href}
      onClick={handleOpen}
      className="archive-sheet group"
      aria-label={`打开 ${entry.city} ${entry.title}`}
    >
      <span className="archive-sheet-head">
        <span className="archive-sheet-no">NO.{entry.number}</span>
        <span className="archive-sheet-city">{entry.city}</span>
      </span>
      <span className="archive-sheet-title">{entry.title}</span>
      <span className="archive-sheet-desc">{entry.description}</span>
      <span className="archive-sheet-cover">
        <ResolvedImage
          sources={getExploreFeedImageCandidates({
            city: entry.city,
            cityCode: "",
            coverImageUrl: entry.coverImageUrl,
            theme: undefined,
            tags: entry.tags,
          })}
          alt={`${entry.city} ${entry.title} 封面`}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
          wrapperClassName="absolute inset-0 bg-[var(--paper)]"
          imageClassName="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      </span>
      <span className="archive-sheet-foot">
        <span className="archive-sheet-meta">{formatArchiveMeta(entry)}</span>
        <span className="archive-sheet-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2.5 8h10m0 0-3.4-3.4M12.5 8l-3.4 3.4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </Link>
  );
}
