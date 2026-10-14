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

function isRemoteSource(source: string) {
  return /^https?:\/\//i.test(source);
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

  function handleSourceError() {
    setFailedSources((current) => ({ ...current, [currentSource]: true }));
  }

  return (
    <div className={wrapperClassName}>
      {isRemoteSource(currentSource) ? (
        // 远程封面域名未配置进 next/image 优化器，渲染期会直接抛错，这里降级为原生 img
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSource}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full ${imageClassName}`}
          onError={handleSourceError}
        />
      ) : (
        <Image
          src={currentSource}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={imageClassName}
          onError={handleSourceError}
        />
      )}
    </div>
  );
}
