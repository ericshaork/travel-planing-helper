import type {
  CityStrategyContext,
  ContentContext,
  GenerationGuidance,
  MapContext,
  QualityContext,
  RelevantDistrict,
  RelevantFoodKnowledge,
  RelevantPoi,
  RequestContext,
} from "./types.js";

export interface SelectContextRequest {
  city: string;
  traveler_type: string;
  days: number;
  season: string;
  budget: string;
  pace: string;
  motivation: string;
  theme: string;
}

export interface SelectedContextModules {
  selected_content_context: ContentContext;
  selected_city_strategy_context: CityStrategyContext;
  selected_generation_guidance: GenerationGuidance;
  selected_map_context: MapContext;
  selected_quality_context: QualityContext;
}

interface CandidateProfile {
  traveler_types?: string[];
  motivations?: string[];
  seasons?: string[];
  theme_keywords?: string[];
  budgets?: string[];
  paces?: string[];
  min_days?: number;
  max_days?: number;
  memory_value?: number;
  city_signature_value?: number;
  transfer_burden_penalty?: number;
  repetition_risk_penalty?: number;
  mismatch_penalty?: number;
}

interface TaggedCandidate<T> {
  id: string;
  value: T;
  profile: CandidateProfile;
}

const beijingCityPersonality: ContentContext["city_personality"] = {
  one_line_summary: "北京最适合被组织成层次分明的首都旅行线：既有皇城尺度，也有胡同纹理、食物记忆和新旧对比，而不是一份泛泛的景点清单。",
  explore_strengths: [
    "厚重历史感很强的城市经典路线",
    "胡同与湖边氛围兼具的城市漫步",
    "适合按片区组织的高质量 citywalk",
    "老北京与现代北京形成鲜明对照的多日路线",
    "随片区与时段变化的食物节奏",
  ],
  signature_contrasts: [
    "皇城秩序感与日常胡同生活的对照",
    "正式庄严的首都地标与松弛的街区漫游之间的切换",
    "传统北京味道与现代城市餐饮之间的反差",
    "宏大首都尺度与亲密街区纹理并存",
  ],
  avoid_generic_framing: [
    "不要把北京缩减成只有著名地标的打卡城市。",
    "不要让所有人群都走同一种老城开场和同一种夜晚收尾。",
    "不要只写空泛的文化赞美，而没有片区纹理。",
    "不要把现代北京写成任何大城市都可以替代的样子。",
  ],
};

