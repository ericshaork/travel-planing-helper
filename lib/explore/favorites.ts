"use client";

import { getMockExploreDetail } from "@/lib/explore/mock-archives";
import type { ExploreTripContent } from "@/lib/explore/types";

export interface FavoriteArchiveRecord {
  id: string;
  user_id: string;
  archive_id: string;
  created_at: string;
}

const STORAGE_KEY = "wanderly_explore_favorites";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readFavoriteRecords(): FavoriteArchiveRecord[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as FavoriteArchiveRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavoriteRecords(records: FavoriteArchiveRecord[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listFavoriteRecords(userId: string) {
  return readFavoriteRecords()
    .filter((record) => record.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function isFavoriteArchive(userId: string, archiveId: string) {
  return listFavoriteRecords(userId).some((record) => record.archive_id === archiveId);
}

export function toggleFavoriteArchive(userId: string, archiveId: string) {
  const records = readFavoriteRecords();
  const existingIndex = records.findIndex(
    (record) => record.user_id === userId && record.archive_id === archiveId,
  );

  if (existingIndex >= 0) {
    const nextRecords = records.filter((_, index) => index !== existingIndex);
    writeFavoriteRecords(nextRecords);
    return false;
  }

  const nextRecord: FavoriteArchiveRecord = {
    id: `${userId}-${archiveId}`,
    user_id: userId,
    archive_id: archiveId,
    created_at: new Date().toISOString(),
  };

  writeFavoriteRecords([nextRecord, ...records]);
  return true;
}

export function listFavoriteArchives(userId: string): ExploreTripContent[] {
  return listFavoriteRecords(userId)
    .map((record) => getMockExploreDetail(record.archive_id))
    .filter((item): item is ExploreTripContent => item !== null);
}
