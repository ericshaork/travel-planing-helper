import type { InspirationFacetKey, InspirationSelection } from "./types";

export interface InspirationOption {
  label: string;
  keywords: string[];
}

export interface InspirationCategoryConfig {
  key: InspirationFacetKey;
  title: string;
  description: string;
  panelTitle: string;
  panelPrompt: string;
  accentClassName: string;
  options: InspirationOption[];
}

export const INSPIRATION_CATEGORY_CONFIG: InspirationCategoryConfig[] = [
  {
    key: "location",
    title: "地点",
    description: "先选你想进入的风景和城市气质，再决定这趟旅程往哪边长。",
    panelTitle: "地点灵感",
    panelPrompt: "先挑几个你想靠近的风景和城市感觉。",
    accentClassName:
      "border-[rgba(205,221,198,0.92)] bg-[rgba(233,242,228,0.68)] text-[var(--sage-deep)]",
    options: [
      { label: "海边", keywords: ["海边", "海滨", "coast", "beach", "coastal"] },
      { label: "古城", keywords: ["古城", "古镇", "old town", "old-town", "heritage"] },
      { label: "山谷", keywords: ["山谷", "峡谷", "valley", "canyon"] },
      { label: "草原", keywords: ["草原", "grassland"] },
      { label: "雨林", keywords: ["雨林", "森林", "rainforest", "forest"] },
      { label: "湖泊", keywords: ["湖泊", "湖", "lake"] },
      { label: "雪山", keywords: ["雪山", "snow mountain", "snow-mountain"] },
      { label: "城市漫步", keywords: ["城市漫步", "citywalk", "city walk", "city"] },
      { label: "海岛", keywords: ["海岛", "island"] },
      { label: "江南水乡", keywords: ["江南水乡", "水乡", "jiangnan", "canal", "waterside"] },
    ],
  },
  {
    key: "food",
    title: "美食",
    description: "让味道先带路，路线和停顿会更像一个真正想去的版本。",
    panelTitle: "美食灵感",
    panelPrompt: "选几样最想为了它多停一站的味道。",
    accentClassName:
      "border-[rgba(244,221,209,0.96)] bg-[rgba(247,228,216,0.74)] text-[var(--clay-deep)]",
    options: [
      { label: "小吃", keywords: ["小吃", "snack", "street snack"] },
      { label: "火锅", keywords: ["火锅", "hotpot", "spicy"] },
      { label: "早茶", keywords: ["早茶", "morning tea", "yum cha"] },
      { label: "面食", keywords: ["面食", "noodle", "noodles"] },
      { label: "米粉", keywords: ["米粉", "rice noodles", "noodles"] },
      { label: "海鲜", keywords: ["海鲜", "seafood"] },
      { label: "夜市", keywords: ["夜市", "night market", "market"] },
      { label: "甜品", keywords: ["甜品", "dessert", "sweet"] },
      { label: "茶馆", keywords: ["茶馆", "tea house", "teahouse", "tea"] },
      { label: "市集", keywords: ["市集", "market", "street food", "stall"] },
    ],
  },
  {
    key: "season",
    title: "季节",
    description: "有时候不是去哪最重要，而是这趟想要什么样的空气和节奏。",
    panelTitle: "季节灵感",
    panelPrompt: "按这次想要的气温、颜色和节奏来选。",
    accentClassName:
      "border-[rgba(225,220,234,0.96)] bg-[rgba(232,229,238,0.72)] text-[#5f5b70]",
    options: [
      { label: "春", keywords: ["春", "春日", "赏花", "spring", "flower"] },
      { label: "夏", keywords: ["夏", "夏日", "避暑", "summer", "cool escape"] },
      { label: "秋", keywords: ["秋", "秋日", "银杏", "autumn", "ginkgo"] },
      { label: "冬", keywords: ["冬", "冬日", "温泉", "winter", "hot spring"] },
    ],
  },
  {
    key: "companion",
    title: "同行",
    description: "同一个城市，和谁一起去，走出来会是完全不同的版本。",
    panelTitle: "同行方式",
    panelPrompt: "想想这次和谁出发，路线会马上变得不一样。",
    accentClassName:
      "border-[rgba(226,221,205,0.92)] bg-[rgba(241,235,221,0.72)] text-[#756248]",
    options: [
      { label: "独游", keywords: ["独游", "一个人", "solo", "独旅"] },
      { label: "情侣", keywords: ["情侣", "couple"] },
      { label: "朋友", keywords: ["朋友", "friends"] },
      { label: "亲子", keywords: ["亲子", "kids"] },
      { label: "家庭", keywords: ["家庭", "family"] },
      { label: "同学", keywords: ["同学", "毕业旅行", "classmates", "graduate", "student"] },
      { label: "闺蜜", keywords: ["闺蜜", "besties", "friends"] },
      { label: "团建", keywords: ["团建", "team", "company trip"] },
      { label: "摄影", keywords: ["摄影", "摄影旅行", "photo", "camera"] },
      { label: "长辈同行", keywords: ["长辈同行", "长辈", "elders", "parents"] },
    ],
  },
];

const CATEGORY_BY_KEY = Object.fromEntries(
  INSPIRATION_CATEGORY_CONFIG.map((category) => [category.key, category]),
) as Record<InspirationFacetKey, InspirationCategoryConfig>;

export function getInspirationCategoryConfig(key: InspirationFacetKey) {
  return CATEGORY_BY_KEY[key];
}

export function getInspirationSelectionCount(selection: InspirationSelection) {
  return (
    (selection.location?.length ?? 0) +
    (selection.food?.length ?? 0) +
    (selection.season?.length ?? 0) +
    (selection.companion?.length ?? 0)
  );
}

export function getSelectedInspirationLabels(selection: InspirationSelection) {
  return [
    ...(selection.location ?? []),
    ...(selection.food ?? []),
    ...(selection.season ?? []),
    ...(selection.companion ?? []),
  ];
}

export function toggleInspirationSelection(
  selection: InspirationSelection,
  key: InspirationFacetKey,
  label: string,
): InspirationSelection {
  const current = selection[key] ?? [];
  const nextValues = current.includes(label)
    ? current.filter((value) => value !== label)
    : [...current, label];

  return {
    ...selection,
    [key]: nextValues,
  };
}

export function clearInspirationSelection(): InspirationSelection {
  return {};
}

export function getInspirationSearchKeywords(selection: InspirationSelection) {
  const labels = getSelectedInspirationLabels(selection);

  return labels.flatMap((label) => {
    const category = INSPIRATION_CATEGORY_CONFIG.find((group) =>
      group.options.some((option) => option.label === label),
    );
    const option = category?.options.find((candidate) => candidate.label === label);

    return option ? option.keywords : [label];
  });
}