const districtCandidates: Array<TaggedCandidate<RelevantDistrict>> = [
  {
    id: "district_imperial_core",
    value: {
      id: "district_imperial_core",
      name: "皇城核心区",
      city_role: "首都历史感最强的主锚区，适合承担第一次到北京的标志性开场。",
      signature_experiences: ["皇城中轴游览", "建立首都仪式感", "重历史之后的视角释放"],
      mobility_notes: [
        "适合作为一天中的主锚点，不要和多个重体力景点堆叠。",
        "上午进入比下午临时插入更稳。",
        "与景山组合时，应明确体力消耗和步行负担。",
      ],
    },
    profile: {
      traveler_types: ["couple", "family", "parents"],
      motivations: ["首次到访"],
      seasons: ["autumn", "spring", "winter"],
      theme_keywords: ["首次北京印象", "首都", "情侣氛围"],
      memory_value: 2,
      city_signature_value: 3,
    },
  },
  {
    id: "district_hutong_shichahai",
    value: {
      id: "district_hutong_shichahai",
      name: "胡同 / 什刹海",
      city_role: "负责把路线从宏大感过渡到街区氛围与城市生活纹理的柔化片区。",
      signature_experiences: ["湖边散步", "胡同慢行", "黄昏拍照", "晚餐收尾"],
      mobility_notes: [
        "适合做半日片区，不适合作为匆忙路过点。",
        "步行体验好，但总步行距离容易被低估。",
        "黄昏和夜晚价值高于中午强行经过。",
      ],
    },
    profile: {
      traveler_types: ["couple", "solo"],
      motivations: ["首次到访", "深度探索"],
      seasons: ["autumn", "spring"],
      theme_keywords: ["情侣氛围", "街区纹理", "慢行"],
      memory_value: 3,
      city_signature_value: 2,
    },
  },
  {
    id: "district_qianmen_dashilar",
    value: {
      id: "district_qianmen_dashilar",
      name: "前门 / 大栅栏",
      city_role: "老城商业与食物纹理很强的过渡区，适合补足北京味和街巷感。",
      signature_experiences: ["老街纹理", "老北京小吃", "侧巷漫步", "咖啡与书店停顿"],
      mobility_notes: [
        "适合接在天坛或老城主线之后。",
        "主街人流较多，侧巷更有价值。",
        "不宜作为纯购物填充点。",
      ],
    },
    profile: {
      traveler_types: ["couple", "student"],
      motivations: ["首次到访", "美食探索"],
      seasons: ["autumn", "winter"],
      theme_keywords: ["北京味道", "高性价比"],
      memory_value: 2,
      city_signature_value: 2,
    },
  },
  {
    id: "district_south_city_niujie",
    value: {
      id: "district_south_city_niujie",
      name: "南城 / 牛街",
      city_role: "承担冬季暖胃与高性价比饮食密度的南城片区，适合把吃作为路线主轴。",
      signature_experiences: ["清真小吃连吃", "铜锅涮肉", "早餐开场", "地铁可达的高密度吃法"],
      mobility_notes: [
        "适合围绕吃的节奏安排半日片区。",
        "冬季价值高，暖胃型餐饮比景点填充更重要。",
        "优先用地铁连接，不建议为了网红店跨城折返。",
      ],
    },
    profile: {
      traveler_types: ["student"],
      motivations: ["美食探索"],
      seasons: ["winter"],
      theme_keywords: ["美食", "高性价比", "冬季"],
      budgets: ["low", "medium"],
      memory_value: 2,
      city_signature_value: 1,
    },
  },
  {
    id: "district_gulou_nanluo",
    value: {
      id: "district_gulou_nanluo",
      name: "鼓楼 / 南锣周边",
      city_role: "兼顾年轻人活力与街区细节的中心片区，适合学生与 solo 的轻松观察型路线。",
      signature_experiences: ["早餐开场", "小巷穿行", "咖啡馆停顿", "书店或买手店观察"],
      mobility_notes: [
        "适合做轻体力半日路线。",
        "热门主街容易拥挤，支巷与背街更有内容。",
        "可作为学生和 solo 路线中的自由停顿区。",
      ],
    },
    profile: {
      traveler_types: ["student", "solo"],
      motivations: ["美食探索", "深度探索"],
      seasons: ["winter", "spring", "autumn"],
      theme_keywords: ["高性价比", "慢行", "纹理"],
      memory_value: 2,
      city_signature_value: 1,
    },
  },
  {
    id: "district_798_liangmahe",
    value: {
      id: "district_798_liangmahe",
      name: "798 / 亮马河",
      city_role: "提供现代北京与开放观察感的片区，适合一个人的轻松延展和影像化收束。",
      signature_experiences: ["看展或看店", "咖啡馆停顿", "现代城市观察", "自由结束当天"],
      mobility_notes: [
        "更适合 solo 的自由节奏，不需要强行排满。",
        "适合和街区慢行形成新旧对比。",
        "如果当天已经高密度步行，不宜再加太多站点。",
      ],
    },
    profile: {
      traveler_types: ["solo"],
      motivations: ["深度探索"],
      seasons: ["spring", "autumn"],
      theme_keywords: ["一个人", "慢行", "观察", "街区纹理"],
      memory_value: 2,
      city_signature_value: 1,
    },
  },
];

