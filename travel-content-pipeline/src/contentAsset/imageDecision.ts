import type {
  ContentAsset,
  ImageContextV2,
  ImageDecisionConfidence,
  ImageGenerationMode,
  ImageRequirement,
  ImageRequirementType,
  ImageSlot,
  ImageSourcePreference,
} from "./types.js";

type ImageUsageProfile = "cover" | "place" | "food" | "experience";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => normalize(value)).filter(Boolean))];
}

function canonicalizeFamily(family: string): string {
  const normalized = normalize(family);

  if (normalized === "slow_walk_anchor") {
    return "slow_solo";
  }

  return normalized;
}

function hasTag(asset: ContentAsset, tags: string[]): boolean {
  const pool = uniqueStrings([
    ...asset.category,
    ...asset.content_role,
    ...asset.experience_value,
    ...asset.best_time,
  ]);

  return tags.some((tag) => pool.includes(normalize(tag)));
}

function describeSeason(asset: ContentAsset): string {
  const season = asset.season_fit[0] ?? "";

  switch (normalize(season)) {
    case "spring":
      return "spring";
    case "summer":
      return "summer";
    case "autumn":
      return "autumn";
    case "winter":
      return "winter";
    default:
      return "Beijing";
  }
}

function describeTime(asset: ContentAsset): string {
  const time = asset.best_time[0] ?? "";

  switch (normalize(time)) {
    case "morning":
    case "late_morning":
      return "morning";
    case "afternoon":
    case "late_afternoon":
      return "afternoon";
    case "sunset":
    case "dusk":
      return "dusk";
    case "evening":
    case "night":
      return "evening";
    case "breakfast":
      return "breakfast";
    case "lunch":
      return "lunch";
    case "early_evening":
    case "dinner":
      return "early evening";
    default:
      return "daytime";
  }
}

function buildNarrativeFocus(family: string): string {
  const canonicalFamily = canonicalizeFamily(family);

  if (canonicalFamily === "signature_anchor") {
    return "landmark scale, clear architecture, first-arrival recognition, and a concrete sense of place";
  }

  if (canonicalFamily === "food_backbone") {
    return "real food appearance, serving context, table details, and local flavor memory";
  }

  if (canonicalFamily === "historic_texture") {
    return "street texture, walking rhythm, human-scale old-city detail, and authentic neighborhood atmosphere";
  }

  if (canonicalFamily === "slow_solo") {
    return "slow walking, pauses, observation, and a relaxed private-travel rhythm";
  }

  if (canonicalFamily === "evening_closure") {
    return "dusk or evening closure, lights, water or street atmosphere, and a relaxed end-of-day feeling";
  }

  if (canonicalFamily === "modern_contrast") {
    return "contemporary Beijing atmosphere and a natural contrast with older city texture";
  }

  return "sense of place, people in scene, and a believable travel pause";
}

function buildPrompt(asset: ContentAsset, family: string, type: ImageRequirementType): string {
  const season = describeSeason(asset);
  const time = describeTime(asset);
  const focus = buildNarrativeFocus(family);

  if (type === "food") {
    return `${season} ${time} real food and on-site dining scene at ${asset.name}. Preserve actual dish, counter, table, or serving details. Focus on ${focus}.`;
  }

  if (type === "detail") {
    return `${season} ${time} detail image of ${asset.name}. Preserve material, signage, local texture, or spatial detail. Focus on ${focus}.`;
  }

  if (type === "hero") {
    return `${season} ${time} hero image of ${asset.name}. Preserve real geography and architecture while allowing a travel magazine and private journal mood. Focus on ${focus}.`;
  }

  return `${season} ${time} experience image of ${asset.name}. Preserve real street or spatial relationship, natural human movement, and the reason this route moment works. Focus on ${focus}.`;
}

function buildImageUsageProfile(type: ImageRequirementType, imageSlot: ImageSlot): ImageUsageProfile {
  if (imageSlot === "explore_cover" || imageSlot === "trip_cover") {
    return "cover";
  }

  if (type === "food" || imageSlot === "food_gallery") {
    return "food";
  }

  if (imageSlot === "day_cover" || type === "experience") {
    return "experience";
  }

  if (imageSlot === "poi_gallery" || imageSlot === "detail_image") {
    return "place";
  }

  return "place";
}

