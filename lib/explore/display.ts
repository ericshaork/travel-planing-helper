import type { ExploreTripContent, ExploreTripListItem } from "./types";

type ExploreDisplayTarget = Pick<
  ExploreTripListItem | ExploreTripContent,
  "slug" | "title" | "city" | "cityCode"
>;

// v1.8 Explore currently ships China-only content. Some older mock archives do
// not carry normalized region/country metadata yet, so we use a central cityCode
// allowlist as a safe transition rule instead of scattering ad-hoc checks in UI.
const V18_ALLOWED_EXPLORE_CITY_CODES = new Set([
  "beijing",
  "changsha",
  "chengdu",
  "chongqing",
  "dali",
  "dalian",
  "dunhuang",
  "fuzhou",
  "guangzhou",
  "guilin",
  "guiyang",
  "haikou",
  "hangzhou",
  "harbin",
  "hefei",
  "hong-kong",
  "jinan",
  "jingdezhen",
  "kashgar",
  "kunming",
  "lhasa",
  "lijiang",
  "luoyang",
  "macau",
  "nanchang",
  "nanjing",
  "nanning",
  "qingdao",
  "quanzhou",
  "sanya",
  "shanghai",
  "shenzhen",
  "suzhou",
  "taipei",
  "taiyuan",
  "tianjin",
  "urumqi",
  "wuhan",
  "xiamen",
  "xian",
  "yangzhou",
  "yanji",
  "zhengzhou",
  "zhuhai",
]);

const V18_BLOCKED_EXPLORE_KEYWORDS = [
  "kyoto",
  "paris",
  "tokyo",
  "rome",
  "京都",
  "巴黎",
  "东京",
  "罗马",
];

function normalizeText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isV18ExploreVisibleArchive(item: ExploreDisplayTarget) {
  const cityCode = normalizeText(item.cityCode);

  if (cityCode && V18_ALLOWED_EXPLORE_CITY_CODES.has(cityCode)) {
    return true;
  }

  const haystack = [item.slug, item.title, item.city]
    .map((value) => normalizeText(value))
    .join(" ");

  if (!haystack) {
    return false;
  }

  return !V18_BLOCKED_EXPLORE_KEYWORDS.some((keyword) =>
    haystack.includes(keyword),
  );
}

export function filterV18ExploreVisibleArchives<T extends ExploreDisplayTarget>(
  items: T[],
) {
  return items.filter(isV18ExploreVisibleArchive);
}