const poiCandidates: Array<TaggedCandidate<RelevantPoi>> = [
  {
    id: "poi_forbidden_city",
    value: {
      id: "poi_forbidden_city",
      name: "故宫主线参观",
      district_id: "district_imperial_core",
      description: "只有在路线确实需要北京最高识别度历史锚点时，才应使用故宫作为主轴开场。",
      recommended_duration_minutes: 210,
      route_roles: ["主锚点", "首日开场"],
      risks: [
        "容易在北京计划中被过度重复使用。",
        "参观时间长，后续不宜再叠加多个重体力景点。",
        "如果路线主题偏街区纹理，不应默认使用故宫。",
      ],
    },
    profile: {
      traveler_types: ["couple", "family", "parents"],
      motivations: ["首次到访"],
      seasons: ["autumn", "spring", "winter"],
      theme_keywords: ["首次北京印象", "首都"],
      memory_value: 3,
      city_signature_value: 3,
      repetition_risk_penalty: 1,
    },
  },
  {
    id: "poi_jingshan",
    value: {
      id: "poi_jingshan",
      name: "景山公园制高点",
      district_id: "district_imperial_core",
      description: "适合在重历史片段之后提供视角释放和照片价值的紧凑型观景点。",
      recommended_duration_minutes: 75,
      route_roles: ["视角释放", "黄昏过渡"],
      risks: [
        "如果每条老城路线都自动搭配景山，会变得公式化。",
        "登高会增加体力消耗，需要控制当天密度。",
      ],
    },
    profile: {
      traveler_types: ["couple"],
      motivations: ["首次到访"],
      seasons: ["autumn", "spring"],
      theme_keywords: ["情侣氛围", "黄昏"],
      memory_value: 2,
      city_signature_value: 2,
    },
  },
  {
    id: "poi_shichahai_lakeside",
    value: {
      id: "poi_shichahai_lakeside",
      name: "什刹海湖边步行段",
      district_id: "district_hutong_shichahai",
      description: "适合承担黄昏氛围、城市慢行和关系感收束的湖边步行段。",
      recommended_duration_minutes: 90,
      route_roles: ["黄昏氛围", "晚间收尾"],
      risks: [
        "如果只走主湖边，不进入胡同纹理，会显得普通。",
        "高峰时段人流较多，会削弱松弛感。",
      ],
    },
    profile: {
      traveler_types: ["couple", "solo"],
      motivations: ["首次到访", "深度探索"],
      seasons: ["autumn", "spring"],
      theme_keywords: ["情侣氛围", "慢行", "纹理"],
      memory_value: 3,
      city_signature_value: 2,
    },
  },
  {
    id: "poi_niujie",
    value: {
      id: "poi_niujie",
      name: "牛街清真美食主轴",
      district_id: "district_south_city_niujie",
      description: "适合把吃本身变成路线主轴，而不是在景点之间插入一顿饭。",
      recommended_duration_minutes: 150,
      route_roles: ["餐饮主锚点", "冬季暖胃主场"],
      risks: [
        "如果只停留一顿饭，会浪费牛街的片区价值。",
        "不适合再叠加高价精致餐厅，容易削弱学生路线的性价比。",
      ],
    },
    profile: {
      traveler_types: ["student"],
      motivations: ["美食探索"],
      seasons: ["winter"],
      theme_keywords: ["美食", "高性价比", "冬季"],
      budgets: ["low", "medium"],
      memory_value: 2,
      city_signature_value: 1,
    },
  },
  {
    id: "poi_dashilar_side_streets",
    value: {
      id: "poi_dashilar_side_streets",
      name: "大栅栏侧巷与老街纹理",
      district_id: "district_qianmen_dashilar",
      description: "适合用侧巷、老铺和轻停顿把老城纹理具体化，而不是只看主街人流。",
      recommended_duration_minutes: 120,
      route_roles: ["老城纹理", "轻停顿场景"],
      risks: [
        "如果只走主街，会变成普通游客流线。",
        "高峰时段体验容易被稀释，最好和食物节奏一起安排。",
      ],
    },
    profile: {
      traveler_types: ["couple", "student"],
      motivations: ["首次到访", "美食探索"],
      seasons: ["autumn", "winter"],
      theme_keywords: ["北京味道", "高性价比"],
      memory_value: 2,
      city_signature_value: 2,
    },
  },
  {
    id: "poi_gulou_nanluo_walk",
    value: {
      id: "poi_gulou_nanluo_walk",
      name: "鼓楼到南锣的街区慢行",
      district_id: "district_gulou_nanluo",
      description: "适合观察年轻人日常、巷子细节和自由停顿，是学生与 solo 的自然步行段。",
      recommended_duration_minutes: 120,
      route_roles: ["街区纹理", "自由停顿"],
      risks: [
        "如果完全照着主街走，会失去观察型路线价值。",
        "热门时段拥挤，需要允许临时转入支巷。",
      ],
    },
    profile: {
      traveler_types: ["student", "solo"],
      motivations: ["美食探索", "深度探索"],
      seasons: ["winter", "spring", "autumn"],
      theme_keywords: ["慢行", "纹理", "一个人"],
      memory_value: 2,
      city_signature_value: 1,
    },
  },
  {
    id: "poi_798_art",
    value: {
      id: "poi_798_art",
      name: "798 看展与自由停顿",
      district_id: "district_798_liangmahe",
      description: "适合一个人把观察、咖啡和看展放在同一片区，不需要强行追求效率。",
      recommended_duration_minutes: 150,
      route_roles: ["观察型停留", "现代北京对照"],
      risks: [
        "不适合压缩成短打卡段，否则只剩下背景板。",
        "如果当天已高密度移动，不宜再叠加远距离晚餐。",
      ],
    },
    profile: {
      traveler_types: ["solo"],
      motivations: ["深度探索"],
      seasons: ["spring", "autumn"],
      theme_keywords: ["一个人", "观察", "慢行"],
      memory_value: 2,
      city_signature_value: 1,
    },
  },
];

