import type {
  CandidateSelectionItem,
  CandidateSelectionRequest,
  CandidateSelectionResult,
  ContentAsset,
  RankedContentAsset,
} from "./types.js";
import { buildImageContextV2 } from "./imageDecision.js";

interface RequestBlueprint {
  preferredAssetIds: string[];
  requiredFamilies?: Array<{ family: string; min: number }>;
  requiredRoleGroups?: Array<{ labels: string[]; min: number }>;
}

const PURPOSE_PRIORITY_ROLES: Record<string, string[]> = {
  first_visit: [
    "signature_anchor",
    "cultural_anchor",
    "first_visit_support",
    "imperial_view",
    "sunset_anchor",
    "evening_walk",
    "evening_closure",
    "first_visit_food",
  ],
  food_exploration: [
    "traditional_food_cluster",
    "breakfast_anchor",
    "food_history_connection",
    "first_visit_food",
    "old_city_axis",
    "historic_texture",
  ],
  deep_exploration: [
    "historic_texture",
    "slow_exploration",
    "slow_walk_anchor",
    "solo_texture",
    "browse_asset",
    "reflection_space",
    "hutong_texture",
    "old_city_axis",
  ],
};

const PURPOSE_SEED_FAMILIES: Record<string, string[]> = {
  first_visit: ["signature_anchor", "evening_closure"],
  food_exploration: ["food_backbone", "historic_texture"],
  deep_exploration: ["slow_solo", "historic_texture"],
};

const FAMILY_KEYWORDS: Array<{ family: string; keywords: string[] }> = [
  {
    family: "signature_anchor",
    keywords: [
      "signature_anchor",
      "cultural_anchor",
      "imperial_landmark",
      "imperial_architecture",
      "imperial_view",
      "royal_garden",
      "city_symbolism",
      "first_visit_support",
    ],
  },
  {
    family: "food_backbone",
    keywords: [
      "food_backbone",
      "traditional_food_cluster",
      "breakfast_anchor",
      "food_history_connection",
      "first_visit_food",
      "snack_street",
    ],
  },
  {
    family: "historic_texture",
    keywords: [
      "historic_texture",
      "old_beijing_waterfront",
      "old_city_axis",
      "hutong_texture",
      "waterfront",
      "hutong_edge",
      "neighborhood_connector",
    ],
  },
  {
    family: "slow_solo",
    keywords: [
      "slow_exploration",
      "slow_walk_anchor",
      "solo_texture",
      "browse_asset",
      "reflection_space",
      "browse_culture",
      "cafe_browse",
    ],
  },
  {
    family: "evening_closure",
    keywords: ["evening_closure", "sunset_anchor", "evening_walk", "dusk", "night"],
  },
  {
    family: "modern_contrast",
    keywords: [
      "modern_contrast",
      "modern_city_mood",
      "art_district",
      "creative_district",
      "city_contrast_anchor",
      "contemporary_art_cluster",
      "secondary_anchor",
      "nightscape",
    ],
  },
];

const PURPOSE_FAMILY_LIMITS: Record<string, Record<string, number>> = {
  first_visit: {
    signature_anchor: 2,
    food_backbone: 1,
    evening_closure: 1,
    historic_texture: 1,
    slow_solo: 1,
    modern_contrast: 1,
  },
  food_exploration: {
    food_backbone: 2,
    historic_texture: 1,
    signature_anchor: 1,
    slow_solo: 1,
    modern_contrast: 1,
    evening_closure: 1,
  },
  deep_exploration: {
    slow_solo: 2,
    historic_texture: 2,
    food_backbone: 1,
    signature_anchor: 1,
    modern_contrast: 1,
    evening_closure: 1,
  },
};

