import type {
  BuildMapProjectInput,
  MapCoordinate,
  MapLayer,
  MapPlace,
  MapPlaceCategory,
  MapProject,
  MapRegion,
} from "./types";

export type CuratedDestinationKey = "china-shenzhen";

interface CuratedTravelHotspot {
  id: string;
  name: string;
  shortName: string;
  type: "coast" | "urban" | "culture" | "nature" | "business";
  center: MapCoordinate;
  labelAnchor: MapCoordinate;
  priority: number;
  minZoom: number;
  maxZoom: number;
  boundary: MapCoordinate[][];
  summary: string;
  tags: string[];
  suitableFor: string[];
  suggestedDuration: string;
  representativePlaces: string[];
}

interface CuratedAdministrativeDistrict {
  id: string;
  name: string;
  center: MapCoordinate;
  level: "district" | "new_area";
  summary: string;
}

interface CuratedPlace {
  id: string;
  name: string;
  type: MapPlaceCategory;
  hotspotId: string;
  hotspotIds?: string[];
  districtId: string;
  location: MapCoordinate;
  priority?: number;
  minZoom?: number;
  shortDescription: string;
  suggestedDurationMinutes: number;
  tags: string[];
  openingHours: string;
  ticketInfo: string;
  crowdLevel: string;
  imagePlaceholder: string;
  dataStatus: "curated";
}

interface CuratedDestination {
  key: CuratedDestinationKey;
  country: "China";
  countryName: "中国";
  city: "Shenzhen";
  cityName: "深圳";
  cityCenter: MapCoordinate;
  cityViewport: {
    center: MapCoordinate;
    zoom: number;
  };
  travelHotspots: CuratedTravelHotspot[];
  administrativeDistricts: CuratedAdministrativeDistrict[];
  places: CuratedPlace[];
}

type PlaceSeed = readonly [
  id: string,
  name: string,
  type: MapPlaceCategory,
  hotspotId: string,
  districtId: string,
  lat: number,
  lng: number,
  shortDescription: string,
  suggestedDurationMinutes: number,
  tags: string[],
];