const foodCandidates: Array<TaggedCandidate<RelevantFoodKnowledge>> = [
  {
    id: "food_dashilar_bakery_cafe_mix",
    value: {
      id: "food_dashilar_bakery_cafe_mix",
      name: "大栅栏侧巷烘焙与咖啡停顿",
      district_id: "district_qianmen_dashilar",
      recommended_foods: ["手冲咖啡", "烘焙点心", "小型甜品"],
      dining_scenarios: ["下午休息", "老城慢行中的节奏停顿", "轻量约会感补充"],
      route_roles: ["节奏缓冲", "老城质感补充"],
      note: "当路线需要比纯小吃更有编辑感的老城纹理时，这类咖啡和烘焙停顿会很有价值。",
    },
    profile: {
      traveler_types: ["couple"],
      motivations: ["首次到访"],
      seasons: ["autumn", "spring"],
      theme_keywords: ["情侣氛围", "慢行"],
      memory_value: 1,
    },
  },
  {
    id: "food_shichahai_hutong_dinner",
    value: {
      id: "food_shichahai_hutong_dinner",
      name: "什刹海胡同晚餐",
      district_id: "district_hutong_shichahai",
      recommended_foods: ["北京家常菜", "胡同小吃", "氛围型晚餐"],
      dining_scenarios: ["城市漫步后的晚餐", "情侣晚间收尾", "轻松聊天场景"],
      route_roles: ["晚餐主锚点", "情绪收尾"],
      note: "只有当路线真正留出了在片区停留的时间，它才会成为有价值的晚餐收尾，而不是匆忙路过时的随便吃一顿。",
    },
    profile: {
      traveler_types: ["couple"],
      motivations: ["首次到访"],
      seasons: ["autumn", "spring"],
      theme_keywords: ["情侣氛围", "收尾"],
      memory_value: 3,
    },
  },
  {
    id: "food_niujie_breakfast",
    value: {
      id: "food_niujie_breakfast",
      name: "牛街早餐开场",
      district_id: "district_south_city_niujie",
      recommended_foods: ["烧饼夹肉", "豆腐脑", "糖火烧"],
      dining_scenarios: ["冬天早晨", "学生路线开场", "一早就建立北京味道"],
      route_roles: ["早餐主锚点", "低预算高满足"],
      note: "牛街的早餐适合把一天直接拉进城市生活，而不是先去景点再想吃什么。",
    },
    profile: {
      traveler_types: ["student"],
      motivations: ["美食探索"],
      seasons: ["winter"],
      budgets: ["low", "medium"],
      theme_keywords: ["冬季", "高性价比", "美食"],
      memory_value: 2,
    },
  },
  {
    id: "food_niujie_hotpot",
    value: {
      id: "food_niujie_hotpot",
      name: "牛街铜锅涮肉",
      district_id: "district_south_city_niujie",
      recommended_foods: ["铜锅涮肉", "麻酱小料", "烧饼或糖蒜"],
      dining_scenarios: ["冬季暖胃主餐", "朋友式热闹感", "预算友好的满足感晚餐"],
      route_roles: ["暖胃主餐", "冬季记忆点"],
      note: "对学生冬季路线来说，这类热量与氛围都到位的主餐，比高价精致餐厅更有价值。",
    },
    profile: {
      traveler_types: ["student"],
      motivations: ["美食探索"],
      seasons: ["winter"],
      budgets: ["low", "medium"],
      theme_keywords: ["冬季", "美食", "高性价比"],
      memory_value: 3,
    },
  },
  {
    id: "food_gulou_snacks",
    value: {
      id: "food_gulou_snacks",
      name: "鼓楼周边轻小吃与咖啡停顿",
      district_id: "district_gulou_nanluo",
      recommended_foods: ["胡同小吃", "咖啡", "小份甜点"],
      dining_scenarios: ["一个人的随时停顿", "看街景后的短休息", "边走边观察的轻补给"],
      route_roles: ["自由补给", "观察型停顿"],
      note: "这类食物不追求大阵仗，而是服务一个人的自由节奏和随时停下来的能力。",
    },
    profile: {
      traveler_types: ["solo", "student"],
      motivations: ["深度探索", "美食探索"],
      seasons: ["spring", "winter", "autumn"],
      theme_keywords: ["一个人", "慢行", "高性价比"],
      memory_value: 1,
    },
  },
  {
    id: "food_798_cafe_pause",
    value: {
      id: "food_798_cafe_pause",
      name: "798 咖啡馆自由停顿",
      district_id: "district_798_liangmahe",
      recommended_foods: ["咖啡", "简餐", "小型甜点"],
      dining_scenarios: ["一个人的看展间隙", "自由停顿", "不赶时间的下午"],
      route_roles: ["节奏留白", "观察型路线缓冲"],
      note: "这类停顿的价值不在于吃得多，而在于给一个人的路线留下观察和发呆空间。",
    },
    profile: {
      traveler_types: ["solo"],
      motivations: ["深度探索"],
      seasons: ["spring", "autumn"],
      theme_keywords: ["一个人", "观察", "慢行", "街区纹理"],
      memory_value: 1,
    },
  },
];

