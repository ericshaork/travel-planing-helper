import "server-only";

import beijingInventory from "../../inventories/beijing.city_inventory.json";
import chengduInventory from "../../inventories/chengdu.city_inventory.json";
import hangzhouInventory from "../../inventories/hangzhou.city_inventory.json";
import shanghaiInventory from "../../inventories/shanghai.city_inventory.json";
import xianInventory from "../../inventories/xian.city_inventory.json";

type RawInventoryAsset = {
  asset_id?: string;
  asset_name?: string;
  asset_category?: string;
  asset_family?: string;
  route_role?: string;
  time_of_day?: string[];
  pace_hint?: string;
  traveler_fit?: string[];
  priority?: number;
};

type RawInventory = {
  city?: { code?: string; name?: string; region?: string };
  assets?: RawInventoryAsset[];
};

export interface CityGroundingAsset {
  assetId: string;
  nameZh: string;
  nameEn: string;
  category: string;
  family: string;
  routeRole: string;
  timeOfDay: string[];
  paceHint: string;
  travelerFit: string[];
}

export interface CityGroundingCatalog {
  cityCode: string;
  cityLabelZh: string;
  regionLabelZh: string;
  aliases: string[];
  assets: CityGroundingAsset[];
}

const CHINESE_ASSET_NAMES: Record<string, string> = {
  // Beijing
  ca_beijing_forbidden_city: "故宫博物院",
  ca_beijing_jingshan_park: "景山公园",
  ca_beijing_beihai_park: "北海公园",
  ca_beijing_shichahai: "什刹海",
  ca_beijing_liangma_river: "亮马河（亮马河风情水岸）",
  ca_beijing_guomao_cbd: "国贸 CBD（国贸商圈）",
  ca_beijing_traditional_food: "北京传统京味餐（烤鸭、炸酱面、老北京小吃）",
  // Shanghai
  ca_shanghai_bund: "外滩",
  ca_shanghai_lujiazui: "陆家嘴",
  ca_shanghai_suzhou_creek: "苏州河沿岸步道",
  ca_shanghai_wukang_road: "武康路（武康大楼周边）",
  ca_shanghai_local_food: "上海本帮菜（生煎、小笼、蟹粉、本帮红烧）",
  ca_shanghai_huangpu_evening: "黄浦江夜游 / 外滩夜景步道",
  ca_shanghai_city_mood: "上海梧桐区街景漫步",
  // Chengdu
  ca_chengdu_peoples_park_teahouse: "人民公园鹤鸣茶社",
  ca_chengdu_kuanzhai_alley: "宽窄巷子",
  ca_chengdu_taikoo_li: "成都远洋太古里",
  ca_chengdu_chuanchuan_snacks: "成都串串与小吃（如玉林串串、乐山钵钵鸡）",
  ca_chengdu_hotpot_table: "成都火锅（如小龙坎、蜀大侠、大龙燚）",
  ca_chengdu_wangping_street: "望平街 / 猛追湾滨河",
  ca_chengdu_city_mood: "成都街景漫步（春熙路、玉林片区）",
  ca_chengdu_gaiwan_tea_experience: "成都盖碗茶馆体验（如彭镇观音阁老茶馆）",
  // Hangzhou
  ca_hangzhou_west_lake: "西湖（断桥、白堤、湖滨）",
  ca_hangzhou_su_causeway: "苏堤",
  ca_hangzhou_longjing_tea_fields: "龙井茶园（龙井村、梅家坞）",
  ca_hangzhou_xiaohe_straight_street: "小河直街 / 桥西直街小吃",
  ca_hangzhou_lakeside_evening: "湖滨黄昏步道 / 西湖音乐喷泉",
  ca_hangzhou_city_mood: "杭州街景漫步（南山路、湖滨路）",
  ca_hangzhou_lingyin_temple: "灵隐寺 / 飞来峰",
  // Xi'an
  ca_xian_city_wall: "西安城墙",
  ca_xian_big_wild_goose_pagoda: "大雁塔（大慈恩寺）",
  ca_xian_bell_drum_tower: "钟楼与鼓楼片区",
  ca_xian_terracotta_warriors: "秦始皇兵马俑博物馆",
  ca_xian_muslim_quarter_food: "回民街（北院门小吃街）",
  ca_xian_biangbiang_noodles: "biangbiang 面 / 陕西面食（如老米家、樊记腊汁肉夹馍）",
  ca_xian_city_wall_night: "西安城墙夜游（含永宁门光影秀）",
};

const CITY_METADATA: Record<
  string,
  { labelZh: string; regionZh: string; aliases: string[] }
