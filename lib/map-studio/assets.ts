const MAP_STUDIO_ASSET_ROOT = "/assets/map-studio";
const MAP_STUDIO_BUTTON_ASSET_ROOT = `${MAP_STUDIO_ASSET_ROOT}/button-assets`;
const MAP_STUDIO_UI_ASSET_BATCH_2_ROOT = `${MAP_STUDIO_ASSET_ROOT}/ui-assets-batch-2`;
const MAP_STUDIO_MARKER_ASSET_ROOT = `${MAP_STUDIO_ASSET_ROOT}/markers/markers`;

export const mapStudioButtonSkins = {
  text: {
    base: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/text-button-base.svg`,
    hover: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/text-button-hover.svg`,
    selected: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/text-button-selected.svg`,
    disabled: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/text-button-disabled.svg`,
    danger: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/text-button-danger.svg`,
  },
  icon: {
    base: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/icon-button-base.svg`,
    hover: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/icon-button-hover.svg`,
    selected: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/icon-button-selected.svg`,
    disabled: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/icon-button-disabled.svg`,
    danger: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/buttons/icon-button-danger.svg`,
  },
} as const;

export const mapStudioCoreIcons = {
  region: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/region.svg`,
  place: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/place.svg`,
  route: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/route.svg`,
  import: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/import.svg`,
  layer: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/layers.svg`,
  ai: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/ai.svg`,
  favorite: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/favorite.svg`,
  food: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/food.svg`,
  hotel: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/core/hotel.svg`,
} as const;

export const mapStudioToolbarIcons = {
  zoomIn: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/zoom-in.svg`,
  zoomOut: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/zoom-out.svg`,
  locate: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/locate.svg`,
  layers: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/layers.svg`,
  filter: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/filter.svg`,
  measure: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/measure.svg`,
  boxSelect: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/box-select.svg`,
  reset: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/reset.svg`,
  help: `${MAP_STUDIO_BUTTON_ASSET_ROOT}/icons/toolbar/help.svg`,
} as const;

export const mapStudioStatusIcons = {
  days: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/days.svg`,
  budget: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/budget.svg`,
  candidate: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/candidate.svg`,
  planned: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/planned.svg`,
  density: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/density.svg`,
  save: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/save.svg`,
  version: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/version.svg`,
  city: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/status/city.svg`,
} as const;

export const mapStudioNavIcons = {
  back: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/back.svg`,
  workspace: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/workspace.svg`,
  account: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/account.svg`,
  itinerary: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/itinerary.svg`,
  settings: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/settings.svg`,
  exit: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/exit.svg`,
  wanderlyLogo: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/nav/wanderly-logo.svg`,
} as const;

export const mapStudioScheduleIcons = {
  day: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/day.svg`,
  morning: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/morning.svg`,
  afternoon: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/afternoon.svg`,
  night: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/night.svg`,
  addCandidate: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/add-candidate.svg`,
  writeIn: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/write-in.svg`,
  undo: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/undo.svg`,
  route: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/route.svg`,
  import: `${MAP_STUDIO_UI_ASSET_BATCH_2_ROOT}/icons/schedule/import.svg`,
} as const;

export const mapStudioIcons = {
  region: `${MAP_STUDIO_ASSET_ROOT}/icons/region.svg`,
  place: `${MAP_STUDIO_ASSET_ROOT}/icons/place.svg`,
  route: `${MAP_STUDIO_ASSET_ROOT}/icons/route.svg`,
  import: `${MAP_STUDIO_ASSET_ROOT}/icons/import.svg`,
  ai: `${MAP_STUDIO_ASSET_ROOT}/icons/ai.svg`,
  favorite: `${MAP_STUDIO_ASSET_ROOT}/icons/favorite.svg`,
  food: `${MAP_STUDIO_ASSET_ROOT}/icons/food.svg`,
  hotel: `${MAP_STUDIO_ASSET_ROOT}/icons/hotel.svg`,
  layers: `${MAP_STUDIO_ASSET_ROOT}/icons/layers.svg`,
  filter: `${MAP_STUDIO_ASSET_ROOT}/icons/filter.svg`,
  measure: `${MAP_STUDIO_ASSET_ROOT}/icons/measure.svg`,
  lasso: `${MAP_STUDIO_ASSET_ROOT}/icons/lasso.svg`,
  reset: `${MAP_STUDIO_ASSET_ROOT}/icons/reset.svg`,
  help: `${MAP_STUDIO_ASSET_ROOT}/icons/help.svg`,
  zoomIn: `${MAP_STUDIO_ASSET_ROOT}/icons/zoom_in.svg`,
  zoomOut: `${MAP_STUDIO_ASSET_ROOT}/icons/zoom_out.svg`,
  locate: `${MAP_STUDIO_ASSET_ROOT}/icons/locate.svg`,
  writeBack: `${MAP_STUDIO_ASSET_ROOT}/icons/write_back.svg`,
  undo: `${MAP_STUDIO_ASSET_ROOT}/icons/undo.svg`,
} as const;

