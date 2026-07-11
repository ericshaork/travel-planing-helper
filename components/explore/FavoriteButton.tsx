"use client";

import { useMemo, useState } from "react";

import { useAuthStatus } from "@/components/auth/useAuthStatus";
import {
  isFavoriteArchive,
  toggleFavoriteArchive,
} from "@/lib/explore/favorites";

interface FavoriteButtonProps {
  archiveId: string;
}

export function FavoriteButton({ archiveId }: FavoriteButtonProps) {
  const authState = useAuthStatus();
  const userId = useMemo(
    () => authState.user?.id ?? authState.user?.email ?? "guest",
    [authState.user],
  );
  const [, setVersion] = useState(0);
  const favorite = isFavoriteArchive(userId, archiveId);

  function handleToggle() {
    toggleFavoriteArchive(userId, archiveId);
    setVersion((current) => current + 1);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={
        favorite
          ? "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--sage-deep)] bg-[rgba(223,232,216,0.86)] px-5 py-2.5 text-sm font-semibold text-[var(--sage-deep)]"
          : "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
      }
      aria-pressed={favorite}
    >
      {favorite ? "已收藏" : "收藏档案"}
    </button>
  );
}
