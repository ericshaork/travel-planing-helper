"use client";

import { useEffect, useState } from "react";

import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { normalizeExploreArchiveForReader } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";
import { fetchExploreDetail } from "@/lib/explore/client";
import { getMockExploreDetail } from "@/lib/explore/mock-archives";

import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveViewerContent } from "./ArchiveViewerContent";

interface ArchiveViewerProps {
  id: string;
  mode: "drawer" | "page";
  onClose?: () => void;
}

export function ArchiveViewer({ id, mode, onClose }: ArchiveViewerProps) {
  const [item, setItem] = useState<ArchiveReaderViewModel | null>(null);
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

        setItem(normalizeExploreArchiveForReader(nextItem));
        return;
      } catch (loadError) {
        const fallbackItem = getMockExploreDetail(id);

        if (!active) {
          return;
        }

        if (fallbackItem) {
          setItem(normalizeExploreArchiveForReader(fallbackItem));
          setError("");
          return;
        }

        setItem(null);
        setError(
          cleanDisplayText(
            loadError instanceof Error ? loadError.message : "",
            "这份旅行档案暂时打不开。",
          ),
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
        <section className="px-5 py-5 sm:px-7 sm:py-6">
          <p className="workspace-kicker">正在展开档案</p>
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
        <section className="px-5 py-5 sm:px-7 sm:py-6">
          <p className="workspace-kicker">档案暂时打不开</p>
          <p className="mt-2 text-sm leading-6 text-[var(--dusty-rose)]">
            {cleanDisplayText(error, "这份档案暂时还没有可读取的内容。")}
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