const REQUEST_BLUEPRINTS: Record<string, RequestBlueprint> = {
  "couple|first_visit": {
    preferredAssetIds: [
      "ca_beijing_forbidden_city",
      "ca_beijing_jingshan_park",
      "ca_beijing_beihai_park",
      "ca_beijing_shichahai",
      "ca_beijing_liangma_river",
    ],
    requiredFamilies: [
      { family: "signature_anchor", min: 1 },
      { family: "evening_closure", min: 1 },
      { family: "historic_texture", min: 1 },
    ],
    requiredRoleGroups: [
      { labels: ["signature_anchor"], min: 1 },
      { labels: ["evening_closure", "evening_walk"], min: 1 },
      { labels: ["historic_texture", "royal_garden", "waterfront", "water_adjacent_park"], min: 1 },
    ],
  },
  "student|food_exploration": {
    preferredAssetIds: [
      "ca_beijing_niujie",
      "ca_beijing_huguosi_food",
      "ca_beijing_qianmen_food",
      "ca_beijing_gulou",
    ],
    requiredFamilies: [
      { family: "food_backbone", min: 2 },
      { family: "historic_texture", min: 1 },
    ],
    requiredRoleGroups: [
      { labels: ["food_backbone", "traditional_food_cluster", "first_visit_food"], min: 2 },
      { labels: ["historic_texture", "old_city_axis"], min: 1 },
      { labels: ["budget_value", "local_life_texture", "food_memory"], min: 1 },
    ],
  },
  "solo|deep_exploration": {
    preferredAssetIds: [
      "ca_beijing_baita_temple",
      "ca_beijing_wudaoying",
      "ca_beijing_culture_pause_asset",
      "ca_beijing_shichahai",
      "ca_beijing_798_art_district",
    ],
    requiredFamilies: [
      { family: "slow_solo", min: 2 },
      { family: "historic_texture", min: 1 },
      { family: "modern_contrast", min: 1 },
    ],
    requiredRoleGroups: [
      { labels: ["slow_walk_anchor"], min: 1 },
      { labels: ["browse_asset", "reflection_space"], min: 1 },
      { labels: ["historic_texture", "texture_injector"], min: 1 },
    ],
  },
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => normalize(value)).filter(Boolean))];
}

function isRoleLikeLabel(value: string): boolean {
  return /^[a-z0-9_/-]+$/.test(normalize(value));
}

function collectRoleLikeValues(asset: ContentAsset): string[] {
  return uniqueStrings(
    [...asset.category, ...asset.content_role, ...asset.experience_value].filter((value) =>
      isRoleLikeLabel(value),
    ),
  );
}

function getSearchPool(asset: ContentAsset): string[] {
  return uniqueStrings([
    ...asset.category,
    ...asset.content_role,
    ...asset.best_time,
    ...collectRoleLikeValues(asset),
  ]);
}

function resolveFamily(asset: ContentAsset): string {
  const searchPool = getSearchPool(asset);

  for (const entry of FAMILY_KEYWORDS) {
    if (entry.keywords.some((keyword) => searchPool.includes(normalize(keyword)))) {
      return entry.family;
    }
  }

  return "general";
}

function resolveTargetAssetCount(request: CandidateSelectionRequest): number {
  if (typeof request.target_asset_count === "number" && Number.isFinite(request.target_asset_count)) {
    return Math.max(3, Math.min(8, Math.round(request.target_asset_count)));
  }

  return Math.max(4, Math.min(7, request.days + 2));
}

function resolveBlueprint(request: CandidateSelectionRequest): RequestBlueprint | null {
  return REQUEST_BLUEPRINTS[`${normalize(request.traveler)}|${normalize(request.purpose)}`] ?? null;
}

function buildAssetMap(rankedAssets: RankedContentAsset[]): Map<string, RankedContentAsset> {
  return new Map(rankedAssets.map((item) => [item.asset.id, item]));
}

function countConnectedPairs(selected: CandidateSelectionItem[]): number {
  let pairCount = 0;

  for (let index = 0; index < selected.length; index += 1) {
    const current = selected[index];
    for (let candidateIndex = index + 1; candidateIndex < selected.length; candidateIndex += 1) {
      const candidate = selected[candidateIndex];
      if (
        current.asset.nearby_assets.includes(candidate.asset.id) ||
        candidate.asset.nearby_assets.includes(current.asset.id)
      ) {
        pairCount += 1;
      }
    }
  }

  return pairCount;
}

