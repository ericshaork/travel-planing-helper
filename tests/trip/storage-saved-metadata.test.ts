import { describe, expect, it } from "vitest";

import {
  clearSavedTripMetadata,
  getSavedTripMetadata,
  markCurrentTripAsSaved,
  markCurrentTripAsUnsaved,
  saveParsedTripSession,
  type StorageLike,
} from "../../lib/trip/storage";

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

describe("saved trip metadata storage", () => {
  it("writes and reads savedTripId metadata", () => {
    const storage = new MemoryStorage();

    markCurrentTripAsSaved(
      {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
        restoredAt: "2026-07-07T08:00:00.000Z",
      },
      storage,
    );

    expect(getSavedTripMetadata(storage)).toEqual({
      savedTripId: "trip-1",
      savedTripTitle: "厦门 3 天慢慢玩",
      restoredAt: "2026-07-07T08:00:00.000Z",
      savedAt: expect.any(String),
    });
  });

  it("clears metadata when explicitly marked unsaved", () => {
    const storage = new MemoryStorage();

    markCurrentTripAsSaved(
      {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
      },
      storage,
    );
    markCurrentTripAsUnsaved(storage);

    expect(getSavedTripMetadata(storage)).toBeNull();
  });

  it("clears metadata when a new parsed session starts", () => {
    const storage = new MemoryStorage();

    markCurrentTripAsSaved(
      {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
      },
      storage,
    );
    saveParsedTripSession(
      {
        rawInput: "我想从深圳去厦门玩 3 天",
        selectedInterests: ["海边"],
        selectedTravelStyles: ["轻松"],
        parseResult: {
          parsed: {
            departureCity: "深圳",
            destinationCity: "厦门",
            days: 3,
            budget: 2500,
          },
          missingFields: [],
          followUpQuestions: [],
        },
      },
      storage,
    );

    expect(getSavedTripMetadata(storage)).toBeNull();
  });

  it("supports explicit clear helper", () => {
    const storage = new MemoryStorage();

    markCurrentTripAsSaved(
      {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
      },
      storage,
    );
    clearSavedTripMetadata(storage);

    expect(getSavedTripMetadata(storage)).toBeNull();
  });
});
