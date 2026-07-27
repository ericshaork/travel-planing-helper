import type {
  AssetRequestProfile,
  ContentAsset,
  RankedContentAsset,
  TravelerFitLevel,
} from "./types.js";

const TRAVELER_FIT_SCORES: Record<TravelerFitLevel, number> = {
  high: 4,
  medium: 2,
  low: 0,
  none: -2,
};

const PURPOSE_ROLE_KEYWORDS: Record<string, string[]> = {
  first_visit: [
    "signature_anchor",
    "first_visit_support",
    "cultural_anchor",
    "imperial_architecture",
    "imperial_view",
    "first_visit_food",
  ],
  deep_exploration: [
    "historic_texture",
    "slow_exploration",
    "slow_walk_anchor",
    "solo_texture",
    "browse_asset",
    "reflection_space",
    "old_city_axis",
    "hutong_texture",
  ],
  food_exploration: [
    "food_backbone",
    "traditional_food_cluster",
    "breakfast_anchor",
    "food_history_connection",
    "first_visit_food",
  ],
};

const PURPOSE_AVOID_KEYWORDS: Record<string, string[]> = {
  first_visit: ["first-visit", "first visit", "one day", "one-day", "landmark-only"],
  deep_exploration: ["modern-city register", "only iconic", "landmark-only", "highlight reel"],
  food_exploration: ["food", "appetite", "snack", "dining"],
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => normalize(value)).filter(Boolean))];
}

function resolveTravelerFit(asset: ContentAsset, traveler: string): number {
  const raw = asset.traveler_fit[traveler] ?? "none";
  const level = normalize(raw) as TravelerFitLevel;
  return TRAVELER_FIT_SCORES[level] ?? TRAVELER_FIT_SCORES.none;
}

function resolveSeasonFit(asset: ContentAsset, season: string): number {
  return uniqueStrings(asset.season_fit).includes(normalize(season)) ? 3 : 0;
}

function resolveRoleFit(asset: ContentAsset, purpose: string): number {
  const keywords = PURPOSE_ROLE_KEYWORDS[normalize(purpose)] ?? [];
  const searchPool = uniqueStrings([...asset.content_role, ...asset.category]);
  const matchCount = keywords.filter((keyword) => searchPool.includes(normalize(keyword))).length;

  if (matchCount >= 2) {
    return 3;
  }

  if (matchCount === 1) {
    return 1.5;
  }

  return 0;
}

function resolveAvoidPenalty(asset: ContentAsset, profile: AssetRequestProfile): number {
  const avoidText = normalize(asset.avoid_when.join(" "));
  if (!avoidText) {
    return 0;
  }

  let penalty = 0;
  const purposeKeywords = PURPOSE_AVOID_KEYWORDS[normalize(profile.purpose)] ?? [];

  if (purposeKeywords.some((keyword) => avoidText.includes(normalize(keyword)))) {
    penalty += 2;
  }

  if (avoidText.includes(normalize(profile.traveler))) {
    penalty += 1.5;
  }

  if (avoidText.includes(normalize(profile.season))) {
    penalty += 1;
  }

  return penalty;
}

function buildBaseScores(
  profile: AssetRequestProfile,
  assets: ContentAsset[],
): Map<string, { asset: ContentAsset; travelerFit: number; seasonFit: number; roleFit: number; avoidPenalty: number; baseScore: number }> {
  const scores = new Map<
    string,
    { asset: ContentAsset; travelerFit: number; seasonFit: number; roleFit: number; avoidPenalty: number; baseScore: number }
  >();

  for (const asset of assets) {
    const travelerFit = resolveTravelerFit(asset, profile.traveler);
    const seasonFit = resolveSeasonFit(asset, profile.season);
    const roleFit = resolveRoleFit(asset, profile.purpose);
    const avoidPenalty = resolveAvoidPenalty(asset, profile);
    const baseScore = travelerFit * 4 + seasonFit * 3 + roleFit * 3 - avoidPenalty * 4;

    scores.set(asset.id, {
      asset,
      travelerFit,
      seasonFit,
      roleFit,
      avoidPenalty,
      baseScore,
    });
  }

  return scores;
}

function resolveNearbyBonus(
  asset: ContentAsset,
  baseScores: Map<string, { baseScore: number }>,
): number {
  const relatedScores = asset.nearby_assets
    .map((nearbyId) => baseScores.get(nearbyId)?.baseScore)
    .filter((score): score is number => typeof score === "number" && score > 0);

  if (relatedScores.length === 0) {
    return 0;
  }

  const averageRelatedScore = relatedScores.reduce((sum, score) => sum + score, 0) / relatedScores.length;
  return Math.min(1.5, averageRelatedScore / 20);
}

function buildReasons(
  asset: ContentAsset,
  profile: AssetRequestProfile,
  breakdown: RankedContentAsset["breakdown"],
): string[] {
  const reasons: string[] = [];

  if (breakdown.traveler_fit > 0) {
    reasons.push(`stronger traveler fit for ${profile.traveler}`);
  }

  if (breakdown.season_fit > 0) {
    reasons.push(`supports ${profile.season} routes`);
  }

  if (breakdown.content_role_fit > 0) {
    reasons.push(`matches ${profile.purpose} content roles`);
  }

  if (breakdown.nearby_bonus > 0) {
    reasons.push("pairs well with nearby assets");
  }

  if (breakdown.avoid_penalty > 0) {
    reasons.push("contains avoid-rule pressure for this request");
  }

  if (reasons.length === 0) {
    reasons.push(`kept as a neutral candidate for ${asset.name}`);
  }

  return reasons;
}

export function rankAssets(
  profile: AssetRequestProfile,
  assets: ContentAsset[],
): RankedContentAsset[] {
  const normalizedProfile: AssetRequestProfile = {
    traveler: normalize(profile.traveler),
    season: normalize(profile.season),
    purpose: normalize(profile.purpose),
  };

  const baseScores = buildBaseScores(normalizedProfile, assets);

  return assets
    .map((asset) => {
      const base = baseScores.get(asset.id);
      if (!base) {
        throw new Error(`Missing base score for asset: ${asset.id}`);
      }

      const nearbyBonus = resolveNearbyBonus(asset, baseScores);
      const total = Number((base.baseScore + nearbyBonus * 1.5).toFixed(2));

      const breakdown: RankedContentAsset["breakdown"] = {
        traveler_fit: Number((base.travelerFit * 4).toFixed(2)),
        season_fit: Number((base.seasonFit * 3).toFixed(2)),
        content_role_fit: Number((base.roleFit * 3).toFixed(2)),
        avoid_penalty: Number((base.avoidPenalty * 4).toFixed(2)),
        nearby_bonus: Number((nearbyBonus * 1.5).toFixed(2)),
        total,
      };

      return {
        asset,
        score: total,
        breakdown,
        reasons: buildReasons(asset, normalizedProfile, breakdown),
      };
    })
    .sort((left, right) => right.score - left.score || left.asset.name.localeCompare(right.asset.name, "zh-CN"));
}