export const cityCoverAssets = {
  shenzhen: `${MAP_STUDIO_ASSET_ROOT}/cities/shenzhen.jpg`,
  beijing: `${MAP_STUDIO_ASSET_ROOT}/cities/beijing.jpg`,
  shanghai: `${MAP_STUDIO_ASSET_ROOT}/cities/shanghai.jpg`,
  hangzhou: `${MAP_STUDIO_ASSET_ROOT}/cities/hangzhou.jpg`,
  xian: `${MAP_STUDIO_ASSET_ROOT}/cities/xian.jpg`,
  chengdu: `${MAP_STUDIO_ASSET_ROOT}/cities/chengdu.jpg`,
  guangzhou: `${MAP_STUDIO_ASSET_ROOT}/cities/guangzhou.jpg`,
  xiamen: `${MAP_STUDIO_ASSET_ROOT}/cities/xiamen.jpg`,
} as const;

export const regionImageAssets = {
  shekouSeaWorld: `${MAP_STUDIO_ASSET_ROOT}/regions/shekou_sea_world.jpg`,
  shenzhenBayHouhai: `${MAP_STUDIO_ASSET_ROOT}/regions/shenzhen_bay_houhai.jpg`,
  octHuaqiaocheng: `${MAP_STUDIO_ASSET_ROOT}/regions/oct_huaqiaocheng.jpg`,
  futianCenter: `${MAP_STUDIO_ASSET_ROOT}/regions/futian_center.jpg`,
  luohuDongmen: `${MAP_STUDIO_ASSET_ROOT}/regions/luohu_dongmen.jpg`,
  dapengCoast: `${MAP_STUDIO_ASSET_ROOT}/regions/dapeng_coast.jpg`,
  yantianSeaside: `${MAP_STUDIO_ASSET_ROOT}/regions/yantian_seaside.jpg`,
  nanshanTech: `${MAP_STUDIO_ASSET_ROOT}/regions/nanshan_tech.jpg`,
} as const;

export const placeImageAssets = {
  windowOfTheWorld: `${MAP_STUDIO_ASSET_ROOT}/places/window_of_the_world.jpg`,
  happyCoast: `${MAP_STUDIO_ASSET_ROOT}/places/happy_coast.jpg`,
  shenzhenBayPark: `${MAP_STUDIO_ASSET_ROOT}/places/shenzhen_bay_park.jpg`,
  seaWorld: `${MAP_STUDIO_ASSET_ROOT}/places/sea_world.jpg`,
  pingAnFinanceCenter: `${MAP_STUDIO_ASSET_ROOT}/places/ping_an_finance_center.jpg`,
  jiaochangwei: `${MAP_STUDIO_ASSET_ROOT}/places/jiaochangwei.jpg`,
  yangmeikeng: `${MAP_STUDIO_ASSET_ROOT}/places/yangmeikeng.jpg`,
  dapengFortress: `${MAP_STUDIO_ASSET_ROOT}/places/dapeng_fortress.jpg`,
  xichongBeach: `${MAP_STUDIO_ASSET_ROOT}/places/xichong_beach.jpg`,
  octLoft: `${MAP_STUDIO_ASSET_ROOT}/places/oct_loft.jpg`,
  happyValley: `${MAP_STUDIO_ASSET_ROOT}/places/happy_valley.jpg`,
  splendidChina: `${MAP_STUDIO_ASSET_ROOT}/places/splendid_china.jpg`,
  nanhaiEcool: `${MAP_STUDIO_ASSET_ROOT}/places/nanhai_ecool.jpg`,
  shekouOldStreet: `${MAP_STUDIO_ASSET_ROOT}/places/shekou_old_street.jpg`,
  valueFactory: `${MAP_STUDIO_ASSET_ROOT}/places/value_factory.jpg`,
  talentPark: `${MAP_STUDIO_ASSET_ROOT}/places/talent_park.jpg`,
  houhaiCenter: `${MAP_STUDIO_ASSET_ROOT}/places/houhai_center.jpg`,
  civicCenter: `${MAP_STUDIO_ASSET_ROOT}/places/civic_center.jpg`,
  lianhuaMountainPark: `${MAP_STUDIO_ASSET_ROOT}/places/lianhua_mountain_park.jpg`,
  shenzhenMuseum: `${MAP_STUDIO_ASSET_ROOT}/places/shenzhen_museum.jpg`,
  dameisha: `${MAP_STUDIO_ASSET_ROOT}/places/dameisha.jpg`,
  yantianBoardwalk: `${MAP_STUDIO_ASSET_ROOT}/places/yantian_boardwalk.jpg`,
  chungYingStreet: `${MAP_STUDIO_ASSET_ROOT}/places/chung_ying_street.jpg`,
  haishanPark: `${MAP_STUDIO_ASSET_ROOT}/places/haishan_park.jpg`,
  wutongMountain: `${MAP_STUDIO_ASSET_ROOT}/places/wutong_mountain.jpg`,
  fairyLakeBotanicalGarden: `${MAP_STUDIO_ASSET_ROOT}/places/fairy_lake_botanical_garden.jpg`,
  dongmenOldStreet: `${MAP_STUDIO_ASSET_ROOT}/places/dongmen_old_street.jpg`,
  honghuPark: `${MAP_STUDIO_ASSET_ROOT}/places/honghu_park.jpg`,
} as const;