const baseMapContext: MapContext = {
  verified_pois: [
    {
      name: "故宫博物院",
      district_name: "东城区",
      latitude: 39.917839,
      longitude: 116.397029,
      source_provider: "amap",
    },
    {
      name: "什刹海",
      district_name: "西城区",
      latitude: 39.940803,
      longitude: 116.387581,
      source_provider: "amap",
    },
  ],
  route_facts: [],
  transfer_burden: [],
  cluster_warnings: [],
  route_feasibility_notes: [],
};

const qualityLibrary = {
  tradeoff: {
    no_landmark_stack: "不要试图把北京所有著名地标都塞进同一条路线。",
    no_food_filler: "不要把食物写成景点之间的补充说明，而要让它承担路线价值。",
    no_generic_closure: "不要用任何城市都能套用的夜景收尾。",
  },
  storyline: {
    opener_build_close: "每一天都要有开场、推进和收尾。",
    emotional_sequence: "每天的节奏应该是情绪推进，不只是地理移动。",
    free_pause: "一个人的路线要允许自由停顿，而不是每个时段都被排满。",
  },
  food: {
    meal_anchor: "至少有一顿吃的值得用户提前期待。",
    warm_food_winter: "冬季学生路线要让热食和饱腹感真正成为路线优势。",
    not_utility_only: "食物要承担路线价值，不能只是实用填充。",
  },
  memory: {
    stable_memory: "每一天都应留下一个稳定记忆点。",
    photo_or_texture: "记忆可以来自影像感，也可以来自可复述的街区纹理。",
    no_couple_close: "一个人的路线不要强行写成情侣式情绪收尾。",
  },
  anti_template: {
    no_interchangeable_summary: "不要重复可互换的日摘要写法。",
    no_empty_praise: "不要使用任何城市都能套用的泛泛夸赞。",
    no_same_shell: "不同 traveler 和 motivation 不能只是同一条路线换个标题。",
  },
};

export function selectContext(request: SelectContextRequest): SelectedContextModules {
  if (normalize(request.city) !== "beijing") {
    throw new Error("Only beijing is supported by Context Selector V1.");
  }

  const selectedDistricts = topK(
    scoreCandidates(
      filterByMotivation(filterByTravelerType(districtCandidates, request), request),
      request,
    ),
    3,
  ).map((candidate) => candidate.value);

  const selectedPois = topK(
    scoreCandidates(filterPoisBySelectedDistricts(request, selectedDistricts), request),
    5,
  ).map((candidate) => candidate.value);

  const selectedFood = topK(
    scoreCandidates(filterFoodBySelectedDistricts(request, selectedDistricts), request),
    4,
  ).map((candidate) => candidate.value);

  const selectedContentContext: ContentContext = {
    city_personality: beijingCityPersonality,
    relevant_districts: selectedDistricts,
    relevant_scenes: selectScenes(request),
    relevant_pois: adaptPoisForRequest(selectedPois, request),
    relevant_food_knowledge: adaptFoodForRequest(selectedFood, request),
  };

  return {
    selected_content_context: selectedContentContext,
    selected_city_strategy_context: selectCityStrategyContext(request),
    selected_generation_guidance: selectGenerationGuidance(request),
    selected_map_context: selectMapContext(request),
    selected_quality_context: selectQualityContext(request),
  };
}

function filterByTravelerType<T>(
  candidates: Array<TaggedCandidate<T>>,
  request: SelectContextRequest,
): Array<TaggedCandidate<T>> {
  return candidates.filter((candidate) => {
    const allowed = candidate.profile.traveler_types;
    return !allowed || allowed.includes(request.traveler_type);
  });
}

function filterByMotivation<T>(
  candidates: Array<TaggedCandidate<T>>,
  request: SelectContextRequest,
): Array<TaggedCandidate<T>> {
  return candidates.filter((candidate) => {
    const allowed = candidate.profile.motivations;
    return !allowed || allowed.includes(request.motivation);
  });
}

function scoreCandidates<T>(
  candidates: Array<TaggedCandidate<T>>,
  request: SelectContextRequest,
): Array<TaggedCandidate<T> & { score: number }> {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate.profile, request),
    }))
    .sort((left, right) => right.score - left.score);
}

function scoreCandidate(profile: CandidateProfile, request: SelectContextRequest): number {
  let score = 0;
  const normalizedTheme = normalize(request.theme);

  score += fitScore(profile.traveler_types, request.traveler_type) * 3;
  score += fitScore(profile.motivations, request.motivation) * 3;
  score += fitScore(profile.seasons, request.season) * 2;
  score += fitScore(profile.budgets, request.budget);
  score += fitScore(profile.paces, request.pace);

  if (profile.theme_keywords?.some((keyword) => normalizedTheme.includes(normalize(keyword)))) {
    score += 4;
  }

  if (profile.min_days && request.days < profile.min_days) {
    score -= 3;
  }

  if (profile.max_days && request.days > profile.max_days) {
    score -= 2;
  }

  score += (profile.memory_value ?? 0) * 2;
  score += (profile.city_signature_value ?? 0) * 2;
  score -= profile.transfer_burden_penalty ?? 0;
  score -= profile.repetition_risk_penalty ?? 0;
  score -= profile.mismatch_penalty ?? 0;

  return score;
}

