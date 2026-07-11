import type {
  ExploreTripContent,
  ExploreTripListItem,
  InspirationFacetKey,
} from "@/lib/explore/types";

type ExploreImageTarget = Pick<
  ExploreTripListItem | ExploreTripContent,
  "city" | "coverImageUrl"
>;

function toPublicImagePath(path: string) {
  return `/images/${path}`;
}

function slugifyCity(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniquePaths(paths: Array<string | undefined | null>) {
  return Array.from(
    new Set(paths.filter((path): path is string => typeof path === "string" && path.length > 0)),
  );
}

export function getInspirationCardImageCandidates(key: InspirationFacetKey) {
  switch (key) {
    case "location":
      return uniquePaths([
        toPublicImagePath("explore/inspiration/location/location-cover.png"),
        toPublicImagePath("explore/inspiration/location/beach-card.png"),
        toPublicImagePath("explore/inspiration/location/city-card.png"),
        toPublicImagePath("explore/fallback/explore-fallback-location.png"),
      ]);
    case "food":
      return uniquePaths([
        toPublicImagePath("explore/inspiration/food/spicy-card.png"),
        toPublicImagePath("explore/inspiration/food/seafood-card.png"),
        toPublicImagePath("explore/inspiration/food/tea-card.png"),
        toPublicImagePath("explore/inspiration/food/dessert-card.png"),
        toPublicImagePath("explore/fallback/explore-fallback-food.png"),
      ]);
    case "season":
      return uniquePaths([
        toPublicImagePath("explore/inspiration/season/season-cover.png"),
        toPublicImagePath("explore/inspiration/season/summer-card.png"),
        toPublicImagePath("explore/inspiration/season/autumn-card.png"),
        toPublicImagePath("explore/fallback/explore-fallback-location.png"),
      ]);
    case "companion":
      return uniquePaths([
        toPublicImagePath("explore/inspiration/companion/couple-card.png"),
        toPublicImagePath("explore/inspiration/companion/family-card.png"),
        toPublicImagePath("explore/inspiration/companion/friends-card.png"),
        toPublicImagePath("explore/inspiration/companion/solo-card.png"),
        toPublicImagePath("explore/fallback/explore-fallback-city.png"),
      ]);
    default:
      return [toPublicImagePath("explore/fallback/explore-fallback-city.png")];
  }
}

export function getExploreCityImageCandidates(city: string) {
  const citySlug = slugifyCity(city);

  if (!citySlug) {
    return [];
  }

  return uniquePaths([
    toPublicImagePath(`explore/cities/${citySlug}-city-card.png`),
    toPublicImagePath(`explore/cities/${citySlug}-city-card-alt.png`),
  ]);
}

export function getExploreFeedImageCandidates(item: ExploreImageTarget) {
  return uniquePaths([
    ...getExploreCityImageCandidates(item.city),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ]);
}

export function getFeaturedImageCandidates(item: ExploreImageTarget) {
  return uniquePaths([
    ...getExploreCityImageCandidates(item.city),
    toPublicImagePath("explore/featured/featured-cover-default.png"),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ]);
}

export function getFeaturedBadgePath() {
  return toPublicImagePath("explore/featured/featured-editorial-badge.png");
}

export function getArchiveAssetBundle(item: ExploreImageTarget) {
  return {
    template: toPublicImagePath("archive/template/archive-template-main.png"),
    paper: toPublicImagePath("archive/paper/archive-paper-light.png"),
    frame: toPublicImagePath("archive/frame/archive-photo-frame-01.png"),
    coverCandidates: uniquePaths([
      ...getExploreCityImageCandidates(item.city),
      toPublicImagePath("explore/archive/archive-list-cover-city.png"),
      toPublicImagePath("explore/archive/archive-list-cover-default.png"),
      toPublicImagePath("explore/fallback/explore-fallback-city.png"),
    ]),
  };
}
