import imageManifest from "@/data/explore/normalized/explore_archive_image_manifest.json";
import type {
  ExploreTripContent,
  ExploreTripFood,
  ExploreTripListItem,
  InspirationFacetKey,
} from "@/lib/explore/types";

type ExploreImageTarget = Pick<
  ExploreTripListItem | ExploreTripContent,
  "city" | "cityCode" | "coverImageUrl" | "theme" | "tags"
> & {
  externalId?: string;
  slug?: string;
};

interface ArchiveImageManifestEntry {
  externalId?: string;
  slug?: string;
  coverImagePath?: string;
  coverStatus?: string;
}

export interface ArchiveImageSlot {
  slot:
    | "heroCover"
    | "highlightIllustration"
    | "routeIllustration"
    | "foodImage"
    | "placeImage"
    | "stickerDecoration";
  sources: string[];
  usesFallbackOnly: boolean;
  futureTargets?: string[];
}

const archiveManifestEntries = imageManifest as ArchiveImageManifestEntry[];

const FUTURE_ARCHIVE_ASSET_DIRS = {
  covers: "/images/explore/archive/covers/",
  illustrations: "/images/explore/archive/illustrations/",
  food: "/images/explore/archive/food/",
  places: "/images/explore/archive/places/",
  fallback: "/images/explore/archive/fallback/",
};

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

function isPublicImagePath(path: string | undefined | null) {
  return typeof path === "string" && path.startsWith("/images/");
}

function findManifestEntry(item: Pick<ExploreImageTarget, "externalId" | "slug">) {
  return archiveManifestEntries.find(
    (entry) =>
      (item.externalId && entry.externalId === item.externalId) ||
      (item.slug && entry.slug === item.slug),
  );
}

function getManifestCoverCandidate(item: ExploreImageTarget) {
  const entry = findManifestEntry(item);

  if (!entry || !isPublicImagePath(entry.coverImagePath)) {
    return undefined;
  }

  return entry.coverStatus === "ready" ? entry.coverImagePath : undefined;
}

function buildThemeSlug(item: ExploreImageTarget) {
  const primary = slugifyCity(item.theme ?? "");
  if (primary) {
    return primary;
  }

  const tagMatch = (item.tags ?? [])
    .map((tag) => slugifyCity(tag))
    .find(Boolean);

  return tagMatch || "generic";
}

