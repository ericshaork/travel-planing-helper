import type {
  ExploreProductionRequest,
  ImageManifest,
  ImageManifestTask,
  PipelineExplorePlan,
} from "./types";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cityCode(city: string) {
  const slug = slugify(city);
  return slug || "city";
}

function travelerLabel(value: ExploreProductionRequest["travelerType"]) {
  const labels = {
    family: "家庭",
    couple: "情侣",
    student: "学生",
    solo: "独旅",
  };

  return labels[value];
}

function budgetNote(value: ExploreProductionRequest["budget"]) {
  if (value === "low") {
    return "按省一点的方式安排，把预算留给最值得的体验和一两顿有记忆点的饭。";
  }

  if (value === "high") {
    return "预算比较松，可以把住宿区域、晚餐和少量打车安排得舒服一点。";
  }

  return "中等预算适合平衡体验和转场，不必为了打卡把每天排得太满。";
}

function paceLabel(value: ExploreProductionRequest["pace"]) {
  if (value === "slow") return "慢节奏";
  if (value === "dense") return "紧凑";
  return "均衡";
}

function buildPoiName(city: string, index: number) {
  const names = [
    `${city}老城主街区`,
    `${city}城市地标`,
    `${city}在地生活街巷`,
    `${city}黄昏散步点`,
  ];

  return names[index] ?? `${city}路线节点`;
}

function buildFoodName(city: string, index: number) {
  const names = [
    `${city}本地小吃集中区`,
    `${city}晚餐烟火街`,
  ];

  return names[index] ?? `${city}在地风味`;
}

function buildPlanId(request: ExploreProductionRequest) {
  return `exp_${cityCode(request.city)}_${request.travelerType}_${request.days}d_${slugify(request.theme || request.motivation)}`;
}

export function generateMockExplorePlan(request: ExploreProductionRequest): PipelineExplorePlan {
  const code = cityCode(request.city);
  const id = buildPlanId(request);
  const title = `${request.city} ${request.days} 天${travelerLabel(request.travelerType)}${request.theme || "灵感"}路线`;
  const poiCount = Math.max(3, Math.min(4, request.days + 1));
  const foodCount = 2;
  const pois = Array.from({ length: poiCount }, (_, index) => ({
    id: `poi_${code}_${index + 1}`,
    name: buildPoiName(request.city, index),
    district: index % 2 === 0 ? "核心城区" : "生活街区",
    type: index === 1 ? "城市地标" : "街区体验",
    reason:
      index === 0
        ? "先用一个好理解的城市切口建立第一印象，适合自由行新手进入状态。"
        : "作为当天路线里的节奏节点，负责补充城市生活感和可执行的停留理由。",
    recommended_duration_minutes: index === 1 ? 150 : 90,
  }));
  const food = Array.from({ length: foodCount }, (_, index) => ({
    id: `food_${code}_${index + 1}`,
    name: buildFoodName(request.city, index),
    district: index === 0 ? "核心城区" : "夜间街区",
    category: index === 0 ? "local snacks" : "dinner street",
    reason:
      index === 0
        ? "这一站适合把当地味道拆成小份尝试，不容易踩到过重的正餐节奏。"
        : "适合放在一天结尾，让路线有一个舒服的收束点。",
  }));

  return {
    id,
    slug: slugify(id),
    title,
    summary: `面向${travelerLabel(request.travelerType)}的${request.city}${request.days}天${request.theme || request.motivation}路线，节奏偏${paceLabel(request.pace)}，先保证能照着走，再保留一点现场弹性。`,
    city: {
      code,
      name: request.city,
      region_name: request.city,
    },
    trip_type: request.travelerType,
    days: request.days,
    budget: {
      level: request.budget,
      note: budgetNote(request.budget),
    },
    pace: request.pace,
    tags: [
      request.theme,
      request.motivation,
      travelerLabel(request.travelerType),
      ...request.preferences,
    ].filter(Boolean),
    image_prompt: `${request.city} ${request.theme || "travel"} editorial travel cover for ${request.travelerType}, real city texture, approachable journal mood`,
    daily_itinerary: Array.from({ length: request.days }, (_, index) => {
      const poi = pois[index % pois.length];
      const nextPoi = pois[(index + 1) % pois.length];
      const foodStop = food[index % food.length];

      return {
        day: index + 1,
        title: `第 ${index + 1} 天：${index === 0 ? "先进入城市" : "把路线走得更松一点"}`,
        summary:
          index === 0
            ? "第一天不要急着塞满，先用主街区和地标建立方向感。"
            : "这一天把街区、吃饭和傍晚收尾串起来，减少来回折腾。",
        activities: [
          {
            time_block: "morning" as const,
            description: `上午从${poi.name}开始，先看城市最容易理解的一面。`,
            poi_refs: [poi.id],
            food_refs: [],
          },
          {
            time_block: "afternoon" as const,
            description: `下午转到${nextPoi.name}，中间留出交通和休息时间。`,
            poi_refs: [nextPoi.id],
            food_refs: [],
          },
          {
            time_block: "evening" as const,
            description: `晚上把节奏收在${foodStop.name}，吃完可以按体力决定是否继续散步。`,
            poi_refs: [],
            food_refs: [foodStop.id],
          },
        ],
      };
    }),
    pois,
    food,
  };
}