const HOTSPOT_SEEDS: CuratedTravelHotspot[] = [
  {
    id: "dapeng_coast",
    name: "大鹏滨海",
    shortName: "大鹏",
    type: "coast" as const,
    center: { lat: 22.57, lng: 114.525 },
    labelAnchor: { lat: 22.585, lng: 114.505 },
    priority: 3,
    minZoom: 9,
    maxZoom: 18,
    boundary: [[
      { lat: 22.636, lng: 114.448 },
      { lat: 22.623, lng: 114.515 },
      { lat: 22.59, lng: 114.585 },
      { lat: 22.532, lng: 114.62 },
      { lat: 22.488, lng: 114.586 },
      { lat: 22.505, lng: 114.505 },
      { lat: 22.55, lng: 114.46 },
      { lat: 22.604, lng: 114.438 },
    ]],
    summary: "深圳东部最适合看海、徒步和慢度假的片区，适合单独留出一整天。",
    tags: ["海边", "徒步", "周末"],
    suitableFor: ["看海", "拍照", "轻徒步"],
    suggestedDuration: "0.5-1 天",
    representativePlaces: ["较场尾", "杨梅坑", "大鹏所城", "西涌海滩"],
  },
  {
    id: "oct_huaqiaocheng",
    name: "华侨城",
    shortName: "华侨城",
    type: "culture" as const,
    center: { lat: 22.542, lng: 113.987 },
    labelAnchor: { lat: 22.548, lng: 113.989 },
    priority: 4,
    minZoom: 10,
    maxZoom: 18,
    boundary: [[
      { lat: 22.558, lng: 113.962 },
      { lat: 22.562, lng: 113.987 },
      { lat: 22.551, lng: 114.01 },
      { lat: 22.533, lng: 114.013 },
      { lat: 22.526, lng: 113.993 },
      { lat: 22.532, lng: 113.968 },
      { lat: 22.545, lng: 113.958 },
    ]],
    summary: "文化展馆、创意园和主题乐园集中，适合第一次来深圳时做城市文化体验。",
    tags: ["文化", "展馆", "亲子"],
    suitableFor: ["城市文化", "亲子", "雨天备选"],
    suggestedDuration: "0.5 天",
    representativePlaces: ["OCT-LOFT", "华侨城创意文化园", "欢乐谷", "世界之窗"],
  },
  {
    id: "shekou_sea_world",
    name: "蛇口/海上世界",
    shortName: "蛇口",
    type: "urban" as const,
    center: { lat: 22.488, lng: 113.915 },
    labelAnchor: { lat: 22.493, lng: 113.916 },
    priority: 5,
    minZoom: 10,
    maxZoom: 18,
    boundary: [[
      { lat: 22.51, lng: 113.894 },
      { lat: 22.505, lng: 113.925 },
      { lat: 22.492, lng: 113.94 },
      { lat: 22.474, lng: 113.934 },
      { lat: 22.462, lng: 113.91 },
      { lat: 22.475, lng: 113.89 },
      { lat: 22.496, lng: 113.884 },
    ]],
    summary: "海边街区、餐饮和夜间散步体验集中，适合傍晚到晚上安排。",
    tags: ["海边街区", "餐饮", "夜景"],
    suitableFor: ["晚餐", "海边散步", "城市夜景"],
    suggestedDuration: "0.5 天",
    representativePlaces: ["海上世界", "蛇口老街", "南海意库", "价值工厂"],
  },
  {
    id: "shenzhen_bay_houhai",
    name: "深圳湾/后海",
    shortName: "深圳湾",
    type: "coast" as const,
    center: { lat: 22.514, lng: 113.956 },
    labelAnchor: { lat: 22.518, lng: 113.95 },
    priority: 2,
    minZoom: 9,
    maxZoom: 18,
    boundary: [[
      { lat: 22.536, lng: 113.927 },
      { lat: 22.533, lng: 113.958 },
      { lat: 22.526, lng: 113.988 },
      { lat: 22.506, lng: 113.996 },
      { lat: 22.494, lng: 113.974 },
      { lat: 22.498, lng: 113.942 },
      { lat: 22.516, lng: 113.922 },
    ]],
    summary: "城市天际线和滨海步道最友好的区域，适合轻松散步与骑行。",
    tags: ["滨海", "骑行", "天际线"],
    suitableFor: ["轻松散步", "日落", "亲子"],
    suggestedDuration: "2-4 小时",
    representativePlaces: ["深圳湾公园", "人才公园", "后海中心", "欢乐海岸"],
  },
  {
    id: "futian_center",
    name: "福田中心",
    shortName: "福田",
    type: "business" as const,
    center: { lat: 22.543, lng: 114.057 },
    labelAnchor: { lat: 22.548, lng: 114.06 },
    priority: 1,
    minZoom: 9,
    maxZoom: 18,
    boundary: [[
      { lat: 22.564, lng: 114.028 },
      { lat: 22.565, lng: 114.06 },
      { lat: 22.553, lng: 114.086 },
      { lat: 22.529, lng: 114.083 },
      { lat: 22.52, lng: 114.058 },
      { lat: 22.531, lng: 114.031 },
      { lat: 22.548, lng: 114.022 },
    ]],
    summary: "深圳城市中心界面，适合看地标、博物馆、商圈和城市公共空间。",
    tags: ["地标", "商圈", "博物馆"],
    suitableFor: ["城市地标", "室内备选", "短停留"],
    suggestedDuration: "0.5 天",
    representativePlaces: ["市民中心", "莲花山公园", "平安金融中心", "深圳博物馆"],
  },
  {
    id: "yantian_seaside",
    name: "盐田海滨",
    shortName: "盐田",
    type: "coast" as const,
    center: { lat: 22.586, lng: 114.274 },
    labelAnchor: { lat: 22.593, lng: 114.287 },
    priority: 6,
    minZoom: 10,
    maxZoom: 18,
    boundary: [[
      { lat: 22.622, lng: 114.24 },
      { lat: 22.617, lng: 114.294 },
      { lat: 22.593, lng: 114.33 },
      { lat: 22.562, lng: 114.315 },
      { lat: 22.548, lng: 114.268 },
      { lat: 22.565, lng: 114.228 },
      { lat: 22.596, lng: 114.216 },
    ]],
    summary: "东部海滨栈道、港口和沙滩连接度高，适合海边半日线。",
    tags: ["海滨栈道", "沙滩", "港口"],
    suitableFor: ["看海", "慢走", "半日游"],
    suggestedDuration: "0.5 天",
    representativePlaces: ["大梅沙", "盐田海滨栈道", "中英街", "海山公园"],
  },
  {
    id: "luohu_dongmen",
    name: "罗湖东门",
    shortName: "罗湖",
    type: "nature" as const,
    center: { lat: 22.562, lng: 114.145 },
    labelAnchor: { lat: 22.558, lng: 114.13 },
    priority: 7,
    minZoom: 11,
    maxZoom: 18,
    boundary: [[
      { lat: 22.594, lng: 114.112 },
      { lat: 22.595, lng: 114.168 },
      { lat: 22.577, lng: 114.202 },
      { lat: 22.547, lng: 114.184 },
      { lat: 22.532, lng: 114.13 },
      { lat: 22.544, lng: 114.104 },
      { lat: 22.574, lng: 114.098 },
    ]],
    summary: "山海城市的自然面和老城区烟火气交汇，适合体力充足的一天。",
    tags: ["登山", "老城", "自然"],
    suitableFor: ["登山", "城市烟火气", "自然风景"],
    suggestedDuration: "0.5-1 天",
    representativePlaces: ["梧桐山", "仙湖植物园", "东门老街", "洪湖公园"],
  },
] satisfies CuratedTravelHotspot[];