function topK<T>(candidates: Array<T>, count: number): Array<T> {
  return candidates.slice(0, count);
}

function fitScore(allowedValues: string[] | undefined, requestedValue: string): number {
  if (!allowedValues) {
    return 1;
  }

  return allowedValues.includes(requestedValue) ? 1 : -2;
}

function filterPoisBySelectedDistricts(
  request: SelectContextRequest,
  selectedDistricts: RelevantDistrict[],
): Array<TaggedCandidate<RelevantPoi>> {
  const selectedDistrictIds = new Set(selectedDistricts.map((district) => district.id));
  return filterByTravelerType(
    poiCandidates.filter((candidate) => selectedDistrictIds.has(candidate.value.district_id)),
    request,
  );
}

function filterFoodBySelectedDistricts(
  request: SelectContextRequest,
  selectedDistricts: RelevantDistrict[],
): Array<TaggedCandidate<RelevantFoodKnowledge>> {
  const selectedDistrictIds = new Set(selectedDistricts.map((district) => district.id));
  return filterByTravelerType(
    foodCandidates.filter((candidate) => selectedDistrictIds.has(candidate.value.district_id)),
    request,
  );
}

function selectScenes(request: SelectContextRequest): string[] {
  if (isCoupleFirstVisitAutumn(request)) {
    return [
      "用皇城尺度建立第一次抵达北京的仪式感开场。",
      "用景山作为重历史片段后的视角释放。",
      "用什刹海与胡同黄昏完成从宏大到亲密的过渡。",
      "用值得停留下来的晚餐作为情绪收尾。",
    ];
  }

  if (isStudentFoodWinter(request)) {
    return [
      "用早餐把一天直接拉进北京冬天的生活感。",
      "让牛街和前门承担主要吃的密度，而不是景点之间随便找饭。",
      "优先选择地铁可达的片区，保护预算和体力。",
      "把铜锅涮肉做成冬季暖胃的记忆点。",
    ];
  }

  if (isSoloRevisitSpring(request)) {
    return [
      "让一个人的路线保留随时停下来的自由。",
      "用胡同和鼓楼周边承担街区纹理，而不是依赖大地标。",
      "用咖啡馆、书店或看展构成观察型停顿。",
      "通过新旧片区切换完成一个人的城市对照，而不是情侣式收尾。",
    ];
  }

  return ["根据请求筛选出的北京片区场景。"];
}

function selectCityStrategyContext(request: SelectContextRequest): CityStrategyContext {
  if (isCoupleFirstVisitAutumn(request)) {
    return {
      city_positioning: "北京不应被包装成景点堆砌，而应被包装成一条有选择的首次首都印象路线：既有皇城尺度，也有胡同纹理，并通过黄昏到晚餐的收尾建立情绪记忆。",
      priority_combination: "北京 × 首次到访 × 首次北京印象 / 情侣氛围路线 × couple × autumn",
      not_recommended_patterns: [
        "博物馆和重门票景点的效率型堆叠",
        "东西向跨区过于仓促的路线切换",
        "用泛泛购物点去补路线空洞",
      ],
    };
  }

  if (isStudentFoodWinter(request)) {
    return {
      city_positioning: "北京冬季学生路线更适合被包装成高性价比的暖胃城市吃法，而不是景点主导的低预算缩水版北京。",
      priority_combination: "北京 × 美食探索 × 北京冬季美食 / 学生高性价比路线 × student × winter",
      not_recommended_patterns: [
        "用高价精致餐厅冒充美食路线升级",
        "为了景点覆盖牺牲吃的节奏",
        "大范围跨城找单个网红店",
      ],
    };
  }

  return {
    city_positioning: "北京的 solo 深度路线更适合被包装成街区纹理与自由停顿并重的城市观察，而不是换了人称的情侣老城路线。",
    priority_combination: "北京 × 深度探索 × 北京街区纹理 / 一个人的慢行路线 × solo × spring",
    not_recommended_patterns: [
      "把所有经典地标重新走一遍",
      "强行设计情侣化的晚餐和夜景收尾",
      "不给一个人的路线留下自由停顿空间",
    ],
  };
}