function buildTask(options: {
  assetId: string;
  assetName: string;
  imageSlot: ImageManifestTask["image_slot"];
  type: ImageManifestTask["type"];
  city: string;
  prompt: string;
  usage: ImageManifestTask["image_usage_profile"];
  sourcePreference: ImageManifestTask["source_preference"];
  generationMode: ImageManifestTask["generation_mode"];
  district?: string;
}): ImageManifestTask {
  return {
    asset_instance_id: `${options.assetId}_${options.imageSlot}`,
    asset_id: options.assetId,
    asset_name: options.assetName,
    image_slot: options.imageSlot,
    type: options.type,
    source_preference: options.sourcePreference,
    generation_mode: options.generationMode,
    decision_reason:
      options.usage === "cover"
        ? "Explore cover needs both city recognition and editorial quality."
        : "Guide-support image should prioritize real place or food evidence.",
    prompt: options.prompt,
    location_context: {
      city: options.city,
      district: options.district ?? "N/A",
      poi: options.assetName,
      keywords: [
        `${options.assetName} ${options.city}`,
        `${options.city} travel photo`,
      ],
    },
    search_keywords: [
      `${options.assetName} ${options.city}`,
      `${options.city} ${options.assetName} travel`,
      options.prompt,
    ],
    visual_subject: {
      main_subject: options.assetName,
      secondary_elements: ["travelers", "street texture", "natural light"],
    },
    image_usage_profile: options.usage,
    review_requirement: {
      required: options.usage === "cover" || options.usage === "food",
      reason:
        options.usage === "cover"
          ? "Cover image must be checked before publishing."
          : "Food and place support images should be checked for relevance.",
    },
    status: "pending",
  };
}

export function buildImageManifestFromPlan(plan: PipelineExplorePlan): ImageManifest {
  const cover = buildTask({
    assetId: `${plan.city.code}_cover`,
    assetName: `${plan.city.name} ${plan.trip_type} cover`,
    imageSlot: "explore_cover",
    type: "hero",
    city: plan.city.name,
    prompt: plan.image_prompt,
    usage: "cover",
    sourcePreference: "mixed",
    generationMode: "hybrid",
  });

  const poiTasks = plan.pois.slice(0, 4).map((poi) =>
    buildTask({
      assetId: poi.id,
      assetName: poi.name,
      imageSlot: "poi_gallery",
      type: "experience",
      city: plan.city.name,
      prompt: `${poi.name} ${plan.city.name} real travel scene`,
      usage: "place",
      sourcePreference: "real_first",
      generationMode: "real_photo",
      district: poi.district,
    }),
  );

  const foodTasks = plan.food.slice(0, 2).map((food) =>
    buildTask({
      assetId: food.id,
      assetName: food.name,
      imageSlot: "food_gallery",
      type: "food",
      city: plan.city.name,
      prompt: `${food.name} ${plan.city.name} local food scene`,
      usage: "food",
      sourcePreference: "real_first",
      generationMode: "real_photo",
      district: food.district,
    }),
  );

  return {
    trip_id: plan.id,
    city: plan.city.code,
    images: [cover, ...poiTasks, ...foodTasks],
  };
}

