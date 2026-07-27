import { getCityProfile, getGenericCityProfile } from "./cityProfiles.js";
import { dedupePoiDrafts } from "./dedupe.js";
import type {
  BatchGenerationResult,
  BatchManifest,
  BudgetLevel,
  CandidatePoiSeed,
  DailyPlanItem,
  GeneratedContent,
  InspirationCard,
  PoiDraft,
  RequestGenerationResult,
  RequestInput,
  RouteTemplate,
  SeedRequest,
  StyleTag,
  TravelerType,
} from "./types.js";

export const STYLE_LABELS: Record<StyleTag, string> = {
  sea: "海边",
  food: "美食",
  photo: "拍照",
  history: "历史文化",
  museum: "博物馆",
  nature: "自然风景",
  shopping: "购物",
  nightlife: "夜生活",
  slow: "慢节奏",
  low_walk: "少走路",
};

export const TRAVELER_LABELS: Record<TravelerType, string> = {
  student_budget: "学生穷游",
  couple: "情侣出游",
  family_middle_age: "中年家庭出游",
  family_with_kids: "亲子出游",
  solo: "独自旅行",
  friends: "朋友结伴",
};

export const BUDGET_LABELS: Record<BudgetLevel, string> = {
  low: "低预算",
  medium: "中等预算",
  high: "高预算",
};