function countFamilies(selected: CandidateSelectionItem[]): Record<string, number> {
  return selected.reduce<Record<string, number>>((counts, item) => {
    counts[item.family] = (counts[item.family] ?? 0) + 1;
    return counts;
  }, {});
}

function roleCoverage(selected: CandidateSelectionItem[]): Set<string> {
  return new Set(
    selected.flatMap((item) => uniqueStrings([...item.asset.content_role, ...item.asset.category, ...collectRoleLikeValues(item.asset)])),
  );
}

function overlapCount(left: string[], right: string[]): number {
  const rightSet = new Set(uniqueStrings(right));
  return uniqueStrings(left).filter((value) => rightSet.has(value)).length;
}

function resolveFamilyLimit(request: CandidateSelectionRequest, family: string): number {
  return PURPOSE_FAMILY_LIMITS[normalize(request.purpose)]?.[family] ?? 2;
}

function familyPenalty(
  request: CandidateSelectionRequest,
  family: string,
  selected: CandidateSelectionItem[],
): number {
  const existingCount = selected.filter((item) => item.family === family).length;
  const familyLimit = resolveFamilyLimit(request, family);

  if (existingCount === 0) {
    return 0;
  }

  if (existingCount >= familyLimit) {
    return 9;
  }

  if (existingCount === 1) {
    return 3;
  }

  return 7;
}

function computeSelectionScore(
  request: CandidateSelectionRequest,
  rankedAsset: RankedContentAsset,
  selected: CandidateSelectionItem[],
): { selectionScore: number; reasons: string[]; connectedAssetIds: string[]; family: string } {
  const family = resolveFamily(rankedAsset.asset);
  const reasons: string[] = [...rankedAsset.reasons];
  const connectedAssetIds = selected
    .map((item) => item.asset.id)
    .filter(
      (selectedId) =>
        rankedAsset.asset.nearby_assets.includes(selectedId) ||
        selected.find((item) => item.asset.id === selectedId)?.asset.nearby_assets.includes(rankedAsset.asset.id),
    );

  let selectionScore = rankedAsset.score;

  if (connectedAssetIds.length > 0) {
    selectionScore += Math.min(6, connectedAssetIds.length * 2.5);
    reasons.push(`connects with ${connectedAssetIds.length} selected asset(s)`);
  } else if (selected.length >= 2) {
    selectionScore -= 2;
    reasons.push("less route-connected than current selected set");
  }

  const roleOverlap = selected.reduce(
    (sum, item) => sum + overlapCount(item.asset.content_role, rankedAsset.asset.content_role),
    0,
  );
  if (roleOverlap > 0) {
    const penalty = roleOverlap * 2;
    selectionScore -= penalty;
    reasons.push(`role overlap penalty ${penalty}`);
  }

  const categoryOverlap = selected.reduce(
    (sum, item) => sum + overlapCount(item.asset.category, rankedAsset.asset.category),
    0,
  );
  if (categoryOverlap > 0) {
    const penalty = categoryOverlap;
    selectionScore -= penalty;
    reasons.push(`category overlap penalty ${penalty}`);
  }

  const familyDupPenalty = familyPenalty(request, family, selected);
  if (familyDupPenalty > 0) {
    selectionScore -= familyDupPenalty;
    reasons.push(`family duplication penalty ${familyDupPenalty}`);
  }

  const priorityRoles = PURPOSE_PRIORITY_ROLES[normalize(request.purpose)] ?? [];
  const coveredRoles = roleCoverage(selected);
  const uncoveredPriorityMatches = uniqueStrings([...rankedAsset.asset.content_role, ...rankedAsset.asset.category])
    .filter((tag) => priorityRoles.includes(tag) && !coveredRoles.has(tag));
  if (uncoveredPriorityMatches.length > 0) {
    const bonus = uncoveredPriorityMatches.length >= 2 ? 6 : 3;
    selectionScore += bonus;
    reasons.push(`adds uncovered priority role coverage (+${bonus})`);
  }

  const travelerFit = normalize(rankedAsset.asset.traveler_fit[request.traveler] ?? "none");
  if (travelerFit === "high") {
    selectionScore += 2;
  } else if (travelerFit === "medium") {
    selectionScore += 1;
  }

  return {
    selectionScore: Number(selectionScore.toFixed(2)),
    reasons,
    connectedAssetIds,
    family,
  };
}