export const mapStateAssets = {
  emptyCandidates: `${MAP_STUDIO_ASSET_ROOT}/states/empty_candidates.svg`,
  emptyRoute: `${MAP_STUDIO_ASSET_ROOT}/states/empty_route.svg`,
  loadingMapScan: `${MAP_STUDIO_ASSET_ROOT}/states/loading_map_scan.svg`,
  unavailableCity: `${MAP_STUDIO_ASSET_ROOT}/states/unavailable_city.svg`,
  destinationPending: `${MAP_STUDIO_ASSET_ROOT}/states/destination_pending.svg`,
} as const;

export const markerAssets = {
  placeMarker: `${MAP_STUDIO_ASSET_ROOT}/markers/place_marker.svg`,
  candidateMarker: `${MAP_STUDIO_ASSET_ROOT}/markers/candidate_marker.svg`,
  plannedMarker: `${MAP_STUDIO_ASSET_ROOT}/markers/planned_marker.svg`,
  foodMarker: `${MAP_STUDIO_ASSET_ROOT}/markers/food_marker.svg`,
  hotelMarker: `${MAP_STUDIO_ASSET_ROOT}/markers/hotel_marker.svg`,
  transportMarker: `${MAP_STUDIO_ASSET_ROOT}/markers/transport_marker.svg`,
  regionAnchor: `${MAP_STUDIO_ASSET_ROOT}/markers/region_anchor.svg`,
} as const;

