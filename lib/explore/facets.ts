import type { ExploreFacets, ExploreTripContent } from "./types";

export const defaultExploreFacets: ExploreFacets = {
  terrain: ["beach", "mountain", "city", "forest", "desert"],
  cuisine: ["spicy", "seafood", "tea", "street-food", "hotpot"],
  season: ["spring", "summer", "autumn", "winter"],
  companion: ["couple", "family", "solo", "friends"],
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildExploreFacets(items: ExploreTripContent[]): ExploreFacets {
  return {
    terrain: unique([
      ...defaultExploreFacets.terrain,
      ...items.flatMap((item) => item.terrainTags ?? []),
    ]),
    cuisine: unique([
      ...defaultExploreFacets.cuisine,
      ...items.flatMap((item) => item.cuisineTags ?? []),
    ]),
    season: unique([
      ...defaultExploreFacets.season,
      ...items.flatMap((item) => item.seasonTags ?? []),
    ]),
    companion: unique([
      ...defaultExploreFacets.companion,
      ...items.flatMap((item) => item.companionTags ?? []),
    ]),
  };
}