function buildSelectionItem(
  rankedAsset: RankedContentAsset,
  evaluated: { selectionScore: number; reasons: string[]; connectedAssetIds: string[]; family: string },
): CandidateSelectionItem {
  return {
    asset: rankedAsset.asset,
    ranking_score: rankedAsset.score,
    selection_score: evaluated.selectionScore,
    family: evaluated.family,
    connected_asset_ids: evaluated.connectedAssetIds,
    reasons: evaluated.reasons,
    image_context: buildImageContextV2(rankedAsset.asset, evaluated.family),
  };
}

function maybeAddSelectedItem(
  request: CandidateSelectionRequest,
  rankedAsset: RankedContentAsset,
  selected: CandidateSelectionItem[],
  seenIds: Set<string>,
  extraReason?: string,
): void {
  if (seenIds.has(rankedAsset.asset.id)) {
    return;
  }

  const evaluated = computeSelectionScore(request, rankedAsset, selected);
  const item = buildSelectionItem(rankedAsset, {
    ...evaluated,
    reasons: extraReason ? [...evaluated.reasons, extraReason] : evaluated.reasons,
  });
  selected.push(item);
  seenIds.add(item.asset.id);
}

function pickSeedAssets(
  request: CandidateSelectionRequest,
  rankedAssets: RankedContentAsset[],
): CandidateSelectionItem[] {
  const selected: CandidateSelectionItem[] = [];
  const seenIds = new Set<string>();
  const seedFamilies = PURPOSE_SEED_FAMILIES[normalize(request.purpose)] ?? [];
  const blueprint = resolveBlueprint(request);

  if (blueprint) {
    for (const assetId of blueprint.preferredAssetIds) {
      const match = rankedAssets.find((item) => item.asset.id === assetId);
      if (!match) {
        continue;
      }

      maybeAddSelectedItem(request, match, selected, seenIds, "selected by request blueprint");
      if (selected.length >= resolveTargetAssetCount(request)) {
        return selected;
      }
    }
  }

  for (const family of seedFamilies) {
    const match = rankedAssets.find((item) => !seenIds.has(item.asset.id) && resolveFamily(item.asset) === family);
    if (!match) {
      continue;
    }

    maybeAddSelectedItem(request, match, selected, seenIds, `selected as ${family} seed`);
  }

  return selected;
}

function countFamilyMatches(selected: CandidateSelectionItem[], family: string): number {
  return selected.filter((item) => item.family === family).length;
}

function countRoleGroupMatches(selected: CandidateSelectionItem[], labels: string[]): number {
  return selected.filter((item) => {
    const searchPool = uniqueStrings([
      ...item.asset.content_role,
      ...item.asset.category,
      ...collectRoleLikeValues(item.asset),
    ]);
    return labels.some((label) => searchPool.includes(normalize(label)));
  }).length;
}