function selectGenerationGuidance(request: SelectContextRequest): GenerationGuidance {
  if (isCoupleFirstVisitAutumn(request)) {
    return {
      route_bias: "以城市代表性为主线，但加强黄昏氛围和晚餐收束，而不是单纯景点推进。",
      must_include: ["一个地标级主锚点", "一个有黄昏过渡价值的场景", "一顿值得作为收尾的晚餐"],
      avoid: ["效率优先的博物馆堆叠", "过早结束导致夜晚氛围缺失", "跨区移动过急、破坏情绪节奏"],
      food_strategy: "用一顿有氛围感的晚餐做主记忆点，再配一个低负担的白天食物停顿。",
      memory_strategy: "让用户留下“这是我们第一次一起看见北京”的稳定记忆。",
    };
  }

  if (isStudentFoodWinter(request)) {
    return {
      route_bias: "让食物成为路线主轴，优先地铁可达与预算友好，减少纯景点填充。",
      must_include: ["至少一个早餐型食物锚点", "至少一个冬季暖胃主餐", "至少一个高性价比街区慢行片段"],
      avoid: ["高价精致餐厅", "纯景点驱动的长距离移动", "把食物只写成辅助说明"],
      food_strategy: "每天至少保留一个真正决定路线价值的吃的主锚点，小吃与主餐都要具体。",
      memory_strategy: "让用户记住北京冬天最值得吃、最划算、最有满足感的一顿和一整段片区吃法。",
    };
  }

  return {
    route_bias: "以街区纹理和自由停顿为主，不追求大覆盖，用观察型路线建立一个人的节奏。",
    must_include: ["至少一个胡同或老街片区", "至少一个咖啡馆或书店式停顿", "至少一个现代北京的对照片段"],
    avoid: ["情侣化晚餐收尾", "把一个人的路线写成打卡清单", "不给用户留白时间"],
    food_strategy: "食物不追求仪式感大餐，而要服务一个人的自由节奏和观察型停顿。",
    memory_strategy: "让记忆来自可复述的街区细节、观察感和一个人慢慢看见北京的过程。",
  };
}

function selectMapContext(request: SelectContextRequest): MapContext {
  if (isCoupleFirstVisitAutumn(request)) {
    return {
      ...baseMapContext,
      route_facts: [
        {
          from: "故宫博物院",
          to: "什刹海",
          transport_mode: "walking",
          distance_meters: 3852,
          duration_minutes: 51,
          source_provider: "amap",
        },
      ],
      transfer_burden: [
        {
          from: "故宫博物院",
          to: "什刹海",
          transport_mode: "walking",
          burden_level: "long_walk",
          reason: "这段移动空间上可行，但对情侣氛围路线来说，不应描述成轻松散步。",
        },
      ],
      cluster_warnings: ["不要把故宫到什刹海描述成轻松随意的步行，需要说明移动负担。"],
      route_feasibility_notes: ["这两个点可以放在同一天，但更适合通过景山过渡，或使用地铁 / 打车降低移动压力。"],
    };
  }

  if (isStudentFoodWinter(request)) {
    return {
      verified_pois: [
        {
          name: "牛街",
          district_name: "西城区",
          latitude: 0,
          longitude: 0,
          source_provider: "selector_estimate",
        },
        {
          name: "鼓楼",
          district_name: "东城区",
          latitude: 0,
          longitude: 0,
          source_provider: "selector_estimate",
        },
      ],
      route_facts: [
        {
          from: "牛街",
          to: "鼓楼",
          transport_mode: "transit",
          distance_meters: 0,
          duration_minutes: 30,
          source_provider: "selector_estimate",
        },
      ],
      transfer_burden: [
        {
          from: "牛街",
          to: "鼓楼",
          transport_mode: "transit",
          burden_level: "moderate_burden",
          reason: "学生路线可以接受地铁换区，但不适合频繁往返多个高价餐厅。",
        },
      ],
      cluster_warnings: ["优先选择地铁直达或少换乘片区，不要为了单家店反复跨区。"],
      route_feasibility_notes: ["冬季路线更适合南城和中轴周边的连续吃法，而不是远距离折返。"],
    };
  }

  return {
    verified_pois: [
      {
        name: "鼓楼",
        district_name: "东城区",
        latitude: 0,
        longitude: 0,
        source_provider: "selector_estimate",
      },
      {
        name: "798艺术区",
        district_name: "朝阳区",
        latitude: 0,
        longitude: 0,
        source_provider: "selector_estimate",
      },
    ],
    route_facts: [
      {
        from: "鼓楼",
        to: "798",
        transport_mode: "transit",
        distance_meters: 0,
        duration_minutes: 35,
        source_provider: "selector_estimate",
      },
    ],
    transfer_burden: [
      {
        from: "鼓楼",
        to: "798",
        transport_mode: "transit",
        burden_level: "moderate_burden",
        reason: "这段切换适合建立新旧对照，但不应再叠加跨区晚餐或密集打卡。",
      },
    ],
    cluster_warnings: ["solo 路线需要控制跨区次数，避免为了补景点而破坏自由停顿。"],
    route_feasibility_notes: ["胡同片区与 798 可以放在同一天，但更适合保留单段跨区，而不是来回折返。"],
  };
}

