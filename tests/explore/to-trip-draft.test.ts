import { describe, expect, it } from "vitest";

import {
  buildTripPlanDraftFromExplore,
  buildTripPlanDraftFromInspiration,
} from "../../lib/explore/to-trip-draft";
import type {
  ExploreTripContent,
  InspirationSelection,
} from "../../lib/explore/types";

const archive: ExploreTripContent = {
  id: "archive-1",
  externalId: "chengdu_food_3d_001",
  slug: "chengdu-food-3d",
  title: "Chengdu archive",
  summary: "A relaxed food-first trip.",
  city: "Chengdu",
  cityCode: "chengdu",
  region: "Sichuan",
  tripType: "food",
  days: 3,
  tags: ["food", "city-walk"],
  theme: "slow",
  pace: "relaxed",
  archiveIntro: "Start with tea, finish with hotpot.",
  budgetLevel: "medium",
  budgetNote: "Local food stays flexible.",
  coverImageUrl: undefined,
  imagePrompt: undefined,
  featured: undefined,
  terrainTags: undefined,
  cuisineTags: undefined,
  seasonTags: undefined,
  companionTags: undefined,
  highlights: ["tea house", "hotpot"],
  dailyItinerary: [
    {
      dayNumber: 1,
      title: "Old town",
      summary: "Walk, eat, and slow down.",
      activities: [
        {
          timeBlock: "Morning",
          description: "Walk the old street.",
          poiRefs: ["kuanzhai"],
          foodRefs: [],
        },
        {
          timeBlock: "Evening",
          description: "Hotpot dinner.",
          poiRefs: [],
          foodRefs: ["hotpot"],
        },
      ],
    },
  ],
  pois: [
    {
      id: "kuanzhai",
      name: "Kuanzhai Alley",
      reason: "Historic street atmosphere.",
    },
  ],
  food: [
    {
      id: "hotpot",
      name: "Hotpot",
      reason: "Classic Chengdu night.",
    },
  ],
  status: "published",
  reviewStatus: "approved",
  source: {
    pipeline: "travel-content-pipeline",
  },
  rawContent: {},
  publishedAt: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

describe("buildTripPlanDraftFromExplore", () => {
  it("creates an archive draft with source metadata", () => {
    const result = buildTripPlanDraftFromExplore(archive);

    expect(result.sourceType).toBe("explore_archive");
    expect(result.sourceExploreId).toBe("archive-1");
    expect(result.sourceExploreSlug).toBe("chengdu-food-3d");
    expect(result.tripRequestDraft.destinationCity).toBe("Chengdu");
    expect(result.tripPlanSeed.tripTitle).toBe("Chengdu archive");
    expect(result.tripPlanSeed.dailyItinerary).toHaveLength(1);
    expect(result.tripPlanSeed.dailyItinerary[0]?.morning[0]?.placeName).toBe(
      "kuanzhai",
    );
    expect(result.tripPlanSeed.dailyItinerary[0]?.evening[0]?.type).toBe("food");
  });
});

describe("buildTripPlanDraftFromInspiration", () => {
  it("creates an inspiration draft that can continue into Create", () => {
    const selection: InspirationSelection = {
      location: ["beach"],
      food: ["seafood"],
      season: ["summer"],
      companion: ["couple"],
    };

    const result = buildTripPlanDraftFromInspiration(selection, {
      cityQuery: "Sanya",
    });

    expect(result.sourceType).toBe("explore_inspiration");
    expect(result.tripTitle).toBe("Sanya inspiration draft");
    expect(result.tripRequestDraft.destinationCity).toBe("Sanya");
    expect(result.tripRequestDraft.interests).toContain("seafood");
    expect(result.tripPlanSeed.destination).toBe("Sanya");
    expect(result.tripPlanSeed.dailyItinerary).toHaveLength(1);
  });
});
