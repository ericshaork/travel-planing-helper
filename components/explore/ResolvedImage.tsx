"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

interface ResolvedImageProps {
  sources: string[];
  alt: string;
  sizes: string;
  priority?: boolean;
  wrapperClassName?: string;
  imageClassName?: string;
}

export function ResolvedImage({
  sources,
  alt,
  sizes,
  priority = false,
  wrapperClassName = "relative aspect-[4/3] overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)]",
  imageClassName = "object-cover",
}: ResolvedImageProps) {
  const uniqueSources = useMemo(
    () => Array.from(new Set(sources.filter((source) => source.trim().length > 0))),
    [sources],
  );
  const [failedSources, setFailedSources] = useState<Record<string, true>>({});
  const currentSource =
    uniqueSources.find((source) => failedSources[source] !== true) ?? uniqueSources[0];

  if (!currentSource) {
    return null;
  }

  return (
    <div className={wrapperClassName}>
      <Image
        src={currentSource}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={imageClassName}
        onError={() => {
          setFailedSources((current) => ({ ...current, [currentSource]: true }));
        }}
      />
    </div>
  );
}