const DISTRICT_SEEDS = [
  ["sz-district-nanshan", "南山区", 22.535, 113.93, "科技、滨海和文化资源密集，覆盖深圳湾、蛇口、华侨城等热点。"],
  ["sz-district-futian", "福田区", 22.545, 114.055, "深圳中心城区，公共文化、地标和商务空间集中。"],
  ["sz-district-luohu", "罗湖区", 22.555, 114.13, "深圳传统商业和老城片区，靠近梧桐山与东门。"],
  ["sz-district-yantian", "盐田区", 22.59, 114.25, "东部海滨城区，适合海边栈道和半日看海。"],
  ["sz-district-longgang", "龙岗区", 22.72, 114.25, "东部腹地范围大，适合承接周边自然与城市延展。"],
  ["sz-district-baoan", "宝安区", 22.68, 113.89, "西部城区与机场方向，商圈和滨海公园逐渐丰富。"],
  ["sz-district-longhua", "龙华区", 22.67, 114.02, "中北部生活与交通节点片区，适合衔接市区与北部。"],
  ["sz-district-guangming", "光明区", 22.77, 113.94, "北部新城与生态空间，适合后续扩展亲子和自然样板。"],
  ["sz-district-pingshan", "坪山区", 22.69, 114.35, "东北部城区，靠近东部山海和客家文化资源。"],
  ["sz-district-dapeng", "大鹏新区", 22.60, 114.47, "深圳最重要的东部滨海度假区域。"],
] as const;

