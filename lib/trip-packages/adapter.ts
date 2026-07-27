import { exploreTripContentSchema } from "../explore/schema";
import type {
  ExploreTripContent,
  ExploreTripDailyActivity,
  ExploreTripDayContent,
  ExploreTripFood,
  ExploreTripPoi,
} from "../explore/types";
import type {
  LoadedTripPackage,
  TripPackageExplorePlanActivity,
  TripPackageExplorePlanFood,
  TripPackageExplorePlanPoi,
  TripPackageImageBinding,
  TripPackageImageAssetFile,
  TripPackageImageAssetSummary,
} from "./types";

const PACKAGE_COPY = {
  beijing_couple_golden_v2: {
    city: "北京",
    region: "北京",
    title: "北京 3 天情侣初印象路线",
    summary:
      "从故宫、景山到北海与什刹海，把第一次到北京的经典尺度和慢慢散步的余地放在一起。",
    theme: "皇城初印象",
  },
  hangzhou_couple_golden_v1: {
    city: "杭州",
    region: "浙江",
    title: "杭州 3 天西湖与街巷慢游",
    summary:
      "把西湖、茶田、老街和轻松吃喝串起来，适合第一次一起去杭州的慢节奏路线。",
    theme: "西湖慢游",
  },
  chengdu_couple_golden_v1: {
    city: "成都",
    region: "四川",
    title: "成都 3 天烟火气与松弛感路线",
    summary:
      "用茶馆、街巷、火锅和夜色把成都的松弛节奏排成一版不赶路的情侣行程。",
    theme: "成都烟火气",
  },
  shanghai_couple_v1: {
    city: "上海",
    region: "上海",
    title: "上海 3 天外滩天际线与老城漫步",
    summary:
      "从外滩和黄浦江夜色出发，穿插武康路、老城街巷和本地风味，保留城市散步的呼吸感。",
    theme: "海派城市漫步",
  },
  xian_couple_v1: {
    city: "西安",
    region: "陕西",
    title: "西安 3 天城墙暮色与古都食光",
    summary:
      "把城墙、钟鼓楼、古都街巷和面食小吃放进三天里，适合轻松认识西安的第一版路线。",
    theme: "古都慢行",
  },
} as const;

const PUBLIC_PACKAGE_IMAGE_ROOT = "/images/trip-packages";
const MOJIBAKE_PATTERN = /[锟�閿鍖鏃杩鎯鏉浠婀]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || MOJIBAKE_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized;
}

function cleanOptionalText(value: unknown) {
  const cleaned = cleanText(value, "");
  return cleaned || undefined;
}

function cleanStringList(values: unknown, fallback: string[] = []) {
  if (!Array.isArray(values)) {
    return fallback;
  }

  const cleaned = values
    .map((value) => cleanText(value, ""))
    .filter(Boolean);

  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
}

function getPackageCopy(packageId: LoadedTripPackage["packageId"]) {
  return PACKAGE_COPY[packageId];
}

function toPublicPackageImageUrl(packageId: string, packagedFilePath?: string) {
  if (!packagedFilePath) {
    return undefined;
  }

  const fileName = packagedFilePath.split(/[\\/]/).pop()?.trim();

  if (!fileName) {
    return undefined;
  }

  return `${PUBLIC_PACKAGE_IMAGE_ROOT}/${packageId}/${fileName}`;
}