export const mapStudioMarkerIcons = {
  attraction: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-attraction.svg`,
  food: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-food.svg`,
  hotel: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-hotel.svg`,
  transport: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-transport.svg`,
  favorite: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-favorite.svg`,
  candidate: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-candidate.svg`,
  planned: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-planned.svg`,
  unresolved: `${MAP_STUDIO_MARKER_ASSET_ROOT}/marker-unresolved.svg`,
} as const;

export const routePreviewAssets = {
  traveler: `${MAP_STUDIO_ASSET_ROOT}/route-preview/traveler.glb`,
  train: `${MAP_STUDIO_ASSET_ROOT}/route-preview/train.glb`,
  plane: `${MAP_STUDIO_ASSET_ROOT}/route-preview/plane.glb`,
  car: `${MAP_STUDIO_ASSET_ROOT}/route-preview/car.glb`,
  routeGlow: `${MAP_STUDIO_ASSET_ROOT}/route-preview/route_glow.png`,
  arrivalBurst: `${MAP_STUDIO_ASSET_ROOT}/route-preview/arrival_burst.png`,
  startPin: `${MAP_STUDIO_ASSET_ROOT}/route-preview/start_pin.glb`,
  endPin: `${MAP_STUDIO_ASSET_ROOT}/route-preview/end_pin.glb`,
} as const;

export const mapStudioAssets = {
  buttonSkins: mapStudioButtonSkins,
  coreIcons: mapStudioCoreIcons,
  toolbarIcons: mapStudioToolbarIcons,
  statusIcons: mapStudioStatusIcons,
  navIcons: mapStudioNavIcons,
  scheduleIcons: mapStudioScheduleIcons,
  icons: mapStudioIcons,
  cities: cityCoverAssets,
  regions: regionImageAssets,
  places: placeImageAssets,
  states: mapStateAssets,
  markers: markerAssets,
  markerIcons: mapStudioMarkerIcons,
  routePreview: routePreviewAssets,
} as const;

export type MapStudioButtonSkinKind = keyof typeof mapStudioButtonSkins;
export type MapStudioButtonSkinState = keyof typeof mapStudioButtonSkins.text;
export type MapStudioCoreIconKey = keyof typeof mapStudioCoreIcons;
export type MapStudioToolbarIconKey = keyof typeof mapStudioToolbarIcons;
export type MapStudioStatusIconKey = keyof typeof mapStudioStatusIcons;
export type MapStudioNavIconKey = keyof typeof mapStudioNavIcons;
export type MapStudioScheduleIconKey = keyof typeof mapStudioScheduleIcons;
export type MapStudioIconKey = keyof typeof mapStudioIcons;
export type CityAssetKey = keyof typeof cityCoverAssets;
export type RegionAssetKey = keyof typeof regionImageAssets;
export type PlaceAssetKey = keyof typeof placeImageAssets;
export type MapStateAssetKey = keyof typeof mapStateAssets;
export type MarkerAssetKey = keyof typeof markerAssets;
export type MapStudioMarkerIconKey = keyof typeof mapStudioMarkerIcons;
export type RoutePreviewAssetKey = keyof typeof routePreviewAssets;

export const mapStudioAssetFallback = {
  title: "Map Studio asset pending",
  description: "Future visual asset slot",
  tone: "dark-metal",
} as const;

const cityAssetKeyByName: Record<string, CityAssetKey> = {
  shenzhen: "shenzhen",
  深圳: "shenzhen",
  beijing: "beijing",
  北京: "beijing",
  shanghai: "shanghai",
  上海: "shanghai",
  hangzhou: "hangzhou",
  杭州: "hangzhou",
  xian: "xian",
  西安: "xian",
  chengdu: "chengdu",
  成都: "chengdu",
  guangzhou: "guangzhou",
  广州: "guangzhou",
  xiamen: "xiamen",
  厦门: "xiamen",
};

export const regionAssetKeyByRegionId: Record<string, RegionAssetKey> = {
  shekou_sea_world: "shekouSeaWorld",
  shenzhen_bay_houhai: "shenzhenBayHouhai",
  oct_huaqiaocheng: "octHuaqiaocheng",
  futian_center: "futianCenter",
  luohu_dongmen: "luohuDongmen",
  dapeng_coast: "dapengCoast",
  yantian_seaside: "yantianSeaside",
  nanshan_tech: "nanshanTech",
};

export const placeAssetKeyByPlaceId: Record<string, PlaceAssetKey> = {
  "sz-place-window-world": "windowOfTheWorld",
  "sz-place-happy-coast": "happyCoast",
  "sz-place-bay-park": "shenzhenBayPark",
  "sz-place-sea-world": "seaWorld",
  "sz-place-pingan": "pingAnFinanceCenter",
  "sz-place-jiaochangwei": "jiaochangwei",
  "sz-place-yangmeikeng": "yangmeikeng",
  "sz-place-dapeng-fortress": "dapengFortress",
  "sz-place-xichong": "xichongBeach",
  "sz-place-oct-loft": "octLoft",
  "sz-place-happy-valley": "happyValley",
  "sz-place-splendid-china": "splendidChina",
  "sz-place-nanhai-ecool": "nanhaiEcool",
  "sz-place-shekou-old-street": "shekouOldStreet",
  "sz-place-value-factory": "valueFactory",
  "sz-place-talent-park": "talentPark",
  "sz-place-houhai": "houhaiCenter",
  "sz-place-civic-center": "civicCenter",
  "sz-place-lianhua": "lianhuaMountainPark",
  "sz-place-sz-museum": "shenzhenMuseum",
  "sz-place-dameisha": "dameisha",
  "sz-place-yantian-boardwalk": "yantianBoardwalk",
  "sz-place-chung-ying": "chungYingStreet",
  "sz-place-haishan": "haishanPark",
  "sz-place-wutong": "wutongMountain",
  "sz-place-fairy-lake": "fairyLakeBotanicalGarden",
  "sz-place-dongmen": "dongmenOldStreet",
  "sz-place-honghu": "honghuPark",
};

export function getCityCoverAsset(city: string | undefined) {
  const key = city ? cityAssetKeyByName[city.trim().toLowerCase()] ?? cityAssetKeyByName[city.trim()] : undefined;

  return key ? cityCoverAssets[key] : undefined;
}

export function getRegionImageAsset(regionId: string | undefined) {
  const key = regionId ? regionAssetKeyByRegionId[regionId] : undefined;

  return key ? regionImageAssets[key] : undefined;
}

export function getPlaceImageAsset(placeId: string | undefined) {
  const key = placeId ? placeAssetKeyByPlaceId[placeId] : undefined;

  return key ? placeImageAssets[key] : undefined;
}
