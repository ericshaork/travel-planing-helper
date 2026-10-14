import type { InspirationFacetKey } from "./types";

export interface InspirationCardAsset {
  slug: string;
  image: string;
}

type InspirationCardAssetMap = Partial<
  Record<InspirationFacetKey, Record<string, InspirationCardAsset>>
>;

const INSPIRATION_CARD_ASSETS: InspirationCardAssetMap = {
  location: {
    海边: { slug: "seaside", image: "/images/explore/inspiration/location/location-seaside.png" },
    古城: { slug: "ancient-town", image: "/images/explore/inspiration/location/location-ancient-town.png" },
    山谷: { slug: "valley", image: "/images/explore/inspiration/location/location-valley.png" },
    草原: { slug: "grassland", image: "/images/explore/inspiration/location/location-grassland.png" },
    雨林: { slug: "rainforest", image: "/images/explore/inspiration/location/location-rainforest.png" },
    湖泊: { slug: "lake", image: "/images/explore/inspiration/location/location-lake.png" },
    雪山: { slug: "snow-mountain", image: "/images/explore/inspiration/location/location-snow-mountain.png" },
    城市漫步: { slug: "city-walk", image: "/images/explore/inspiration/location/location-city-walk.png" },
    海岛: { slug: "island", image: "/images/explore/inspiration/location/location-island.png" },
    江南水乡: {
      slug: "jiangnan-water-town",
      image: "/images/explore/inspiration/location/location-jiangnan-water-town.png",
    },
  },
  food: {
    小吃: { slug: "snacks", image: "/images/explore/inspiration/food/food-snacks.png" },
    火锅: { slug: "hot-pot", image: "/images/explore/inspiration/food/food-hot-pot.png" },
    早茶: { slug: "morning-tea", image: "/images/explore/inspiration/food/food-morning-tea.png" },
    面食: { slug: "noodles", image: "/images/explore/inspiration/food/food-noodles.png" },
    米粉: { slug: "rice-noodles", image: "/images/explore/inspiration/food/food-rice-noodles.png" },
    海鲜: { slug: "seafood", image: "/images/explore/inspiration/food/food-seafood.png" },
    夜市: { slug: "night-market", image: "/images/explore/inspiration/food/food-night-market.png" },
    甜品: { slug: "desserts", image: "/images/explore/inspiration/food/food-desserts.png" },
    茶馆: { slug: "teahouse", image: "/images/explore/inspiration/food/food-teahouse.png" },
    市集: { slug: "market", image: "/images/explore/inspiration/food/food-market.png" },
  },
  season: {
    春: { slug: "spring", image: "/images/explore/inspiration/season/season-spring.png" },
    夏: { slug: "summer", image: "/images/explore/inspiration/season/season-summer.png" },
    秋: { slug: "autumn", image: "/images/explore/inspiration/season/season-autumn.png" },
    冬: { slug: "winter", image: "/images/explore/inspiration/season/season-winter.png" },
  },
  companion: {
    独游: { slug: "solo", image: "/images/explore/inspiration/companion/companion-solo.png" },
    情侣: { slug: "couple", image: "/images/explore/inspiration/companion/companion-couple.png" },
    朋友: { slug: "friends", image: "/images/explore/inspiration/companion/companion-friends.png" },
    亲子: {
      slug: "parent-child",
      image: "/images/explore/inspiration/companion/companion-parent-child.png",
    },
    家庭: { slug: "family", image: "/images/explore/inspiration/companion/companion-family.png" },
    同学: {
      slug: "classmates",
      image: "/images/explore/inspiration/companion/companion-classmates.png",
    },
    闺蜜: { slug: "besties", image: "/images/explore/inspiration/companion/companion-besties.png" },
    团建: { slug: "team", image: "/images/explore/inspiration/companion/companion-team.png" },
    摄影: {
      slug: "photography",
      image: "/images/explore/inspiration/companion/companion-photography.png",
    },
    长辈同行: {
      slug: "elders",
      image: "/images/explore/inspiration/companion/companion-elders.png",
    },
  },
};

export function getInspirationCardAsset(
  categoryKey: InspirationFacetKey,
  label: string,
) {
  return INSPIRATION_CARD_ASSETS[categoryKey]?.[label];
}
