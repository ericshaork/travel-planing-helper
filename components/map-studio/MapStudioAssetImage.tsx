"use client";

import Image from "next/image";
import { useState } from "react";

import { mapStudioAssetFallback } from "@/lib/map-studio/assets";

interface MapStudioAssetImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function MapStudioAssetImage({
  src,
  alt,
  className = "",
  fallbackLabel = mapStudioAssetFallback.description,
}: MapStudioAssetImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const hasError = Boolean(src && failedSrc === src);

  if (!src || hasError) {
    return (
      <div
        aria-label={alt}
        role="img"
        className={`flex min-h-0 items-center justify-center overflow-hidden rounded-[6px] border border-[rgba(255,236,190,0.12)] bg-[radial-gradient(circle_at_35%_20%,rgba(242,207,112,0.14),transparent_32%),linear-gradient(135deg,rgba(255,250,235,0.06),rgba(5,10,10,0.42))] text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,250,235,0.42)] ${className}`}
      >
        <span className="px-3">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={1200}
      height={800}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
