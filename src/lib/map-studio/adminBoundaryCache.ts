import type { AdminLabelPlacementStrategy } from "./adminLabelPlacement";

export type AdminBoundaryVisualLevel = "province" | "city" | "district";
export type AdminBoundaryApiLevel = "province" | "prefecture" | "county";
export type AdminBoundaryCacheLevel =
  | AdminBoundaryVisualLevel
  | AdminBoundaryApiLevel;

export interface AdminBoundaryCachePoint {
  lat: number;
  lng: number;
}

export interface AdminBoundaryCacheBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface AdminBoundaryCacheFeature {
  adcode?: string;
  name: string;
  level?: string;
  parentAdcode: string;
  center: AdminBoundaryCachePoint | null;
  labelPosition?: AdminBoundaryCachePoint | null;
  labelPositionSource?: "polygon-centroid" | "district-center" | "fallback" | AdminLabelPlacementStrategy;
  boundaries: AdminBoundaryCachePoint[][];
  bbox: AdminBoundaryCacheBounds | null;
}

export interface AdminBoundaryCacheEntry {
  parentAdcode: string;
  parentName: string;
  targetLevel: AdminBoundaryVisualLevel;
  source: "amap_district_search" | "datahub";
  fetchedAt: string;
  features: AdminBoundaryCacheFeature[];
}

export interface AdminBoundaryPersistentCacheAdapter {
  get: (cacheKey: string) => Promise<AdminBoundaryCacheEntry | null>;
  set: (cacheKey: string, entry: AdminBoundaryCacheEntry) => Promise<void>;
}

const ADMIN_BOUNDARY_INDEXEDDB_NAME = "wanderly-map-studio-admin-boundaries";
const ADMIN_BOUNDARY_INDEXEDDB_STORE = "admin-boundaries";
export const ADMIN_BOUNDARY_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const memoryAdminBoundaryCache = new Map<string, AdminBoundaryCacheEntry>();
let persistentAdminBoundaryCacheAdapter:
  | AdminBoundaryPersistentCacheAdapter
  | null
  | undefined;

export function normalizeAdminBoundaryCacheLevel(level: AdminBoundaryCacheLevel): AdminBoundaryApiLevel {
  if (level === "city") return "prefecture";
  if (level === "district") return "county";
  return level;
}

export function getAdminBoundaryCacheKey(parentAdcode: string, targetLevel: AdminBoundaryCacheLevel) {
  return `admin:${parentAdcode}:${normalizeAdminBoundaryCacheLevel(targetLevel)}`;
}

export function getMemoryAdminBoundary(cacheKey: string) {
  return memoryAdminBoundaryCache.get(cacheKey) ?? null;
}

export function setMemoryAdminBoundary(cacheKey: string, entry: AdminBoundaryCacheEntry) {
  memoryAdminBoundaryCache.set(cacheKey, entry);
}

export function hasMemoryAdminBoundary(cacheKey: string) {
  return memoryAdminBoundaryCache.has(cacheKey);
}

export function clearMemoryAdminBoundaryCache() {
  memoryAdminBoundaryCache.clear();
}

export function isAdminBoundaryCacheEntryExpired(entry: AdminBoundaryCacheEntry, nowMs = Date.now()) {
  const fetchedAtMs = Date.parse(entry.fetchedAt);

  if (!Number.isFinite(fetchedAtMs)) {
    return true;
  }

  return nowMs - fetchedAtMs > ADMIN_BOUNDARY_CACHE_TTL_MS;
}

function openAdminBoundaryIndexedDb() {
  if (typeof globalThis.indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise<IDBDatabase | null>((resolve) => {
    const request = globalThis.indexedDB.open(ADMIN_BOUNDARY_INDEXEDDB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(ADMIN_BOUNDARY_INDEXEDDB_STORE);
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

function createIndexedDbAdminBoundaryCacheAdapter(): AdminBoundaryPersistentCacheAdapter {
  return {
    async get(cacheKey) {
      const database = await openAdminBoundaryIndexedDb();

      if (!database) {
        return null;
      }

      return new Promise<AdminBoundaryCacheEntry | null>((resolve) => {
        const transaction = database.transaction(
          ADMIN_BOUNDARY_INDEXEDDB_STORE,
          "readonly",
        );
        const store = transaction.objectStore(ADMIN_BOUNDARY_INDEXEDDB_STORE);
        const request = store.get(cacheKey);

        request.onerror = () => resolve(null);
        request.onsuccess = () =>
          resolve((request.result as AdminBoundaryCacheEntry | undefined) ?? null);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
      });
    },
    async set(cacheKey, entry) {
      const database = await openAdminBoundaryIndexedDb();

      if (!database) {
        return;
      }

      await new Promise<void>((resolve) => {
        const transaction = database.transaction(
          ADMIN_BOUNDARY_INDEXEDDB_STORE,
          "readwrite",
        );
        const store = transaction.objectStore(ADMIN_BOUNDARY_INDEXEDDB_STORE);
        const request = store.put(entry, cacheKey);

        request.onerror = () => resolve();
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          resolve();
        };
      });
    },
  };
}

function getPersistentAdminBoundaryCacheAdapter() {
  if (persistentAdminBoundaryCacheAdapter !== undefined) {
    return persistentAdminBoundaryCacheAdapter;
  }

  persistentAdminBoundaryCacheAdapter =
    typeof globalThis.indexedDB === "undefined"
      ? null
      : createIndexedDbAdminBoundaryCacheAdapter();

  return persistentAdminBoundaryCacheAdapter;
}

export function setAdminBoundaryPersistentCacheAdapterForTests(
  adapter: AdminBoundaryPersistentCacheAdapter | null,
) {
  persistentAdminBoundaryCacheAdapter = adapter;
}

export async function getPersistentAdminBoundary(cacheKey: string) {
  try {
    return await getPersistentAdminBoundaryCacheAdapter()?.get(cacheKey) ?? null;
  } catch {
    return null;
  }
}

export async function setPersistentAdminBoundary(
  cacheKey: string,
  entry: AdminBoundaryCacheEntry,
) {
  try {
    await getPersistentAdminBoundaryCacheAdapter()?.set(cacheKey, entry);
  } catch {
    return;
  }
}