> = {
  beijing: {
    labelZh: "北京",
    regionZh: "北京",
    aliases: ["北京", "北京市", "beijing", "peking"],
  },
  shanghai: {
    labelZh: "上海",
    regionZh: "上海",
    aliases: ["上海", "上海市", "shanghai"],
  },
  chengdu: {
    labelZh: "成都",
    regionZh: "四川",
    aliases: ["成都", "成都市", "chengdu"],
  },
  hangzhou: {
    labelZh: "杭州",
    regionZh: "浙江",
    aliases: ["杭州", "杭州市", "hangzhou"],
  },
  xian: {
    labelZh: "西安",
    regionZh: "陕西",
    aliases: ["西安", "西安市", "xian", "xi'an", "xi an"],
  },
};

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function toGroundingAsset(raw: RawInventoryAsset): CityGroundingAsset | null {
  const assetId = raw.asset_id?.trim();
  const nameEn = raw.asset_name?.trim();

  if (!assetId || !nameEn) {
    return null;
  }

  const nameZh = CHINESE_ASSET_NAMES[assetId] ?? nameEn;

  return {
    assetId,
    nameZh,
    nameEn,
    category: raw.asset_category?.trim() ?? "other",
    family: raw.asset_family?.trim() ?? "other",
    routeRole: raw.route_role?.trim() ?? "supporting_stop",
    timeOfDay: Array.isArray(raw.time_of_day)
      ? raw.time_of_day.map((value) => value.trim()).filter(Boolean)
      : [],
    paceHint: raw.pace_hint?.trim() ?? "balanced",
    travelerFit: Array.isArray(raw.traveler_fit)
      ? raw.traveler_fit.map((value) => value.trim()).filter(Boolean)
      : [],
  };
}

function buildCatalog(
  inventory: RawInventory,
  cityCode: keyof typeof CITY_METADATA,
): CityGroundingCatalog {
  const metadata = CITY_METADATA[cityCode];
  const assets = (inventory.assets ?? [])
    .map(toGroundingAsset)
    .filter((asset): asset is CityGroundingAsset => asset !== null)
    .sort((left, right) => {
      const leftPriority =
        typeof left.family === "string" && left.family === "signature_anchor"
          ? 0
          : 1;
      const rightPriority =
        typeof right.family === "string" && right.family === "signature_anchor"
          ? 0
          : 1;
      return leftPriority - rightPriority;
    });

  return {
    cityCode,
    cityLabelZh: metadata.labelZh,
    regionLabelZh: metadata.regionZh,
    aliases: metadata.aliases,
    assets,
  };
}

const CATALOGS: CityGroundingCatalog[] = [
  buildCatalog(beijingInventory as RawInventory, "beijing"),
  buildCatalog(shanghaiInventory as RawInventory, "shanghai"),
  buildCatalog(chengduInventory as RawInventory, "chengdu"),
  buildCatalog(hangzhouInventory as RawInventory, "hangzhou"),
  buildCatalog(xianInventory as RawInventory, "xian"),
];

const ALIAS_INDEX = new Map<string, CityGroundingCatalog>();

for (const catalog of CATALOGS) {
  for (const alias of catalog.aliases) {
    ALIAS_INDEX.set(normalizeAlias(alias), catalog);
  }
}

export function listCityGroundingCatalogs(): CityGroundingCatalog[] {
  return CATALOGS;
}

export function findCityGrounding(
  destinationCity: string | undefined | null,
): CityGroundingCatalog | null {
  if (!destinationCity) {
    return null;
  }

  const normalized = normalizeAlias(destinationCity);
  if (!normalized) {
    return null;
  }

  const direct = ALIAS_INDEX.get(normalized);
  if (direct) {
    return direct;
  }

  for (const [alias, catalog] of ALIAS_INDEX) {
    if (normalized.includes(alias)) {
      return catalog;
    }
  }

  return null;
}

function formatAssetLine(asset: CityGroundingAsset): string {
  const timeOfDay =
    asset.timeOfDay.length > 0 ? asset.timeOfDay.join("/") : "any";
  return `- ${asset.nameZh}｜类型:${asset.category}｜角色:${asset.routeRole}｜时段:${timeOfDay}｜节奏:${asset.paceHint}`;
}

export function buildCityGroundingPromptSection(
  catalog: CityGroundingCatalog,
): string {
  const places = catalog.assets.filter((asset) => asset.category === "place");
  const foods = catalog.assets.filter((asset) => asset.category === "food");
  const experiences = catalog.assets.filter(
    (asset) => asset.category === "experience",
  );
  const moods = catalog.assets.filter(
    (asset) => asset.category === "city_mood",
  );

  const sections: string[] = [];

  if (places.length > 0) {
    sections.push("景点/地标：");
    for (const asset of places) {
      sections.push(formatAssetLine(asset));
    }
  }

  if (foods.length > 0) {
    sections.push("餐食参考：");
    for (const asset of foods) {
      sections.push(formatAssetLine(asset));
    }
  }

  if (experiences.length > 0) {
    sections.push("特色体验：");
    for (const asset of experiences) {
      sections.push(formatAssetLine(asset));
    }
  }

  if (moods.length > 0) {
    sections.push("城市氛围提示：");
    for (const asset of moods) {
      sections.push(formatAssetLine(asset));
    }
  }

  return sections.join("\n");
}