export function slugify(parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .replace(/-+/g, "-");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function includesStyle(request: SeedRequest, style: StyleTag): boolean {
  return request.styleTags.includes(style);
}

function getDailyPlaceRange(request: SeedRequest): { min: number; max: number; target: number } {
  const reducedPace = includesStyle(request, "slow") || includesStyle(request, "low_walk") || request.travelerType === "family_with_kids";

  let min = reducedPace ? 2 : 3;
  let max = reducedPace ? 4 : 5;
  let target = reducedPace ? 3 : 4;

  if (request.travelerType === "family_middle_age") {
    max = Math.min(max, 4);
    target = Math.min(target, 4);
  }

  if (includesStyle(request, "slow")) {
    target -= 1;
  }

  if (includesStyle(request, "low_walk")) {
    target -= 1;
  }

  if (request.travelerType === "family_with_kids") {
    target = Math.min(target, 3);
  }

  return {
    min,
    max,
    target: Math.min(max, Math.max(min, target)),
  };
}

function getCitySeeds(city: string): CandidatePoiSeed[] {
  const profile = getCityProfile(city) ?? getGenericCityProfile(city);
  return profile.recommendedPoiSeeds;
}

function scorePoi(seed: CandidatePoiSeed, request: SeedRequest): number {
  let score = 0;

  for (const tag of seed.tags) {
    if (request.styleTags.includes(tag)) {
      score += 3;
    }
  }

  if (request.travelerType === "student_budget" && (seed.tags.includes("food") || seed.tags.includes("low_walk"))) {
    score += 2;
  }

  if (request.travelerType === "couple" && (seed.tags.includes("photo") || seed.tags.includes("sea"))) {
    score += 2;
  }

  if (request.travelerType === "family_with_kids" && (seed.tags.includes("low_walk") || seed.tags.includes("nature"))) {
    score += 2;
  }

  if (request.budgetLevel === "low" && (seed.tags.includes("food") || seed.tags.includes("history"))) {
    score += 1;
  }

  if (includesStyle(request, "slow") && seed.tags.includes("slow")) {
    score += 2;
  }

  if (includesStyle(request, "food") && seed.tags.includes("food")) {
    score += 2;
  }

  if (includesStyle(request, "history") || includesStyle(request, "museum")) {
    if (seed.tags.includes("history") || seed.tags.includes("museum")) {
      score += 2;
    }
  }

  return score;
}

function selectPoisForCity(city: string, request: SeedRequest): CandidatePoiSeed[] {
  const scored = getCitySeeds(city)
    .map((seed) => ({ seed, score: scorePoi(seed, request) }))
    .sort((left, right) => right.score - left.score);

  const { target } = getDailyPlaceRange(request);
  const desiredCount = Math.min(6, Math.max(3, target + 2));
  const upperBound = Math.min(desiredCount, Math.max(3, scored.length));

  return scored.slice(0, upperBound).map((item) => item.seed);
}

function buildPoiDescription(seed: CandidatePoiSeed, request: SeedRequest): string {
  const audienceSentence = getAudienceSentence(request.travelerType);
  const paceSentence = getPaceSentence(request);
  return `${seed.descriptionSeed}${audienceSentence}${paceSentence}`;
}

function buildImageQuery(city: string, name: string, tags: string[]): string {
  return `${city} ${name} ${unique(tags).join(" ")} 旅行场景参考图`;
}

function getAudienceSentence(travelerType: TravelerType): string {
  switch (travelerType) {
    case "student_budget":
      return " 文案优先考虑公共交通衔接、低成本停留和小吃型补给。";
    case "couple":
      return " 文案强调氛围感、合照体验和傍晚停留价值。";
    case "family_middle_age":
      return " 文案强调节奏稳妥、停留舒适和路线连续性。";
    case "family_with_kids":
      return " 文案强调少折返、少暴走和适合亲子停留的节奏。";
    case "solo":
      return " 文案强调一个人也容易执行，路线轻量且可自由调节。";
    case "friends":
      return " 文案强调结伴游逛、分享体验和行程灵活度。";
  }
}

function getPaceSentence(request: SeedRequest): string {
  if (includesStyle(request, "slow")) {
    return " 本次草稿特意保留留白，避免从早到晚连续打卡。";
  }

  if (includesStyle(request, "low_walk")) {
    return " 本次草稿优先选择可集中游逛的片区，减少长距离步行。";
  }

  return " 本次草稿保持常规节奏，兼顾体验密度和转场负担。";
}

function canonicalizeRequest(request: SeedRequest): SeedRequest {
  return {
    ...request,
    destinations: request.destinations.map((city) => (getCityProfile(city) ?? getGenericCityProfile(city)).city),
    originCity: (getCityProfile(request.originCity) ?? getGenericCityProfile(request.originCity)).city,
  };
}

function buildPoiLibraryDraft(request: SeedRequest): PoiDraft[] {
  const drafts: PoiDraft[] = [];

  for (const city of request.destinations) {
    for (const seed of selectPoisForCity(city, request)) {
      const profile = getCityProfile(city) ?? getGenericCityProfile(city);
      const keywordTags = unique([
        ...(includesStyle(request, "food") ? profile.foodKeywords.slice(0, 1) : []),
        ...(includesStyle(request, "photo") || request.travelerType === "couple" ? profile.photoKeywords.slice(0, 1) : []),
        ...(includesStyle(request, "history") || includesStyle(request, "museum") ? profile.historyKeywords.slice(0, 1) : []),
        ...(includesStyle(request, "nature") ? profile.natureKeywords.slice(0, 1) : []),
        ...(includesStyle(request, "sea") ? profile.seaKeywords.slice(0, 1) : []),
      ]);
      drafts.push({
        name: seed.name,
        city,
        tags: unique([...seed.tags.map((tag) => STYLE_LABELS[tag]), ...seed.vibeTags, ...keywordTags]),
        description: buildPoiDescription(seed, request),
        recommendedDurationMinutes: seed.recommendedDurationMinutes,
        verificationStatus: "pending_poi_check",
        imageQuery: buildImageQuery(city, seed.name, [...seed.vibeTags, ...keywordTags]),
        imageStatus: "manual_review_required",
      });
    }
  }

  return drafts;
}

function allocateDays(destinations: string[], days: number): string[] {
  if (destinations.length === 0 || days <= 0) {
    return [];
  }

  if (days <= destinations.length) {
    return destinations.slice(0, days);
  }

  const result: string[] = [];
  const base = Math.floor(days / destinations.length);
  let remainder = days % destinations.length;

  for (const city of destinations) {
    const assignedDays = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    for (let index = 0; index < assignedDays; index += 1) {
      result.push(city);
    }
  }

  return result.slice(0, days);
}

function buildDayTheme(city: string, request: SeedRequest, dayIndex: number): string {
  const themeParts = request.styleTags
    .slice(dayIndex % Math.max(1, request.styleTags.length))
    .concat(request.styleTags.slice(0, dayIndex % Math.max(1, request.styleTags.length)))
    .slice(0, 2)
    .map((tag) => STYLE_LABELS[tag]);

  return `${city}${themeParts.length > 0 ? ` ${themeParts.join(" + ")}` : " 轻松游逛"}`;
}

function buildDayNotes(city: string, request: SeedRequest, places: string[]): string {
  const profile = getCityProfile(city) ?? getGenericCityProfile(city);
  const notes: string[] = [];

  if (request.travelerType === "student_budget") {
    notes.push("优先安排公共交通或步行可串联的片区，减少打车成本。");
  }

  if (request.travelerType === "couple" || includesStyle(request, "photo")) {
    notes.push("建议把光线更好的拍照点放在下午后段或日落前。");
  }

  if (includesStyle(request, "slow")) {
    notes.push("当天保留机动时间，可根据体力删减 1 个点。");
  }

  if (includesStyle(request, "low_walk") || request.travelerType === "family_with_kids") {
    notes.push("避免跨城内多次折返，尽量把停留点集中在同一区域。");
  }

  if (includesStyle(request, "food")) {
    notes.push("建议把补给点和主体验点放在同片区，减少为吃而反复转场。");
  }

  if (includesStyle(request, "sea")) {
    notes.push("海边或滨水段建议留在下午后段，兼顾体感和光线。");
  }

  if (includesStyle(request, "history") || includesStyle(request, "museum")) {
    notes.push("文化类地点建议搭配 1 到 2 个轻松点，避免全天信息密度过高。");
  }

  notes.push(profile.transitNotes[0] ?? `优先按 ${city} 的核心片区组织路线。`);

  if (request.budgetLevel === "low") {
    notes.push(profile.budgetNotes[0] ?? "低预算优先考虑公共交通、市场和步行片区。");
  }

  if (places.length <= 3) {
    notes.push(`本日围绕 ${city} 的单片区体验展开，节奏相对平稳。`);
  } else {
    notes.push(`本日以 ${city} 的代表性街区和景观点组合推进。`);
  }

  return notes.join("");
}

function buildRouteTemplate(request: SeedRequest, poiDrafts: PoiDraft[], requestKey: string): RouteTemplate {
  const { target, min, max } = getDailyPlaceRange(request);
  const cityByDay = allocateDays(request.destinations, request.days);
  const poisByCity = new Map<string, PoiDraft[]>();
  const cityOffsets = new Map<string, number>();

  for (const draft of poiDrafts) {
    const list = poisByCity.get(draft.city) ?? [];
    list.push(draft);
    poisByCity.set(draft.city, list);
  }

  const dailyPlan: DailyPlanItem[] = [];

  for (let index = 0; index < cityByDay.length; index += 1) {
    const city = cityByDay[index];
    const cityPois = poisByCity.get(city) ?? [];
    const start = cityOffsets.get(city) ?? 0;
    const dayTarget = Math.min(max, Math.max(min, target));
    const places = cityPois
      .slice(start, start + dayTarget)
      .map((draft) => draft.name);

    if (places.length < dayTarget) {
      const refill = cityPois
        .slice(0, dayTarget - places.length)
        .map((draft) => draft.name);
      places.push(...refill);
    }

    cityOffsets.set(city, start + dayTarget);

    dailyPlan.push({
      day: index + 1,
      theme: buildDayTheme(city, request, index),
      places: unique(places).slice(0, dayTarget),
      notes: buildDayNotes(city, request, places),
    });
  }

  const themeLabel = request.styleTags.slice(0, 3).map((tag) => STYLE_LABELS[tag]).join(" / ");
  const title = `${request.originCity}出发 ${request.days}天${themeLabel}行程草稿`;
  const id = slugify(["route", requestKey, ...request.destinations, String(request.days), request.travelerType, request.budgetLevel]);

  return {
    id,
    title,
    destinations: request.destinations,
    originCity: request.originCity,
    days: request.days,
    budgetLevel: request.budgetLevel,
    travelerType: request.travelerType,
    styleTags: request.styleTags,
    dailyPlan,
    seedPrompt: buildSeedPrompt(request),
  };
}

function getCardThemes(request: SeedRequest): string[] {
  const themes: string[] = [];

  if (includesStyle(request, "sea")) {
    themes.push("海边放松");
  }
  if (includesStyle(request, "food")) {
    themes.push("小吃漫游");
  }
  if (includesStyle(request, "history") || includesStyle(request, "museum")) {
    themes.push("城市文化");
  }
  if (includesStyle(request, "photo")) {
    themes.push("拍照氛围");
  }

  if (themes.length === 0) {
    themes.push("城市轻松探索");
  }

  return themes.slice(0, 3);
}

function buildCardDescription(city: string, theme: string, request: SeedRequest): string {
  const traveler = TRAVELER_LABELS[request.travelerType];
  const budget = BUDGET_LABELS[request.budgetLevel];
  const pace = includesStyle(request, "slow") ? "整体节奏偏松，适合边走边看。" : "路线强调效率和体验平衡。";
  return `以${city}为核心的${theme}内容草稿，面向${traveler}，定位${budget}。${pace}${getAudienceSentence(request.travelerType)}`;
}

function buildSeedPrompt(request: SeedRequest): string {
  return [
    `请基于目的地 ${request.destinations.join("、")}`,
    `出发地 ${request.originCity}`,
    `行程 ${request.days} 天`,
    `旅行人群 ${TRAVELER_LABELS[request.travelerType]}`,
    `预算 ${BUDGET_LABELS[request.budgetLevel]}`,
    `风格 ${request.styleTags.map((tag) => STYLE_LABELS[tag]).join("、")}`,
    "输出原创旅行内容草稿，不引用平台帖子，不使用外部图片。",
  ].join("；");
}

function buildInspirationCards(request: SeedRequest, routeTemplateId: string, requestKey: string): InspirationCard[] {
  const cards: InspirationCard[] = [];
  const themes = getCardThemes(request);

  for (const city of request.destinations) {
    for (const theme of themes) {
      const id = slugify(["card", requestKey, city, theme, request.travelerType, request.budgetLevel]);
      cards.push({
        id,
        title: `${city}${theme}${TRAVELER_LABELS[request.travelerType]}灵感卡`,
        destinations: [city],
        theme,
        travelerType: request.travelerType,
        budgetLevel: request.budgetLevel,
        description: buildCardDescription(city, theme, request),
        tags: unique([
          city,
          theme,
          TRAVELER_LABELS[request.travelerType],
          BUDGET_LABELS[request.budgetLevel],
          ...request.styleTags.map((tag) => STYLE_LABELS[tag]),
        ]),
        coverImageQuery: `${city} ${theme} 旅行封面场景`,
        coverImageStatus: "manual_review_required",
        seedPrompt: buildSeedPrompt(request),
        routeTemplateId,
      });
    }
  }

  if (request.destinations.length > 1) {
    cards.push({
      id: slugify(["card", requestKey, "combo", ...request.destinations, request.travelerType]),
      title: `${request.destinations.join(" + ")}联动内容灵感卡`,
      destinations: request.destinations,
      theme: "多城串联",
      travelerType: request.travelerType,
      budgetLevel: request.budgetLevel,
      description: `适合把${request.destinations.join("、")}组合成同一次旅行的内容入口，强调跨城节奏、主题连续性与故事感。`,
      tags: unique(["多城联动", ...request.destinations, ...request.styleTags.map((tag) => STYLE_LABELS[tag])]),
      coverImageQuery: `${request.destinations.join(" ")} 多城旅行联动封面`,
      coverImageStatus: "manual_review_required",
      seedPrompt: buildSeedPrompt(request),
      routeTemplateId,
    });
  }

  return cards;
}

function countPoisByCity(poiDrafts: PoiDraft[]): Record<string, number> {
  return poiDrafts.reduce<Record<string, number>>((counts, poi) => {
    counts[poi.city] = (counts[poi.city] ?? 0) + 1;
    return counts;
  }, {});
}

function collectRequestWarnings(request: SeedRequest, routeTemplate: RouteTemplate): string[] {
  const warnings: string[] = [];
  const placeCounts = routeTemplate.dailyPlan.map((day) => day.places.length);

  if (request.destinations.length > request.days) {
    warnings.push(`目的地 ${request.destinations.length} 个，但只有 ${request.days} 天，部分城市可能无法充分展开。`);
  }

  if (request.destinations.length > 1 && request.days <= request.destinations.length) {
    warnings.push("多城市行程天数偏紧，建议人工确认是否需要删减城市或减少每日目标。");
  }

  if (includesStyle(request, "low_walk") && placeCounts.some((count) => count > 4)) {
    warnings.push("标记了 low_walk，但仍存在单日地点偏多的情况。");
  }

  if (request.budgetLevel === "low" && request.destinations.length > 1) {
    warnings.push("低预算多城市路线可能会被跨城交通拉高成本。");
  }

  if (placeCounts.some((count) => count > 5)) {
    warnings.push("存在单日地点超过 5 个的情况，需要人工压缩节奏。");
  }

  return warnings;
}

export function generateRequestContent(input: RequestInput): RequestGenerationResult {
  const request = canonicalizeRequest(input.request);
  const rawPoiLibraryDraft = buildPoiLibraryDraft(request);
  const dedupedPoiResult = dedupePoiDrafts(rawPoiLibraryDraft);
  const routeTemplate = buildRouteTemplate(request, dedupedPoiResult.poiDrafts, input.requestKey);
  const inspirationCards = buildInspirationCards(request, routeTemplate.id, input.requestKey);
  const warnings = collectRequestWarnings(request, routeTemplate);

  if (dedupedPoiResult.summary.removedCount > 0) {
    warnings.push(`已在单请求内部去重 ${dedupedPoiResult.summary.removedCount} 个重复地点草稿。`);
  }

  return {
    sourceFile: input.sourceFile,
    requestKey: input.requestKey,
    request,
    content: {
      inspirationCards,
      routeTemplates: [routeTemplate],
      poiLibraryDraft: dedupedPoiResult.poiDrafts,
    },
    warnings,
    cityPoiCounts: countPoisByCity(dedupedPoiResult.poiDrafts),
  };
}

export function generateContent(request: SeedRequest, requestKey = "single"): GeneratedContent {
  const requestResult = generateRequestContent({
    sourceFile: "input/seed_request.example.json",
    requestKey,
    request,
  });

  return {
    inspirationCards: requestResult.content.inspirationCards,
    routeTemplates: requestResult.content.routeTemplates,
    poiLibraryDraft: requestResult.content.poiLibraryDraft,
  };
}

export function generateBatchContent(requestInputs: RequestInput[]): BatchGenerationResult {
  const requestResults = requestInputs.map((input) => generateRequestContent(input));
  const dedupedPoiResult = dedupePoiDrafts(requestResults.flatMap((result) => result.content.poiLibraryDraft));
  const warnings = unique([
    ...requestResults.flatMap((result) => result.warnings.map((warning) => `${result.sourceFile}: ${warning}`)),
    ...(dedupedPoiResult.summary.removedCount > 0 ? [`批量汇总阶段额外合并 ${dedupedPoiResult.summary.removedCount} 个重复地点草稿。`] : []),
  ]);
  const generatedAt = new Date().toISOString();

  const content: GeneratedContent = {
    inspirationCards: requestResults.flatMap((result) => result.content.inspirationCards),
    routeTemplates: requestResults.flatMap((result) => result.content.routeTemplates),
    poiLibraryDraft: dedupedPoiResult.poiDrafts,
  };

  const manifest: BatchManifest = {
    generatedAt,
    requestCount: requestResults.length,
    inspirationCardCount: content.inspirationCards.length,
    routeTemplateCount: content.routeTemplates.length,
    poiDraftCount: content.poiLibraryDraft.length,
    warnings,
    sourceFiles: requestResults.map((result) => result.sourceFile),
  };

  return {
    generatedAt,
    requestResults,
    content,
    manifest,
    warnings,
    dedupeSummary: dedupedPoiResult.summary,
  };
}
