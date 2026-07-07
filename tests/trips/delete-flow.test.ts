import { describe, expect, it, vi } from "vitest";

import {
  getSavedTripMetadata,
  type StorageLike,
} from "../../lib/trip/storage";
import { deleteSavedTrip } from "../../lib/trips/delete-flow";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("deleteSavedTrip", () => {
  it("clears local savedTripId metadata when the same trip is deleted", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "travel-planning:restored-saved-trip",
      JSON.stringify({
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
      }),
    );

    await deleteSavedTrip("trip-1", {
      storage,
      deleteTrip: vi.fn().mockResolvedValue({ ok: true }),
    });

    expect(getSavedTripMetadata(storage)).toBeNull();
  });
});