function getThemeFallbackImageCandidates(item: ExploreImageTarget) {
  const keywords = [item.theme ?? "", ...(item.tags ?? [])]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (
    keywords.some((value) =>
      [
        "food",
        "seafood",
        "spicy",
        "dessert",
        "tea",
        "美食",
        "火锅",
        "海鲜",
        "甜品",
        "茶",
      ].some((keyword) => value.includes(keyword)),
    )
  ) {
    return uniquePaths([
      toPublicImagePath("explore/food/food-cover.png"),
      toPublicImagePath("explore/fallback/explore-fallback-food.png"),
      toPublicImagePath("explore/fallback/explore-fallback-city.png"),
    ]);
  }

  if (
    keywords.some((value) =>
      ["coast", "beach", "island", "海边", "海岛", "滨海"].some((keyword) =>
        value.includes(keyword),
      ),
    )
  ) {
    return uniquePaths([
      toPublicImagePath("explore/inspiration/location/beach-card.png"),
      toPublicImagePath("explore/inspiration/location/island-card.png"),
      toPublicImagePath("explore/fallback/explore-fallback-location.png"),
      toPublicImagePath("explore/fallback/explore-fallback-city.png"),
    ]);
  }

  if (
    keywords.some((value) =>
      ["mountain", "nature", "lake", "forest", "山", "山水", "湖", "自然"].some((keyword) =>
        value.includes(keyword),
      ),
    )
  ) {
    return uniquePaths([
      toPublicImagePath("explore/inspiration/location/mountain-card.png"),
      toPublicImagePath("explore/inspiration/location/lake-card.png"),
      toPublicImagePath("explore/inspiration/location/forest-card.png"),
      toPublicImagePath("explore/fallback/explore-fallback-location.png"),
      toPublicImagePath("explore/fallback/explore-fallback-city.png"),
    ]);
  }

  if (
    keywords.some((value) =>
      ["citywalk", "city", "old-town", "古城", "城市漫步", "都市"].some((keyword) =>
        value.includes(keyword),
      ),
    )
  ) {
    return uniquePaths([
      toPublicImagePath("explore/inspiration/location/city-card.png"),
      toPublicImagePath("explore/archive/archive-list-cover-city.png"),
      toPublicImagePath("explore/fallback/explore-fallback-city.png"),
    ]);
  }

  return [
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ];
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

function getExploreCityCodeImageCandidates(cityCode?: string) {
  const normalized = slugifyCity(cityCode ?? "");

  if (!normalized) {
    return [];
  }

  return uniquePaths([
    toPublicImagePath(`explore/cities/${normalized}-city-card.png`),
    toPublicImagePath(`explore/cities/${normalized}-city-card-alt.png`),
  ]);
}

export function getExploreFeedImageCandidates(item: ExploreImageTarget) {
  return uniquePaths([
    item.coverImageUrl,
    ...getExploreCityCodeImageCandidates(item.cityCode),
    ...getExploreCityImageCandidates(item.city),
    ...getThemeFallbackImageCandidates(item),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ]);
}

export function getFeaturedImageCandidates(item: ExploreImageTarget) {
  return uniquePaths([
    item.coverImageUrl,
    ...getExploreCityCodeImageCandidates(item.cityCode),
    ...getExploreCityImageCandidates(item.city),
    ...getThemeFallbackImageCandidates(item),
    toPublicImagePath("explore/featured/featured-cover-default.png"),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ]);
}

export function getFeaturedBadgePath() {
  return toPublicImagePath("explore/featured/featured-editorial-badge.png");
}

export function getArchiveCoverImageCandidates(item: ExploreImageTarget) {
  return uniquePaths([
    item.coverImageUrl,
    getManifestCoverCandidate(item),
    ...getExploreCityCodeImageCandidates(item.cityCode),
    ...getExploreCityImageCandidates(item.city),
    ...getThemeFallbackImageCandidates(item),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ]);
}

export function getArchiveFoodImageCandidates(food: ExploreTripFood) {
  const category = food.category?.trim().toLowerCase() ?? "";

  if (category.includes("seafood")) {
    return uniquePaths([
      toPublicImagePath("explore/inspiration/food/seafood-card.png"),
      toPublicImagePath("explore/fallback/explore-fallback-food.png"),
    ]);
  }

  if (category.includes("tea")) {
    return uniquePaths([
      toPublicImagePath("explore/inspiration/food/tea-card.png"),
      toPublicImagePath("explore/fallback/explore-fallback-food.png"),
    ]);
  }

  if (category.includes("dessert")) {
    return uniquePaths([
      toPublicImagePath("explore/inspiration/food/dessert-card.png"),
      toPublicImagePath("explore/fallback/explore-fallback-food.png"),
    ]);
  }

  return uniquePaths([
    toPublicImagePath("explore/inspiration/food/spicy-card.png"),
    toPublicImagePath("explore/fallback/explore-fallback-food.png"),
  ]);
}

export function getArchivePlaceImageCandidates(item: ExploreImageTarget) {
  return uniquePaths([
    ...getExploreCityCodeImageCandidates(item.cityCode),
    ...getExploreCityImageCandidates(item.city),
    toPublicImagePath("explore/fallback/explore-fallback-location.png"),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ]);
}

function buildSlot(
  slot: ArchiveImageSlot["slot"],
  sources: Array<string | null | undefined>,
  futureTargets: string[],
  hasPrimarySource = false,
): ArchiveImageSlot {
  const normalizedSources = uniquePaths(sources);

  return {
    slot,
    sources: normalizedSources,
    usesFallbackOnly: normalizedSources.length > 0 ? !hasPrimarySource : false,
    futureTargets,
  };
}

export function getArchiveHeroCoverSlot(item: ExploreImageTarget): ArchiveImageSlot {
  const manifestCover = getManifestCoverCandidate(item);
  const cityCandidates = [
    ...getExploreCityCodeImageCandidates(item.cityCode),
    ...getExploreCityImageCandidates(item.city),
  ];
  const themeCandidates = getThemeFallbackImageCandidates(item);
  const genericCandidates = [
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
    toPublicImagePath("explore/fallback/explore-fallback-city.png"),
  ];

  return buildSlot(
    "heroCover",
    [
      item.coverImageUrl,
      manifestCover,
      ...cityCandidates,
      ...themeCandidates,
      ...genericCandidates,
    ],
    [
      `${FUTURE_ARCHIVE_ASSET_DIRS.covers}archive-cover-${slugifyCity(item.cityCode ?? item.city)}-${buildThemeSlug(item)}-01.png`,
      `${FUTURE_ARCHIVE_ASSET_DIRS.fallback}city-${slugifyCity(item.cityCode ?? item.city)}-archive-cover.png`,
      `${FUTURE_ARCHIVE_ASSET_DIRS.fallback}theme-${buildThemeSlug(item)}-archive-cover.png`,
    ],
    Boolean(item.coverImageUrl || manifestCover),
  );
}

export function getArchiveHighlightIllustrationSlot(
  item: ExploreImageTarget,
): ArchiveImageSlot {
  const sources = uniquePaths([
    ...getThemeFallbackImageCandidates(item),
    ...getExploreCityCodeImageCandidates(item.cityCode),
    toPublicImagePath("explore/archive/archive-list-cover-default.png"),
  ]);

  return buildSlot(
    "highlightIllustration",
    sources,
    [
      `${FUTURE_ARCHIVE_ASSET_DIRS.illustrations}archive-illustration-${slugifyCity(item.cityCode ?? item.city)}-${buildThemeSlug(item)}-01.png`,
      `${FUTURE_ARCHIVE_ASSET_DIRS.fallback}illustration-generic.png`,
    ],
    false,
  );
}

export function getArchiveRouteIllustrationSlot(item: ExploreImageTarget): ArchiveImageSlot {
  const sources = uniquePaths([
    ...getExploreCityCodeImageCandidates(item.cityCode),
    ...getThemeFallbackImageCandidates(item),
    toPublicImagePath("explore/archive/archive-list-cover-city.png"),
  ]);

  return buildSlot(
    "routeIllustration",
    sources,
    [
      `${FUTURE_ARCHIVE_ASSET_DIRS.illustrations}archive-route-${slugifyCity(item.cityCode ?? item.city)}-${buildThemeSlug(item)}-01.png`,
      `${FUTURE_ARCHIVE_ASSET_DIRS.fallback}route-generic.png`,
    ],
    false,
  );
}

export function getArchiveFoodImageSlot(
  food: ExploreTripFood & { imageUrl?: string },
): ArchiveImageSlot {
  const sources = uniquePaths([food.imageUrl, ...getArchiveFoodImageCandidates(food)]);

  return buildSlot(
    "foodImage",
    sources,
    [
      `${FUTURE_ARCHIVE_ASSET_DIRS.food}food-${slugifyCity(food.name ?? "local")}-01.png`,
      `${FUTURE_ARCHIVE_ASSET_DIRS.fallback}food-generic.png`,
    ],
    Boolean(food.imageUrl),
  );
}

export function getArchivePlaceImageSlot(
  place: { imageUrl?: string; name?: string },
  item: ExploreImageTarget,
): ArchiveImageSlot {
  const sources = uniquePaths([
    place.imageUrl,
    ...getArchivePlaceImageCandidates(item),
  ]);

  return buildSlot(
    "placeImage",
    sources,
    [
      `${FUTURE_ARCHIVE_ASSET_DIRS.places}place-${slugifyCity(item.cityCode ?? item.city)}-${slugifyCity(place.name ?? "spot")}-01.png`,
      `${FUTURE_ARCHIVE_ASSET_DIRS.fallback}place-generic.png`,
    ],
    Boolean(place.imageUrl),
  );
}

export function getArchiveStickerDecorationSlot(item: ExploreImageTarget): ArchiveImageSlot {
  return buildSlot(
    "stickerDecoration",
    [],
    [
      `${FUTURE_ARCHIVE_ASSET_DIRS.illustrations}archive-sticker-${slugifyCity(item.cityCode ?? item.city)}-01.png`,
    ],
    false,
  );
}

export function getArchiveAssetBundle(item: ExploreImageTarget) {
  return {
    template: toPublicImagePath("archive/template/archive-template-main.png"),
    paper: toPublicImagePath("archive/paper/archive-paper-light.png"),
    frame: toPublicImagePath("archive/frame/archive-photo-frame-01.png"),
    coverCandidates: getArchiveCoverImageCandidates(item),
  };
}
