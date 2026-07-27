import type { ExploreTripContent, ExploreTripListItem } from "./types";

const CITY_DISPLAY_NAMES: Record<string, string> = {
  beijing: "北京",
  hangzhou: "杭州",
  chengdu: "成都",
  shanghai: "上海",
  xian: "西安",
};

const CITY_ALIASES: Record<string, string> = {
  beijing: "beijing",
  "北京": "beijing",
  "鍖椾含": "beijing",
  hangzhou: "hangzhou",
  "杭州": "hangzhou",
  "鏉窞": "hangzhou",
  chengdu: "chengdu",
  "成都": "chengdu",
  "鎴愰兘": "chengdu",
  shanghai: "shanghai",
  "上海": "shanghai",
  "涓婃捣": "shanghai",
  xian: "xian",
  "xi'an": "xian",
  "西安": "xian",
  "瑗垮畨": "xian",
};

function normalizeCityLookupKey(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
}

export function getExploreCityKey(
  value: string | undefined,
  cityCode?: string,
) {
  const codeKey = normalizeCityLookupKey(cityCode);
  const valueKey = normalizeCityLookupKey(value);

  return (CITY_ALIASES[codeKey] ?? CITY_ALIASES[valueKey] ?? codeKey) || valueKey;
}

export function displayCityName(value: string | undefined, cityCode?: string) {
  const key = getExploreCityKey(value, cityCode);
  return CITY_DISPLAY_NAMES[key] ?? value?.trim() ?? "";
}

export function normalizeExploreListItemDisplay(
  item: ExploreTripListItem,
): ExploreTripListItem {
  const city = displayCityName(item.city, item.cityCode);
  const region = item.region ? displayCityName(item.region, item.cityCode) : item.region;

  return {
    ...item,
    city,
    region,
  };
}

export function normalizeExploreContentDisplay(
  item: ExploreTripContent,
): ExploreTripContent {
  const city = displayCityName(item.city, item.cityCode);
  const region = item.region ? displayCityName(item.region, item.cityCode) : item.region;

  return {
    ...item,
    city,
    region,
  };
}