function satisfyBlueprintCoverage(
  request: CandidateSelectionRequest,
  rankedPool: RankedContentAsset[],
  selected: CandidateSelectionItem[],
  seenIds: Set<string>,
): void {
  const blueprint = resolveBlueprint(request);
  if (!blueprint) {
    return;
  }

  for (const requirement of blueprint.requiredFamilies ?? []) {
    while (countFamilyMatches(selected, requirement.family) < requirement.min) {
      const match = rankedPool.find(
        (item) => !seenIds.has(item.asset.id) && resolveFamily(item.asset) === requirement.family,
      );
      if (!match) {
        break;
      }

      maybeAddSelectedItem(
        request,
        match,
        selected,
        seenIds,
        `selected to satisfy ${requirement.family} coverage`,
      );
    }
  }

  for (const requirement of blueprint.requiredRoleGroups ?? []) {
    while (countRoleGroupMatches(selected, requirement.labels) < requirement.min) {
      const match = rankedPool.find((item) => {
        if (seenIds.has(item.asset.id)) {
          return false;
        }

        const searchPool = uniqueStrings([
          ...item.asset.content_role,
          ...item.asset.category,
          ...collectRoleLikeValues(item.asset),
        ]);
        return requirement.labels.some((label) => searchPool.includes(normalize(label)));
      });

      if (!match) {
        break;
      }

      maybeAddSelectedItem(
        request,
        match,
        selected,
        seenIds,
        `selected to satisfy role coverage: ${requirement.labels.join("/")}`,
      );
    }
  }
}

export function selectCandidates(
  request: CandidateSelectionRequest,
  rankedAssets: RankedContentAsset[],
): CandidateSelectionResult {
  const normalizedRequest: CandidateSelectionRequest = {
    traveler: normalize(request.traveler),
    season: normalize(request.season),
    purpose: normalize(request.purpose),
    days: request.days,
    target_asset_count: request.target_asset_count,
  };

  const targetAssetCount = resolveTargetAssetCount(normalizedRequest);
  const rankedPool = rankedAssets.slice(0, Math.max(targetAssetCount * 3, 10));
  const selected = pickSeedAssets(normalizedRequest, rankedPool);
  const seenIds = new Set(selected.map((item) => item.asset.id));
  const assetMap = buildAssetMap(rankedAssets);

  satisfyBlueprintCoverage(normalizedRequest, rankedPool, selected, seenIds);

  while (selected.length < targetAssetCount) {
    const remaining = rankedPool.filter((item) => !seenIds.has(item.asset.id));
    if (remaining.length === 0) {
      break;
    }

    const next = remaining
      .map((item) => {
        const evaluated = computeSelectionScore(normalizedRequest, item, selected);
        return buildSelectionItem(item, evaluated);
      })
      .sort(
        (left, right) =>
          right.selection_score - left.selection_score ||
          right.ranking_score - left.ranking_score ||
          left.asset.name.localeCompare(right.asset.name, "zh-CN"),
      )[0];

    if (!next) {
      break;
    }

    selected.push(next);
    seenIds.add(next.asset.id);
  }

  const rejected = rankedPool
    .filter((item) => !seenIds.has(item.asset.id))
    .map((item) => {
      const evaluated = computeSelectionScore(normalizedRequest, item, selected);
      return buildSelectionItem(item, evaluated);
    })
    .sort(
      (left, right) =>
        right.selection_score - left.selection_score ||
        right.ranking_score - left.ranking_score ||
        left.asset.name.localeCompare(right.asset.name, "zh-CN"),
    );

  const selectedRoles = roleCoverage(selected);
  const uncoveredPriorityRoles = (PURPOSE_PRIORITY_ROLES[normalizedRequest.purpose] ?? []).filter(
    (role) => !selectedRoles.has(role),
  );

  const dedupedSelected = selected.map((item) => {
    const latestRanked = assetMap.get(item.asset.id);
    if (!latestRanked) {
      return item;
    }

    const reevaluated = computeSelectionScore(normalizedRequest, latestRanked, selected.filter((entry) => entry.asset.id !== item.asset.id));
    return buildSelectionItem(latestRanked, reevaluated);
  });

  return {
    profile: normalizedRequest,
    target_asset_count: targetAssetCount,
    selected: dedupedSelected,
    rejected,
    summary: {
      roles: [...selectedRoles].sort((left, right) => left.localeCompare(right, "en")),
      families: countFamilies(dedupedSelected),
      connected_pairs: countConnectedPairs(dedupedSelected),
      uncovered_priority_roles: uncoveredPriorityRoles,
    },
  };
}
