import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearMemoryAdminBoundaryCache,
  getAdminBoundaryCacheKey,
  getMemoryAdminBoundary,
  getPersistentAdminBoundary,
  isAdminBoundaryCacheEntryExpired,
  normalizeAdminBoundaryCacheLevel,
  setAdminBoundaryPersistentCacheAdapterForTests,
  setMemoryAdminBoundary,
  setPersistentAdminBoundary,
  type AdminBoundaryCacheEntry,
} from "../../src/lib/map-studio/adminBoundaryCache";

function createEntry(overrides: Partial<AdminBoundaryCacheEntry> = {}): AdminBoundaryCacheEntry {
  return {
    parentAdcode: "440000",
    parentName: "广东省",
    targetLevel: "city",
    source: "datahub",
    fetchedAt: "2026-10-07T00:00:00.000Z",
    features: [],
    ...overrides,
  };
}

describe("adminBoundaryCache", () => {
  beforeEach(() => {
    clearMemoryAdminBoundaryCache();
    setAdminBoundaryPersistentCacheAdapterForTests(null);
  });

  it("normalizes visual levels into shared cache keys", () => {
    expect(normalizeAdminBoundaryCacheLevel("city")).toBe("prefecture");
    expect(normalizeAdminBoundaryCacheLevel("district")).toBe("county");
    expect(getAdminBoundaryCacheKey("440000", "city")).toBe("admin:440000:prefecture");
    expect(getAdminBoundaryCacheKey("440300", "district")).toBe("admin:440300:county");
  });

  it("returns memory cache hits", () => {
    const cacheKey = getAdminBoundaryCacheKey("440000", "city");
    const entry = createEntry();

    setMemoryAdminBoundary(cacheKey, entry);

    expect(getMemoryAdminBoundary(cacheKey)).toBe(entry);
  });

  it("reads and writes persistent cache through the adapter", async () => {
    const cacheKey = getAdminBoundaryCacheKey("440000", "city");
    const entry = createEntry();
    const entries = new Map<string, AdminBoundaryCacheEntry>();
    const adapter = {
      get: vi.fn(async (key: string) => entries.get(key) ?? null),
      set: vi.fn(async (key: string, value: AdminBoundaryCacheEntry) => {
        entries.set(key, value);
      }),
    };
    setAdminBoundaryPersistentCacheAdapterForTests(adapter);

    await setPersistentAdminBoundary(cacheKey, entry);

    expect(await getPersistentAdminBoundary(cacheKey)).toBe(entry);
    expect(adapter.set).toHaveBeenCalledWith(cacheKey, entry);
  });

  it("marks entries stale after the 30 day TTL", () => {
    expect(isAdminBoundaryCacheEntryExpired(
      createEntry({ fetchedAt: "2026-10-01T00:00:00.000Z" }),
      Date.parse("2026-10-07T00:00:00.000Z"),
    )).toBe(false);
    expect(isAdminBoundaryCacheEntryExpired(
      createEntry({ fetchedAt: "2026-08-01T00:00:00.000Z" }),
      Date.parse("2026-10-07T00:00:00.000Z"),
    )).toBe(true);
  });
});