function readMetadataText(
  imageAsset: TripPackageImageAssetFile | undefined,
  key: string,
) {
  const value = imageAsset?.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildImageBindings(input: LoadedTripPackage): TripPackageImageBinding[] {
  const imageAssetByInstanceId = new Map(
    input.imageAssetFiles
      .filter((asset) => asset.asset_instance_id)
      .map((asset) => [asset.asset_instance_id as string, asset]),
  );

  return (input.manifest.images?.assets ?? [])
    .filter((asset) => asset.asset_instance_id && asset.asset_id)
    .map((asset) => {
      const imageAsset = imageAssetByInstanceId.get(asset.asset_instance_id);
      const packagedFilePath = asset.packaged_file_path ?? imageAsset?.file_path;

      return {
        assetInstanceId: asset.asset_instance_id,
        assetId: asset.asset_id,
        assetName: cleanOptionalText(asset.asset_name),
        imageSlot: asset.image_slot,
        usageProfile: asset.image_usage_profile,
        publicUrl: toPublicPackageImageUrl(input.packageId, packagedFilePath),
        packagedFilePath,
        imageAssetPath: asset.image_asset_path,
        source: asset.source ?? imageAsset?.source,
        generationMode: asset.generation_mode,
        sourceUrl: readMetadataText(imageAsset, "source_url"),
        license: readMetadataText(imageAsset, "license"),
        note: readMetadataText(imageAsset, "note"),
      };
    });
}

function chooseCoverImage(bindings: TripPackageImageBinding[]) {
  const completedCover = bindings.find(
    (binding) =>
      binding.publicUrl &&
      binding.imageSlot === "explore_cover" &&
      binding.usageProfile === "cover",
  );

  if (completedCover?.publicUrl) {
    return completedCover.publicUrl;
  }

  return bindings.find((binding) => binding.publicUrl)?.publicUrl;
}

function toPoi(input: TripPackageExplorePlanPoi, index: number): ExploreTripPoi {
  return {
    id: cleanText(input.id, `poi-${index + 1}`),
    name: cleanText(input.name, `地点 ${index + 1}`),
    district: cleanOptionalText(input.district),
    type: cleanOptionalText(input.type),
    reason: cleanText(
      input.reason,
      "这处地点适合放进当天路线，出行前建议再核实开放信息。",
    ),
    recommendedDurationMinutes:
      typeof input.recommended_duration_minutes === "number" &&
      Number.isFinite(input.recommended_duration_minutes)
        ? input.recommended_duration_minutes
        : undefined,
  };
}

function toFood(input: TripPackageExplorePlanFood, index: number): ExploreTripFood {
  return {
    id: cleanText(input.id, `food-${index + 1}`),
    name: cleanText(input.name, `当地风味 ${index + 1}`),
    district: cleanOptionalText(input.district),
    category: cleanOptionalText(input.category),
    reason: cleanText(
      input.reason,
      "这类风味适合留一顿慢慢吃，具体店铺出发前再确认。",
    ),
  };
}

function createNameResolver<T extends { id: string; name: string }>(items: T[]) {
  const byId = new Map(items.map((item) => [item.id, item.name]));

  return (id: string | undefined) => {
    if (!id) {
      return undefined;
    }

    return byId.get(id) ?? id;
  };
}

function toActivity(
  activity: TripPackageExplorePlanActivity,
  resolvePoiName: (id: string | undefined) => string | undefined,
  resolveFoodName: (id: string | undefined) => string | undefined,
): ExploreTripDailyActivity {
  const poiRefs = Array.isArray(activity.poi_refs) ? activity.poi_refs : [];
  const foodRefs = Array.isArray(activity.food_refs) ? activity.food_refs : [];
  const primaryPoi = resolvePoiName(poiRefs[0]);
  const primaryFood = resolveFoodName(foodRefs[0]);
  const label = primaryPoi ?? primaryFood;
  const description = cleanText(
    activity.description,
    label ? `${label} 这一站按当天状态慢慢停留。` : "这段行程保留弹性，按当天状态慢慢走。",
  );

  return {
    timeBlock: cleanText(activity.time_block, "行程"),
    description,
    poiRefs,
    foodRefs,
  };
}

function toDay(
  day: NonNullable<LoadedTripPackage["explorePlan"]["daily_itinerary"]>[number],
  index: number,
  resolvePoiName: (id: string | undefined) => string | undefined,
  resolveFoodName: (id: string | undefined) => string | undefined,
): ExploreTripDayContent {
  return {
    dayNumber:
      typeof day.day === "number" && Number.isFinite(day.day)
        ? day.day
        : typeof day.dayNumber === "number" && Number.isFinite(day.dayNumber)
          ? day.dayNumber
          : index + 1,
    title: cleanText(day.title, `第 ${index + 1} 天慢行路线`),
    summary: cleanText(day.summary, "这一天别排太满，按路线顺序慢慢走。"),
    activities: (day.activities ?? []).map((activity) =>
      toActivity(activity, resolvePoiName, resolveFoodName),
    ),
  };
}

function inferHighlights(
  input: LoadedTripPackage,
  days: ExploreTripDayContent[],
  pois: ExploreTripPoi[],
  food: ExploreTripFood[],
) {
  const fromRaw = cleanStringList(
    isRecord(input.explorePlan) ? input.explorePlan["highlights"] : undefined,
  );
  const derived = [
    ...fromRaw,
    ...days.map((day) => day.title),
    ...pois.slice(0, 3).map((poi) => poi.name),
    ...food.slice(0, 2).map((item) => item.name),
  ].filter(Boolean);

  return Array.from(new Set(derived)).slice(0, 8);
}

function mapPace(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  switch (normalized) {
    case "slow":
    case "relaxed":
      return "轻松慢游";
    case "balanced":
      return "松弛适中";
    case "intensive":
    case "fast":
      return "节奏紧凑";
    default:
      return undefined;
  }
}

function mapBudgetLevel(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  switch (normalized) {
    case "low":
      return "预算友好";
    case "medium":
      return "预算适中";
    case "high":
      return "预算充足";
    default:
      return undefined;
  }
}

function inferTerrainTags(tags: string[], theme: string) {
  return Array.from(
    new Set(
      [
        theme.includes("西湖") ? "湖景" : "",
        theme.includes("古都") || theme.includes("皇城") ? "历史街区" : "",
        theme.includes("城市") || tags.some((tag) => tag.includes("漫步"))
          ? "城市漫步"
          : "",
      ].filter(Boolean),
    ),
  );
}

function inferCuisineTags(tags: string[], food: ExploreTripFood[]) {
  return Array.from(
    new Set([
      ...food.map((item) => item.category).filter((item): item is string => Boolean(item)),
      ...(tags.some((tag) => tag.includes("美食") || tag.includes("风味"))
        ? ["当地美食"]
        : []),
    ]),
  );
}

function createRawContent(
  input: LoadedTripPackage,
  imageBindings: TripPackageImageBinding[],
  coverImageUrl: string | undefined,
) {
  return {
    sourceExplorePlanId: input.explorePlan.id,
    explorePlan: input.explorePlan as Record<string, unknown>,
    package: {
      packageId: input.manifest.package_id,
      packageVersion: input.manifest.package_version,
      generatedOn: input.manifest.generated_on,
      tripId: input.manifest.trip_id,
      contentTripId: input.manifest.content_trip_id,
      imageManifestId: input.manifest.image_manifest_id,
      sourceOutputs: input.manifest.source_outputs,
      assets: input.manifest.images?.assets ?? [],
    },
    imageManifest: input.imageManifest as Record<string, unknown>,
    imageBindings,
    galleryImages: coverImageUrl ? [coverImageUrl] : [],
    validation: {
      status: input.assemblyReport.status,
      checks: input.assemblyReport.checks,
      counts: input.assemblyReport.counts,
      issues: input.assemblyReport.issues ?? [],
      warnings: input.assemblyReport.warnings ?? [],
      goldenReviewAvailable: input.goldenReview !== undefined,
    },
  };
}

export function adaptTripPackageToExploreContent(
  input: LoadedTripPackage,
): ExploreTripContent {
  const copy = getPackageCopy(input.packageId);
  const plan = input.explorePlan;
  const cityCode = cleanText(
    plan.city?.code ?? input.manifest.city?.code,
    input.packageId.split("_")[0] ?? "city",
  );
  const city = copy.city;
  const region = copy.region;
  const title = cleanText(plan.title ?? input.manifest.title, copy.title);
  const summary = cleanText(plan.summary ?? plan.description, copy.summary);
  const tags = cleanStringList(plan.tags, [city, "情侣", copy.theme]);
  const pois = (plan.pois ?? []).map(toPoi);
  const food = (plan.food ?? []).map(toFood);
  const resolvePoiName = createNameResolver(pois);
  const resolveFoodName = createNameResolver(food);
  const dailyItinerary = (plan.daily_itinerary ?? []).map((day, index) =>
    toDay(day, index, resolvePoiName, resolveFoodName),
  );
  const days =
    typeof plan.days === "number" && Number.isFinite(plan.days)
      ? plan.days
      : typeof input.manifest.days === "number" && Number.isFinite(input.manifest.days)
        ? input.manifest.days
        : Math.max(1, dailyItinerary.length);
  const imageBindings = buildImageBindings(input);
  const coverImageUrl = chooseCoverImage(imageBindings);
  const theme = cleanText(plan.theme, copy.theme);
  const now = input.manifest.generated_on ?? new Date(0).toISOString();
  const content: ExploreTripContent = {
    id: input.packageId,
    externalId: input.packageId,
    slug: cleanText(plan.slug, input.packageId.replaceAll("_", "-")),
    title,
    summary,
    city,
    cityCode,
    region,
    tripType: cleanText(plan.trip_type, "couple"),
    days,
    tags,
    theme,
    pace: mapPace(plan.pace),
    budgetLevel: mapBudgetLevel(plan.budget?.level),
    budgetNote: cleanOptionalText(plan.budget?.note),
    coverImageUrl,
    imagePrompt: cleanOptionalText(plan.image_prompt),
    archiveIntro: cleanText(plan.archive_intro, summary),
    featured: true,
    featuredReason: cleanText(
      plan.featured_reason,
      "这份路线来自 Wanderly Trip Package，已经通过内容和图片装配校验。",
    ),
    creatorType: plan.creator_type ?? "ai_generated",
    creatorId: cleanText(plan.creator_id, "wanderly-trip-package"),
    creator: cleanText(plan.creator, "Wanderly"),
    likes: typeof plan.likes === "number" ? plan.likes : 0,
    views: typeof plan.views === "number" ? plan.views : 0,
    savedCount: typeof plan.saved_count === "number" ? plan.saved_count : 0,
    terrainTags: cleanStringList(plan.terrain_tags, inferTerrainTags(tags, theme)),
    cuisineTags: cleanStringList(plan.cuisine_tags, inferCuisineTags(tags, food)),
    seasonTags: cleanStringList(plan.season_tags),
    companionTags: cleanStringList(plan.companion_tags, ["情侣"]),
    highlights: inferHighlights(input, dailyItinerary, pois, food),
    dailyItinerary,
    pois,
    food,
    status: "published",
    reviewStatus: "approved",
    source: {
      pipeline: "travel-content-pipeline",
      batchId: "trip-package-v1.9",
      sourceContentKey: input.packageId,
      sourceFilePath: `trip_packages/${input.packageId}/content/explore_plan.json`,
    },
    rawContent: createRawContent(input, imageBindings, coverImageUrl),
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return exploreTripContentSchema.parse(content);
}

export function adaptTripPackagesToExploreContents(
  packages: LoadedTripPackage[],
) {
  return packages.map(adaptTripPackageToExploreContent);
}

export function getTripPackageCoverAsset(
  input: LoadedTripPackage,
): TripPackageImageAssetSummary | undefined {
  const bindings = buildImageBindings(input);
  const coverUrl = chooseCoverImage(bindings);
  const coverBinding = bindings.find((binding) => binding.publicUrl === coverUrl);

  return input.manifest.images?.assets?.find(
    (asset) => asset.asset_instance_id === coverBinding?.assetInstanceId,
  );
}
