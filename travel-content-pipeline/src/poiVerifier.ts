import { getCityProfile } from "./cityProfiles.js";
import { normalizePoiName } from "./dedupe.js";
import type {
  CheckedPoi,
  Coordinates,
  PoiCandidate,
  PoiDraft,
  PoiVerificationSummary,
  VerificationStatus,
} from "./types.js";

const GENERIC_AMBIGUOUS_NAMES = new Set([
  "老街",
  "小吃街",
  "夜市",
  "海边",
  "公园",
  "博物馆",
  "市中心",
  "商圈",
  "码头",
  "古城",
  "环岛路",
]);

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function stableHash(input: string): number {
  let hash = 2166136261;

  for (const character of input) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function buildDeterministicCoordinates(city: string, normalizedName: string, candidateIndex = 0): Coordinates {
  const profile = getCityProfile(city);
  const baseCoordinates = profile?.baseCoordinates ?? { lng: 120, lat: 30 };
  const hash = stableHash(`${city}:${normalizedName}:${candidateIndex}`);
  const lngOffset = ((hash % 1600) - 800) / 100000;
  const latOffset = (((Math.floor(hash / 1600) % 1600) - 800) / 100000);

  return {
    lng: Number((baseCoordinates.lng + lngOffset).toFixed(6)),
    lat: Number((baseCoordinates.lat + latOffset).toFixed(6)),
  };
}

function buildProviderPoiId(city: string, normalizedName: string, index = 0): string {
  return `mock:${city}:${normalizedName}${index > 0 ? `:${index}` : ""}`;
}

function buildMockAddress(city: string, name: string, index = 0): string {
  const profile = getCityProfile(city);
  const coreArea = profile?.coreAreas[index % Math.max(1, profile.coreAreas.length)] ?? `${city}核心片区`;
  return `${city}${coreArea}${name}附近`;
}

function computeSeedScore(draftName: string, seedName: string, city: string): number {
  const normalizedDraft = normalizePoiName(city, draftName);
  const normalizedSeed = normalizePoiName(city, seedName);

  if (normalizedDraft === normalizedSeed) {
    return 100;
  }

  if (normalizedDraft.includes(normalizedSeed) || normalizedSeed.includes(normalizedDraft)) {
    return 80;
  }

  let overlap = 0;
  for (const character of normalizedDraft) {
    if (normalizedSeed.includes(character)) {
      overlap += 1;
    }
  }

  if (overlap >= 2) {
    return 40 + overlap;
  }

  return 0;
}

function buildCandidateFromSeed(city: string, draftName: string, seedName: string, reason: string, index = 0): PoiCandidate {
  const normalizedName = normalizePoiName(city, seedName);
  const confidence = clamp(0.62 + ((stableHash(`${city}:${seedName}:${index}`) % 25) / 100), 0.6, 0.9);

  return {
    provider: "mock",
    providerPoiId: buildProviderPoiId(city, normalizedName, index),
    name: seedName,
    city,
    address: buildMockAddress(city, seedName, index),
    coordinates: buildDeterministicCoordinates(city, normalizedName, index),
    confidence: Number(confidence.toFixed(2)),
    reason: `${reason}，与输入地点 "${draftName}" 可能相关。`,
  };
}

function buildAmbiguousCandidates(city: string, draftName: string): PoiCandidate[] {
  const profile = getCityProfile(city);
  if (!profile) {
    return [];
  }

  const normalizedDraft = normalizePoiName(city, draftName);
  const rankedSeeds = profile.recommendedPoiSeeds
    .map((seed) => ({
      seed,
      score: computeSeedScore(draftName, seed.name, city),
    }))
    .sort((left, right) => right.score - left.score || left.seed.name.localeCompare(right.seed.name, "zh-CN"))
    .map((entry) => entry.seed.name);

  const candidateNames = unique(
    [
      ...rankedSeeds.slice(0, 3),
      ...profile.recommendedPoiSeeds
        .filter((seed) => seed.tags.some((tag) => normalizedDraft.includes("海") ? tag === "sea" : tag === "food" || tag === "history"))
        .map((seed) => seed.name)
        .slice(0, 3),
    ].filter(Boolean),
  ).slice(0, 3);

  const finalNames = candidateNames.length >= 2 ? candidateNames : profile.recommendedPoiSeeds.slice(0, 2).map((seed) => seed.name);

  return finalNames.map((candidateName, index) =>
    buildCandidateFromSeed(city, draftName, candidateName, "名称较泛或可能对应多个具体地点", index),
  );
}

function isGenericAmbiguousName(city: string, name: string): boolean {
  const normalized = normalizePoiName(city, name);
  return GENERIC_AMBIGUOUS_NAMES.has(normalized);
}

function verifySinglePoi(draft: PoiDraft): CheckedPoi {
  const profile = getCityProfile(draft.city);

  if (!profile) {
    return {
      ...draft,
      verificationStatus: "not_found",
      reviewNote: `城市 ${draft.city} 暂无内置模板，本轮 Mock Verifier 无法给出可靠候选，建议人工改名、补城市模板或留待 v0.3B 真正 Provider。`,
    };
  }

  const normalizedDraftName = normalizePoiName(draft.city, draft.name);
  const scoredSeeds = profile.recommendedPoiSeeds
    .map((seed) => ({
      seed,
      normalizedSeedName: normalizePoiName(draft.city, seed.name),
      score: computeSeedScore(draft.name, seed.name, draft.city),
    }))
    .sort((left, right) => right.score - left.score || left.seed.name.localeCompare(right.seed.name, "zh-CN"));

  const topMatch = scoredSeeds[0];
  const secondMatch = scoredSeeds[1];

  if (isGenericAmbiguousName(draft.city, draft.name) && (!topMatch || topMatch.score < 100)) {
    const matchedCandidates = buildAmbiguousCandidates(draft.city, draft.name);
    return {
      ...draft,
      verificationStatus: "ambiguous",
      confidence: 0.55,
      matchedCandidates,
      reviewNote: "名称过于泛化，Mock Verifier 认为同城可能对应多个具体地点，需要人工选择更明确的标准地点。",
    };
  }

  if (topMatch && topMatch.score >= 100) {
    const confidence = Number((0.9 + ((stableHash(`${draft.city}:${topMatch.seed.name}`) % 5) / 100)).toFixed(2));
    return {
      ...draft,
      verificationStatus: "matched",
      canonicalName: topMatch.seed.name,
      provider: "mock",
      providerPoiId: buildProviderPoiId(draft.city, topMatch.normalizedSeedName),
      address: buildMockAddress(draft.city, topMatch.seed.name),
      coordinates: buildDeterministicCoordinates(draft.city, topMatch.normalizedSeedName),
      confidence,
      reviewNote: "通过本地城市模板完成高一致度匹配，名称与候选点高度一致，可作为后续真实 POI Provider 的预匹配结果。",
    };
  }

  if (topMatch && topMatch.score >= 80 && secondMatch && secondMatch.score >= 40) {
    return {
      ...draft,
      verificationStatus: "ambiguous",
      confidence: 0.64,
      matchedCandidates: [
        buildCandidateFromSeed(draft.city, draft.name, topMatch.seed.name, "高相似候选", 0),
        buildCandidateFromSeed(draft.city, draft.name, secondMatch.seed.name, "存在第二候选，需要人工确认", 1),
      ],
      reviewNote: "名称与模板存在较高相似度，但仍有多个潜在候选，建议人工选择具体标准地点。",
    };
  }

  if (topMatch && topMatch.score >= 80) {
    const confidence = Number((0.75 + ((stableHash(`${draft.city}:${topMatch.seed.name}`) % 15) / 100)).toFixed(2));
    return {
      ...draft,
      verificationStatus: "matched",
      canonicalName: topMatch.seed.name,
      provider: "mock",
      providerPoiId: buildProviderPoiId(draft.city, topMatch.normalizedSeedName),
      address: buildMockAddress(draft.city, topMatch.seed.name),
      coordinates: buildDeterministicCoordinates(draft.city, topMatch.normalizedSeedName),
      confidence,
      reviewNote: "通过名称包含关系完成本地 Mock 匹配，建议在 v0.3B 使用真实 POI Provider 再次确认。",
    };
  }

  if (topMatch && topMatch.score >= 40) {
    const matchedCandidates = buildAmbiguousCandidates(draft.city, draft.name);
    return {
      ...draft,
      verificationStatus: "ambiguous",
      confidence: 0.58,
      matchedCandidates,
      reviewNote: "名称与城市模板存在局部相似，但无法唯一确定标准 POI，需要人工确认或重命名。",
    };
  }

  if (normalizedDraftName.length <= 2 || /^[0-9a-z]+$/i.test(normalizedDraftName)) {
    return {
      ...draft,
      verificationStatus: "not_found",
      reviewNote: "地点名称过短或不像可识别 POI，建议人工改成更具体的地点名后再校验。",
    };
  }

  return {
    ...draft,
    verificationStatus: "not_found",
    reviewNote: "当前城市模板中未找到合理候选，建议人工改名、删除，或在下一阶段接入真实高德 POI Provider 再校验。",
  };
}

export function verifyPoiDraftsWithMock(pois: PoiDraft[]): CheckedPoi[] {
  return pois.map((poi) => verifySinglePoi(poi));
}

export function buildPoiVerificationSummary(checkedPois: CheckedPoi[]): PoiVerificationSummary {
  const summary: PoiVerificationSummary = {
    total: checkedPois.length,
    matched: 0,
    ambiguous: 0,
    notFound: 0,
    pending: 0,
    byCity: {},
    warnings: [],
  };

  for (const poi of checkedPois) {
    if (!summary.byCity[poi.city]) {
      summary.byCity[poi.city] = {
        total: 0,
        matched: 0,
        ambiguous: 0,
        notFound: 0,
        pending: 0,
      };
    }

    summary.byCity[poi.city].total += 1;

    switch (poi.verificationStatus as VerificationStatus) {
      case "matched":
        summary.matched += 1;
        summary.byCity[poi.city].matched += 1;
        break;
      case "ambiguous":
        summary.ambiguous += 1;
        summary.byCity[poi.city].ambiguous += 1;
        break;
      case "not_found":
        summary.notFound += 1;
        summary.byCity[poi.city].notFound += 1;
        break;
      case "pending_poi_check":
        summary.pending += 1;
        summary.byCity[poi.city].pending += 1;
        summary.warnings.push(`${poi.city} - ${poi.name}: 仍处于 pending_poi_check，说明输入或校验逻辑存在异常。`);
        break;
    }
  }

  return summary;
}

export function buildPoiVerificationReport(checkedPois: CheckedPoi[], summary: PoiVerificationSummary): string {
  const ambiguousPois = checkedPois.filter((poi) => poi.verificationStatus === "ambiguous");
  const notFoundPois = checkedPois.filter((poi) => poi.verificationStatus === "not_found");
  const needsManualReview = checkedPois.filter((poi) => poi.verificationStatus !== "matched");
  const cityLines = Object.entries(summary.byCity)
    .sort((left, right) => left[0].localeCompare(right[0], "zh-CN"))
    .map(
      ([city, citySummary]) =>
        `- ${city}: total=${citySummary.total}, matched=${citySummary.matched}, ambiguous=${citySummary.ambiguous}, not_found=${citySummary.notFound}, pending=${citySummary.pending}`,
    )
    .join("\n");

  const ambiguousLines =
    ambiguousPois.length > 0
      ? ambiguousPois
          .map((poi) => `- ${poi.city} - ${poi.name}: ${(poi.matchedCandidates ?? []).map((candidate) => candidate.name).join(" / ")}；${poi.reviewNote ?? "需要人工确认。"}`)
          .join("\n")
      : "- 当前没有 ambiguous 条目。";

  const notFoundLines =
    notFoundPois.length > 0
      ? notFoundPois.map((poi) => `- ${poi.city} - ${poi.name}: ${poi.reviewNote ?? "未找到候选。"} `).join("\n")
      : "- 当前没有 not_found 条目。";

  const manualLines =
    needsManualReview.length > 0
      ? needsManualReview.map((poi) => `- ${poi.city} - ${poi.name}: ${poi.verificationStatus}`).join("\n")
      : "- 当前所有地点都已进入 matched。";

  return `# POI Mock 校验报告

## 总览

- 总 POI 数：${summary.total}
- matched 数：${summary.matched}
- ambiguous 数：${summary.ambiguous}
- not_found 数：${summary.notFound}
- pending 数：${summary.pending}

## 各城市统计

${cityLines}

## ambiguous 列表

${ambiguousLines}

## not_found 列表

${notFoundLines}

## 需要人工处理的地点

${manualLines}

## 下一阶段建议

- v0.3A 当前使用的是本地 Mock Verifier，只用于状态流转和审核链路演练。
- 当前坐标为稳定 mock 坐标，不是正式上线坐标，不能直接用于地图展示或导航。
- v0.3B 再接真实高德 POI Provider 时，可复用当前的 \`matched / ambiguous / not_found\` 状态流转。
- ambiguous 条目建议优先人工改成更具体的地点名，再进入真实 Provider。
- not_found 条目建议人工删除、重命名，或补充城市模板后重跑。

## 说明

- 本轮没有接入真实高德 API。
- 本轮没有联网、没有接数据库、没有接图片 API。
- 本轮没有下载图片，也没有抓取任何平台内容。
`;
}