const PLACE_SEEDS: CuratedPlace[] = ([
  ["sz-place-jiaochangwei", "较场尾", "neighborhood", "dapeng_coast", "sz-district-dapeng", 22.596, 114.508, "海边民宿和小街区集中，适合轻松看海。", 120, ["海边", "民宿", "拍照"]],
  ["sz-place-yangmeikeng", "杨梅坑", "nature", "dapeng_coast", "sz-district-dapeng", 22.542, 114.575, "东部看海和骑行路线常见起点。", 150, ["海岸", "骑行", "自然"]],
  ["sz-place-dapeng-fortress", "大鹏所城", "attraction", "dapeng_coast", "sz-district-dapeng", 22.596, 114.489, "古城街巷与滨海行程可组合。", 90, ["古城", "文化", "慢逛"]],
  ["sz-place-xichong", "西涌海滩", "nature", "dapeng_coast", "sz-district-dapeng", 22.508, 114.59, "更适合单独留时间的东部沙滩。", 180, ["沙滩", "海边", "日落"]],
  ["sz-place-oct-loft", "OCT-LOFT", "neighborhood", "oct_huaqiaocheng", "sz-district-nanshan", 22.541, 113.993, "创意园、咖啡和展览集中。", 120, ["创意园", "展览", "咖啡"]],
  ["sz-place-window-world", "世界之窗", "attraction", "oct_huaqiaocheng", "sz-district-nanshan", 22.535, 113.974, "经典主题景区，适合亲子或第一次来。", 180, ["主题乐园", "亲子", "经典"]],
  ["sz-place-happy-valley", "欢乐谷", "attraction", "oct_huaqiaocheng", "sz-district-nanshan", 22.539, 113.987, "游乐项目密集，建议单独安排半天以上。", 240, ["游乐园", "亲子", "娱乐"]],
  ["sz-place-splendid-china", "锦绣中华民俗村", "attraction", "oct_huaqiaocheng", "sz-district-nanshan", 22.538, 113.999, "文化主题景区，可与华侨城片区组合。", 180, ["文化", "主题景区", "亲子"]],
  ["sz-place-sea-world", "海上世界", "neighborhood", "shekou_sea_world", "sz-district-nanshan", 22.485, 113.919, "蛇口最成熟的餐饮和夜间散步片区。", 120, ["夜景", "餐饮", "海边"]],
  ["sz-place-nanhai-ecool", "南海意库", "neighborhood", "shekou_sea_world", "sz-district-nanshan", 22.492, 113.916, "创意办公和餐饮小店集中。", 90, ["创意", "咖啡", "街区"]],
  ["sz-place-shekou-old-street", "蛇口老街", "food", "shekou_sea_world", "sz-district-nanshan", 22.493, 113.925, "更生活化的蛇口小吃与街巷。", 90, ["美食", "老街", "烟火气"]],
  ["sz-place-value-factory", "价值工厂", "experience", "shekou_sea_world", "sz-district-nanshan", 22.48, 113.897, "工业遗存改造空间，适合拍照和展览。", 90, ["工业风", "拍照", "展览"]],
  ["sz-place-bay-park", "深圳湾公园", "nature", "shenzhen_bay_houhai", "sz-district-nanshan", 22.516, 113.962, "滨海步道长，适合散步、骑行和看日落。", 150, ["滨海", "骑行", "日落"]],
  ["sz-place-talent-park", "人才公园", "nature", "shenzhen_bay_houhai", "sz-district-nanshan", 22.517, 113.943, "城市天际线视野好，适合轻松散步。", 90, ["公园", "天际线", "夜景"]],
  ["sz-place-houhai", "后海中心", "shopping", "shenzhen_bay_houhai", "sz-district-nanshan", 22.518, 113.934, "商圈密集，可作为深圳湾后的餐饮补给。", 90, ["商圈", "餐饮", "补给"]],
  ["sz-place-happy-coast", "欢乐海岸", "shopping", "shenzhen_bay_houhai", "sz-district-nanshan", 22.526, 113.996, "餐饮、商业和夜间散步组合方便。", 120, ["商业", "夜景", "餐饮"]],
  ["sz-place-civic-center", "市民中心", "attraction", "futian_center", "sz-district-futian", 22.543, 114.058, "深圳中心地标，适合快速建立城市印象。", 60, ["地标", "城市", "建筑"]],
  ["sz-place-lianhua", "莲花山公园", "nature", "futian_center", "sz-district-futian", 22.555, 114.059, "轻松上坡看城市中轴线。", 90, ["公园", "城市视野", "轻徒步"]],
  ["sz-place-pingan", "平安金融中心", "attraction", "futian_center", "sz-district-futian", 22.536, 114.05, "福田 CBD 标志性建筑。", 60, ["地标", "CBD", "观景"]],
  ["sz-place-sz-museum", "深圳博物馆", "museum", "futian_center", "sz-district-futian", 22.543, 114.06, "适合补深圳城市历史和改革开放背景。", 90, ["博物馆", "室内", "文化"]],
  ["sz-place-dameisha", "大梅沙", "nature", "yantian_seaside", "sz-district-yantian", 22.596, 114.312, "盐田经典沙滩，旺季需注意拥挤。", 150, ["沙滩", "海边", "亲子"]],
  ["sz-place-yantian-boardwalk", "盐田海滨栈道", "nature", "yantian_seaside", "sz-district-yantian", 22.583, 114.269, "适合慢走看海的线性空间。", 120, ["栈道", "看海", "慢走"]],
  ["sz-place-chung-ying", "中英街", "attraction", "yantian_seaside", "sz-district-yantian", 22.546, 114.225, "历史边界街区，适合与盐田半日组合。", 90, ["历史", "街区", "边界"]],
  ["sz-place-haishan", "海山公园", "nature", "yantian_seaside", "sz-district-yantian", 22.56, 114.236, "轻量公园，可作为盐田线路补充。", 60, ["公园", "轻松", "补充"]],
  ["sz-place-wutong", "梧桐山", "nature", "luohu_dongmen", "sz-district-luohu", 22.584, 114.205, "深圳经典登山目的地，需要预留体力。", 240, ["登山", "自然", "城市远眺"]],
  ["sz-place-fairy-lake", "仙湖植物园", "nature", "luohu_dongmen", "sz-district-luohu", 22.582, 114.174, "自然和植物园体验，可与梧桐山搭配。", 150, ["植物园", "自然", "慢走"]],
  ["sz-place-dongmen", "东门老街", "food", "luohu_dongmen", "sz-district-luohu", 22.546, 114.117, "老牌商业步行街，烟火气和小吃密集。", 90, ["小吃", "老街", "商业"]],
  ["sz-place-honghu", "洪湖公园", "nature", "luohu_dongmen", "sz-district-luohu", 22.567, 114.119, "更轻松的公园选项，适合作为老城补充。", 75, ["公园", "轻松", "荷花"]],
] satisfies PlaceSeed[]).map(([
  id,
  name,
  type,
  hotspotId,
  districtId,
  lat,
  lng,
  shortDescription,
  suggestedDurationMinutes,
  tags,
]) => ({
  id,
  name,
  type,
  hotspotId,
  districtId,
  location: { lat, lng },
  shortDescription,
  suggestedDurationMinutes,
  tags,
  openingHours: "开放时间待接入，出行前请以官方信息为准。",
  ticketInfo: "票价信息待接入，出行前请以官方信息为准。",
  crowdLevel: "拥挤度暂未接入实时数据。",
  imagePlaceholder: "shenzhen-curated-place-placeholder",
  dataStatus: "curated" as const,
}));

