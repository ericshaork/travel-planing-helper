"use client";

import { useEffect, useState } from "react";

import { fetchExploreDetail } from "@/lib/explore/client";
import { getMockExploreDetail } from "@/lib/explore/mock-archives";
import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveViewerContent } from "./ArchiveViewerContent";

interface ArchiveViewerProps {
  id: string;
  mode: "drawer" | "page";
  onClose?: () => void;
}

export function ArchiveViewer({ id, mode, onClose }: ArchiveViewerProps) {
  const [item, setItem] = useState<ExploreTripContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const nextItem = await fetchExploreDetail(id);

        if (!active) {
          return;
        }

        setItem(nextItem);
        return;
      } catch (loadError) {
        const fallbackItem = getMockExploreDetail(id);

        if (!active) {
          return;
        }

        if (fallbackItem) {
          setItem(fallbackItem);
          setError("");
          return;
        }

        setItem(null);
        setError(
          loadError instanceof Error && loadError.message.trim()
            ? loadError.message
            : "这份旅行档案暂时打不开。",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <section className="space-y-4">
        <ArchiveHeader mode={mode} onClose={onClose} />
        <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
          <p className="workspace-kicker">LOADING ARCHIVE</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            正在翻开这份旅行档案……
          </p>
        </section>
      </section>
    );
  }

  if (error || !item) {
    return (
      <section className="space-y-4">
        <ArchiveHeader mode={mode} onClose={onClose} />
        <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
          <p className="workspace-kicker">ARCHIVE UNAVAILABLE</p>
          <p className="mt-2 text-sm leading-6 text-[var(--dusty-rose)]">
            {error || "这份档案暂时还没有内容。"}
          </p>
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <ArchiveHeader item={item} mode={mode} onClose={onClose} />
      <ArchiveViewerContent item={item} />
    </section>
  );
}