function buildDecision(
  family: string,
  type: ImageRequirementType,
  imageSlot: ImageSlot,
): {
  source_preference: ImageSourcePreference;
  generation_mode: ImageGenerationMode;
  confidence: ImageDecisionConfidence;
  decision_reason: string;
} {
  const canonicalFamily = canonicalizeFamily(family);
  const usageProfile = buildImageUsageProfile(type, imageSlot);

  if (usageProfile === "food") {
    return {
      source_preference: "real_first",
      generation_mode: "real_photo",
      confidence: "high",
      decision_reason: "Food assets should default to real photos so the pipeline does not fabricate specific shops, dishes, or serving details.",
    };
  }

  if (canonicalFamily === "signature_anchor" && imageSlot === "poi_gallery") {
    return {
      source_preference: "real_first",
      generation_mode: "real_photo",
      confidence: "high",
      decision_reason: "Signature POI gallery images are guide evidence, so they should remain real photos even when the same asset also has a hybrid cover.",
    };
  }

  if (usageProfile === "experience") {
    return {
      source_preference: "mixed",
      generation_mode: "hybrid",
      confidence: "medium",
      decision_reason: "Experience assets intentionally combine real place credibility with AI-supported travel narrative and journal atmosphere.",
    };
  }

  if (usageProfile === "place") {
    return {
      source_preference: "real_first",
      generation_mode: "real_photo",
      confidence: "high",
      decision_reason: "Place assets should default to real photos because users need reliable geography, architecture, and recognisable POI evidence.",
    };
  }

  if (
    usageProfile === "cover" &&
    (canonicalFamily === "signature_anchor" ||
      canonicalFamily === "historic_texture" ||
      canonicalFamily === "slow_solo" ||
      canonicalFamily === "modern_contrast" ||
      canonicalFamily === "evening_closure")
  ) {
    return {
      source_preference: "mixed",
      generation_mode: "hybrid",
      confidence: "medium",
      decision_reason: "A concrete place-entry cover needs both landmark credibility and the travel magazine plus private journal mood, so Hybrid is the active strategy.",
    };
  }

  return {
    source_preference: "ai_first",
    generation_mode: "ai_generated",
    confidence: "medium",
    decision_reason: "City mood covers do not depend on precise POI verification and can use AI generation for a consistent Wanderly visual voice.",
  };
}

function buildImageSlot(type: ImageRequirementType, family: string): ImageSlot {
  const canonicalFamily = canonicalizeFamily(family);

  if (type === "hero") {
    return canonicalFamily === "signature_anchor" ? "explore_cover" : "trip_cover";
  }

  if (type === "food") {
    return "food_gallery";
  }

  if (type === "detail") {
    return "detail_image";
  }

  if (hasEveningSignal(canonicalFamily)) {
    return "day_cover";
  }

  return "poi_gallery";
}

function hasEveningSignal(family: string): boolean {
  return canonicalizeFamily(family) === "evening_closure";
}

function inferImageTypes(asset: ContentAsset, family: string): ImageRequirementType[] {
  const canonicalFamily = canonicalizeFamily(family);
  const types = new Set<ImageRequirementType>();

  if (canonicalFamily === "signature_anchor") {
    types.add("hero");
  }

  if (canonicalFamily === "food_backbone") {
    types.add("food");
  }

  if (
    canonicalFamily === "historic_texture" ||
    canonicalFamily === "slow_solo" ||
    canonicalFamily === "modern_contrast" ||
    canonicalFamily === "evening_closure"
  ) {
    types.add("experience");
  }

  if (
    hasTag(asset, ["sunset_anchor", "evening_walk", "modern_city_mood", "browse_asset"]) &&
    !types.has("experience")
  ) {
    types.add("experience");
  }

  if (canonicalFamily === "signature_anchor" && hasTag(asset, ["sunset_anchor", "evening_walk", "imperial_view", "royal_garden"])) {
    types.add("experience");
  }

  if (types.size === 0) {
    types.add("experience");
  }

  return [...types];
}

function buildPurpose(asset: ContentAsset, type: ImageRequirementType, slot: ImageSlot): string {
  if (slot === "explore_cover") {
    return `${asset.name} Explore card cover`;
  }

  if (slot === "trip_cover") {
    return `${asset.name} route cover support image`;
  }

  if (slot === "day_cover") {
    return `${asset.name} day-section closure cover`;
  }

  if (type === "food") {
    return `${asset.name} food display image`;
  }

  if (type === "detail") {
    return `${asset.name} detail support image`;
  }

  return `${asset.name} experience display image`;
}

export function buildImageContextV2(asset: ContentAsset, family: string): ImageContextV2 {
  const canonicalFamily = canonicalizeFamily(family);
  const imageTypes = inferImageTypes(asset, canonicalFamily);

  const images: ImageRequirement[] = imageTypes.map((type) => {
    const imageSlot = buildImageSlot(type, canonicalFamily);
    const decision = buildDecision(canonicalFamily, type, imageSlot);

    return {
      type,
      image_slot: imageSlot,
      purpose: buildPurpose(asset, type, imageSlot),
      prompt: buildPrompt(asset, canonicalFamily, type),
      source_preference: decision.source_preference,
      generation_mode: decision.generation_mode,
      decision_reason: decision.decision_reason,
      confidence: decision.confidence,
      placeholder: "",
      status: "pending",
    };
  });

  return {
    required: true,
    images,
  };
}