export const SHENZHEN_CURATED_DESTINATION: CuratedDestination = {
  key: "china-shenzhen",
  country: "China",
  countryName: "中国",
  city: "Shenzhen",
  cityName: "深圳",
  cityCenter: { lat: 22.5431, lng: 114.0579 },
  cityViewport: {
    center: { lat: 22.58, lng: 114.15 },
    zoom: 10,
  },
  travelHotspots: HOTSPOT_SEEDS,
  administrativeDistricts: DISTRICT_SEEDS.map(
    ([id, name, lat, lng, summary]) => ({
      id,
      name,
      center: { lat, lng },
      level: id === "sz-district-dapeng" ? "new_area" : "district",
      summary,
    }),
  ),
  places: PLACE_SEEDS,
};

export const CURATED_DESTINATIONS: Record<
  CuratedDestinationKey,
  CuratedDestination
> = {
  "china-shenzhen": SHENZHEN_CURATED_DESTINATION,
};

const CURATED_LAYERS: MapLayer[] = [
  {
    id: "layer-hotspots",
    name: "热点区域",
    type: "hotspots",
    isVisible: true,
    opacity: 0.74,
    zIndex: 30,
    stylePreset: "curated-hotspot-region",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
  {
    id: "layer-districts",
    name: "行政区划",
    type: "districts",
    isVisible: true,
    opacity: 0.36,
    zIndex: 18,
    stylePreset: "curated-district-reference",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
  {
    id: "layer-labels",
    name: "地名标签",
    type: "labels",
    isVisible: true,
    opacity: 1,
    zIndex: 58,
    stylePreset: "wanderly-map-labels",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-plan-places",
    name: "行程地点",
    type: "plan_places",
    isVisible: true,
    opacity: 1,
    zIndex: 56,
    stylePreset: "phase2-plan-marker",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-places",
    name: "推荐地点",
    type: "places",
    isVisible: true,
    opacity: 1,
    zIndex: 45,
    stylePreset: "curated-place-marker",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-candidates",
    name: "候选",
    type: "candidates",
    isVisible: true,
    opacity: 1,
    zIndex: 52,
    stylePreset: "curated-candidate-marker",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-routes",
    name: "路线",
    type: "routes",
    isVisible: false,
    opacity: 0.84,
    zIndex: 40,
    stylePreset: "curated-route-placeholder",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
  {
    id: "layer-traffic",
    name: "交通流量",
    type: "traffic",
    isVisible: false,
    opacity: 0.45,
    zIndex: 12,
    stylePreset: "amap-traffic-muted",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
];

function hotspotToRegion(hotspot: CuratedTravelHotspot): MapRegion {
  return {
    id: hotspot.id,
    name: hotspot.name,
    displayName: hotspot.name,
    city: SHENZHEN_CURATED_DESTINATION.cityName,
    regionType: hotspot.type === "nature" || hotspot.type === "coast"
      ? "scenic_zone"
      : "travel_area",
    boundary: {
      type: "polygon",
      coordinates: hotspot.boundary,
      source: "curated",
    },
    fallbackCenter: hotspot.center,
    fillColor: "rgba(70, 112, 122, 0.58)",
    borderColor: "rgba(255, 236, 190, 0.72)",
    hoverColor: "rgba(255, 211, 126, 0.56)",
    selectedColor: "rgba(255, 217, 104, 0.78)",
    labelPosition: hotspot.center,
    labelAnchor: hotspot.labelAnchor,
    shortName: hotspot.shortName,
    priority: hotspot.priority,
    minZoom: hotspot.minZoom,
    maxZoom: hotspot.maxZoom,
    suggestedDuration: hotspot.suggestedDuration,
    summary: hotspot.summary,
    tags: hotspot.tags,
    bestFor: hotspot.suitableFor,
    representativePlaceIds: [],
    routeIds: [],
    state: {
      isVisible: true,
      isHovered: false,
      isSelected: false,
      isHighlighted: false,
    },
    dataStatus: "curated",
  };
}

function placeToMapPlace(place: CuratedPlace, regionRank = 3): MapPlace {
  const priority = place.priority ?? Math.min(regionRank, 4);

  return {
    id: place.id,
    name: place.name,
    displayName: place.name,
    city: SHENZHEN_CURATED_DESTINATION.cityName,
    regionId: place.hotspotId,
    regionIds: place.hotspotIds ?? [place.hotspotId],
    hotspotId: place.hotspotId,
    districtId: place.districtId,
    lat: place.location.lat,
    lng: place.location.lng,
    category: place.type,
    priority,
    minZoom: place.minZoom ?? (priority <= 2 ? 12 : 13),
    tags: place.tags,
    shortDescription: place.shortDescription,
    longDescription: `${place.shortDescription} 这是 Wanderly v2.0 第一版深圳目的地资料，适合用于地图探索、候选收集和写回验证。`,
    suggestedDuration: `${Math.round(place.suggestedDurationMinutes / 60 * 10) / 10} 小时`,
    bestFor: place.tags.slice(0, 3),
    openingHours: place.openingHours,
    ticketInfo: place.ticketInfo,
    crowdLevel: place.crowdLevel,
    imagePlaceholder: place.imagePlaceholder,
    source: {
      label: "Wanderly destination profile",
    },
    sourceType: "seed",
    sourceStatus: "curated",
    dataStatus: place.dataStatus,
    isCandidate: false,
    relationshipToPlan: "来自深圳目的地推荐数据，可先加入候选，再写回某一天行程。",
    ui: {
      markerIcon: place.type === "food" ? "food" : "pin",
      markerColor: place.type === "food" ? "#d98445" : "#f2cf70",
      isVisible: true,
      isHovered: false,
      isSelected: false,
      isHighlighted: false,
    },
  };
}

export function resolveCuratedDestination(input: {
  country?: string;
  city?: string;
}) {
  const country = input.country?.trim().toLowerCase();
  const city = input.city?.trim().toLowerCase();

  if (
    (country === "中国" || country === "china" || !country) &&
    (city === "深圳" || city === "shenzhen")
  ) {
    return SHENZHEN_CURATED_DESTINATION;
  }

  return null;
}

export function buildCuratedMapProject(
  destination: CuratedDestination,
  input: Partial<BuildMapProjectInput> = {},
): MapProject {
  const hotspotRegions = destination.travelHotspots.map(hotspotToRegion);
  const placeRankByHotspot = new Map<string, number>();
  const places = destination.places.map((place) => {
    const nextRank = (placeRankByHotspot.get(place.hotspotId) ?? 0) + 1;
    placeRankByHotspot.set(place.hotspotId, nextRank);
    return placeToMapPlace(place, nextRank);
  });
  const placeIdsByHotspot = new Map<string, string[]>();

  for (const place of places) {
    placeIdsByHotspot.set(place.regionId, [
      ...(placeIdsByHotspot.get(place.regionId) ?? []),
      place.id,
    ]);
  }

  return {
    id: `${input.projectId ?? "local"}-${destination.key}-map-project`,
    projectId: input.projectId,
    title: `${destination.cityName}地图探索`,
    city: destination.cityName,
    country: destination.countryName,
    mapMode: {
      currentLayer: "layer-hotspots",
      zoomLevel: destination.cityViewport.zoom,
      center: destination.cityViewport.center,
      activeTool: "region",
    },
    regions: hotspotRegions.map((region) => ({
      ...region,
      representativePlaceIds: placeIdsByHotspot.get(region.id) ?? [],
    })),
    places,
    routes: [],
    layers: CURATED_LAYERS,
    candidatePlaceIds: [],
    candidatePlaces: [],
    unresolvedPlaces: [],
    activeDayId: input.tripPlan?.dailyItinerary[0]
      ? String(input.tripPlan.dailyItinerary[0].day)
      : "1",
    tooltips: [],
    actions: [],
    updatedAt: input.now ?? new Date().toISOString(),
  };
}

export function buildShenzhenCuratedMapProject(
  input: Partial<BuildMapProjectInput> = {},
) {
  return buildCuratedMapProject(SHENZHEN_CURATED_DESTINATION, input);
}

export function buildShenzhenDestinationMapProject(
  input: Partial<BuildMapProjectInput> = {},
) {
  return buildCuratedMapProject(SHENZHEN_CURATED_DESTINATION, input);
}