function selectQualityContext(request: SelectContextRequest): QualityContext {
  if (isCoupleFirstVisitAutumn(request)) {
    return {
      active_tradeoff_rules: [
        qualityLibrary.tradeoff.no_landmark_stack,
        "保护最强记忆点，不要被过多景点稀释。",
      ],
      daily_storyline_rules: [
        qualityLibrary.storyline.opener_build_close,
        qualityLibrary.storyline.emotional_sequence,
      ],
      food_depth_rules: [qualityLibrary.food.meal_anchor, qualityLibrary.food.not_utility_only],
      memory_point_rules: [qualityLibrary.memory.stable_memory, qualityLibrary.memory.photo_or_texture],
      anti_template_rules: [qualityLibrary.anti_template.no_interchangeable_summary, qualityLibrary.anti_template.no_empty_praise],
    };
  }

  if (isStudentFoodWinter(request)) {
    return {
      active_tradeoff_rules: [qualityLibrary.tradeoff.no_food_filler, "不要为了覆盖著名地标而牺牲吃的连续性。"],
      daily_storyline_rules: [qualityLibrary.storyline.opener_build_close, "学生路线要把热量、预算和移动成本一起考虑。"],
      food_depth_rules: [qualityLibrary.food.meal_anchor, qualityLibrary.food.warm_food_winter],
      memory_point_rules: [qualityLibrary.memory.stable_memory, "至少一顿饭要让用户愿意专门记住北京冬天的味道。"],
      anti_template_rules: [qualityLibrary.anti_template.no_same_shell, qualityLibrary.anti_template.no_empty_praise],
    };
  }

  return {
    active_tradeoff_rules: ["不要把 solo 路线重新写成情侣路线的单人版。", "减少默认地标依赖，保护更深的街区观察价值。"],
    daily_storyline_rules: [qualityLibrary.storyline.opener_build_close, qualityLibrary.storyline.free_pause],
    food_depth_rules: [qualityLibrary.food.not_utility_only, "食物要为自由停顿服务，而不是强行制造盛大收尾。"],
    memory_point_rules: [qualityLibrary.memory.stable_memory, qualityLibrary.memory.no_couple_close],
    anti_template_rules: [qualityLibrary.anti_template.no_same_shell, qualityLibrary.anti_template.no_interchangeable_summary],
  };
}

function isCoupleFirstVisitAutumn(request: SelectContextRequest): boolean {
  return (
    request.traveler_type === "couple" &&
    request.motivation === "首次到访" &&
    request.season === "autumn" &&
    request.theme === "首次北京印象 / 情侣氛围路线"
  );
}

function isStudentFoodWinter(request: SelectContextRequest): boolean {
  return (
    request.traveler_type === "student" &&
    request.motivation === "美食探索" &&
    request.season === "winter" &&
    request.theme === "北京冬季美食 / 学生高性价比路线"
  );
}

function isSoloRevisitSpring(request: SelectContextRequest): boolean {
  return (
    request.traveler_type === "solo" &&
    request.motivation === "深度探索" &&
    request.season === "spring" &&
    request.theme === "北京街区纹理 / 一个人的慢行路线"
  );
}

function adaptPoisForRequest(pois: RelevantPoi[], request: SelectContextRequest): RelevantPoi[] {
  return pois.map((poi) => {
    if (request.traveler_type === "solo" && poi.id === "poi_shichahai_lakeside") {
      return {
        ...poi,
        description: "适合承担黄昏氛围、城市慢行和一个人的观察型停顿。",
        route_roles: ["黄昏氛围", "自由停顿"],
      };
    }

    return poi;
  });
}

function adaptFoodForRequest(
  foods: RelevantFoodKnowledge[],
  request: SelectContextRequest,
): RelevantFoodKnowledge[] {
  return foods.map((food) => {
    if (request.traveler_type === "student" && food.id === "food_gulou_snacks") {
      return {
        ...food,
        dining_scenarios: ["同学结伴随吃随走", "逛街区后的短休息", "低预算轻补给"],
        route_roles: ["低预算补给", "年轻人街区停顿"],
        note: "这类食物适合学生路线中随走随吃，不追求精致感，而强调便宜、方便和街区活力。",
      };
    }

    return food;
  });
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function toSelectContextRequest(request: RequestContext): SelectContextRequest {
  return {
    city: request.city,
    traveler_type: request.traveler_type,
    days: request.days,
    season: request.season,
    budget: request.budget,
    pace: request.pace,
    motivation: request.motivation,
    theme: request.theme,
  };
}
