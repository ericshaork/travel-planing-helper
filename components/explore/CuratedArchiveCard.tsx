"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { formatArchiveMeta, type CuratedArchiveEntry } from "@/lib/explore/curated-archives";
import { getExploreFeedImageCandidates } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "./ResolvedImage";

interface CuratedArchiveCardProps {
  entry: CuratedArchiveEntry;
  variant: "main" | "secondary" | "mini";
  onOpen?: (entry: CuratedArchiveEntry) => void;
  onCreate?: (entry: CuratedArchiveEntry) => void;
}

function coverSources(entry: CuratedArchiveEntry) {
  return getExploreFeedImageCandidates({
    city: entry.city,
    cityCode: "",
    coverImageUrl: entry.coverImageUrl,
    theme: undefined,
    tags: entry.tags,
  });
}

export function CuratedArchiveCard({
  entry,
  variant,
  onOpen,
  onCreate,
}: CuratedArchiveCardProps) {
  const href = `/explore/${entry.slug ?? entry.id}`;

  function handleOpen(event: MouseEvent<HTMLAnchorElement>) {
    if (!onOpen) {
      return;
    }

    event.preventDefault();
    onOpen(entry);
  }

  function handleCreate(event: MouseEvent<HTMLAnchorElement>) {
    if (!onCreate) {
      handleOpen(event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCreate(entry);
  }

  if (variant === "main") {
    return (
      <article className="curated-main group relative">
        <div className="curated-main-cover">
          <ResolvedImage
            sources={coverSources(entry)}
            alt={`${entry.city} ${entry.title} 封面`}
            sizes="(min-width: 1024px) 62vw, 92vw"
            priority
            wrapperClassName="absolute inset-0 bg-[var(--paper)]"
            imageClassName="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <span className="curated-main-no" aria-hidden="true">
            NO.{entry.number}
          </span>
          <span className="curated-stamp" aria-hidden="true">
            WANDERLY
            <br />
            ARCHIVE
          </span>
          <span className="curated-main-vertical" aria-hidden="true">
            {entry.city} · 编辑精选
          </span>
        </div>
        <div className="curated-main-caption">
          <h3 className="curated-main-city">{entry.city}</h3>
          <p className="curated-main-title">{entry.title}</p>
          <p className="curated-main-desc">{entry.description}</p>
          <p className="curated-main-meta">{formatArchiveMeta(entry)}</p>
          <div className="curated-main-actions">
            <Link
              href={href}
              onClick={handleOpen}
              className="curated-main-action relative z-[4]"
            >
              查看档案
            </Link>
            {onCreate ? (
              <Link
                href={href}
                onClick={handleCreate}
                className="curated-main-action curated-main-action--ghost relative z-[4]"
              >
                用此行程创建
              </Link>
            ) : null}
          </div>
        </div>
        <Link
          href={href}
          onClick={handleOpen}
          className="curated-main-overlay"
          aria-label={`打开 ${entry.title}`}
        />
      </article>
    );
  }

  if (variant === "secondary") {
    return (
      <Link
        href={href}
        onClick={handleOpen}
        className="curated-side group"
        aria-label={`打开 ${entry.title}`}
      >
        <div className="curated-side-cover">
          <ResolvedImage
            sources={coverSources(entry)}
            alt={`${entry.city} ${entry.title} 封面`}
            sizes="(min-width: 1024px) 24vw, 42vw"
            wrapperClassName="absolute inset-0 bg-[var(--paper)]"
            imageClassName="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        </div>
        <div className="curated-side-body">
          <p className="curated-side-top">
            <span className="curated-side-no">NO.{entry.number}</span>
            <span className="curated-side-city">{entry.city}</span>
          </p>
          <h4 className="curated-side-title">{entry.title}</h4>
          <p className="curated-side-meta">{formatArchiveMeta(entry)}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleOpen}
      className="curated-mini group"
      aria-label={`打开 ${entry.title}`}
    >
      <div className="curated-mini-cover">
        <ResolvedImage
          sources={coverSources(entry)}
          alt={`${entry.city} ${entry.title} 封面`}
          sizes="(min-width: 1024px) 15vw, 45vw"
          wrapperClassName="absolute inset-0 bg-[var(--paper)]"
          imageClassName="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <div className="curated-mini-body">
        <p className="curated-mini-top">
          <span className="curated-mini-no">NO.{entry.number}</span>
          <span className="curated-mini-city">{entry.city}</span>
        </p>
        <h5 className="curated-mini-title">{entry.title}</h5>
      </div>
    </Link>
  );
}
