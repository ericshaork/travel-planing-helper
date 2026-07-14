import type { ExploreTripContent, ExploreTripListItem } from "./types";

type ArchiveSeed = {
  id: string;
  slug: string;
  city: string;
  cityCode: string;
  tripType: string;
  days: number;
  title: string;
  summary: string;
  archiveIntro: string;
  featuredReason: string;
  theme: string;
  pace: string;
  tags: string[];
  highlights: string[];
  coverImageUrl: string;
  recommendedFor: string[];
  dailyTitles: string[];
  poiNames: string[];
  foodNames: string[];
};

const archiveSeeds: ArchiveSeed[] = [
  {
    id: "mock-xian-archive",
    slug: "xian-featured-archive",
    city: "西安",
    cityCode: "xian",
    tripType: "citywalk",
    days: 3,
    title: "城墙晨风和夜市的三日慢线",
    summary: "把古城、面食和夜色留在一条不绕路的旅行笔记里，像翻一页真正的城市封面故事。",
    archiveIntro:
      "如果你第一次去西安，这份档案会先帮你抓住节奏感。它不是把景点全塞进去，而是把历史感、美食和步行体验排成一条能慢慢读下去的城市路线。",
    featuredReason: "适合第一次进 Explore 就想马上读完一份完整旅行故事的人。",
    theme: "古城漫游",
    pace: "慢节奏",
    tags: ["古城", "美食", "秋季", "情侣"],
    highlights: ["城墙晨骑", "回民街夜市", "博物馆与旧街巷"],
    coverImageUrl: "/images/explore/cities/xian-city-card.png",
    recommendedFor: ["情侣", "学生", "朋友同行"],
    dailyTitles: ["古城初见", "博物馆与街巷", "夜色收尾"],
    poiNames: ["西安城墙", "钟楼", "陕西历史博物馆"],
    foodNames: ["肉夹馍", "油泼面", "冰峰"],
  },
  {
    id: "mock-xiamen-archive",
    slug: "xiamen-coast-archive",
    city: "厦门",
    cityCode: "xiamen",
    tripType: "coast",
    days: 3,
    title: "鼓浪屿和海风排成同一页",
    summary: "海边步道、骑楼和早咖啡，适合慢慢走的轻旅行。",
    archiveIntro:
      "这份厦门档案更像一本海边手帐。它把步行、拍照和松弛节奏放在前面，适合周末想散心、也想吃点好东西的人。",
    featuredReason: "适合周末慢旅行与海边城市灵感。",
    theme: "岛城慢旅行",
    pace: "轻松",
    tags: ["海边", "拍照", "夏日", "朋友"],
    highlights: ["晨间海边步道", "鼓浪屿散步", "沙坡尾小店"],
    coverImageUrl: "/images/explore/cities/xiamen-city-card.png",
    recommendedFor: ["情侣", "朋友同行", "独旅"],
    dailyTitles: ["抵达海风里", "鼓浪屿留白", "骑楼和黄昏"],
    poiNames: ["鼓浪屿", "沙坡尾", "环岛路"],
    foodNames: ["沙茶面", "海蛎煎", "花生汤"],
  },
  {
    id: "mock-chengdu-archive",
    slug: "chengdu-food-archive",
    city: "成都",
    cityCode: "chengdu",
    tripType: "food",
    days: 3,
    title: "火锅之外的巴适城市路线",
    summary: "茶馆、菜市场和街角小店，把成都走得更松弛一些。",
    archiveIntro:
      "成都这份档案不是只围着火锅转。它更想告诉你，城市真正的迷人之处，是那种不用着急赶路、也总能吃到好东西的松弛感。",
    featuredReason: "适合把美食和城市生活感一起体验的人。",
    theme: "巴适城市",
    pace: "慢节奏",
    tags: ["火锅", "茶馆", "城市漫步", "朋友"],
    highlights: ["茶馆坐一下午", "市场和咖啡店并行", "夜色里的小吃摊"],
    coverImageUrl: "/images/explore/cities/chengdu-city-card.png",
    recommendedFor: ["朋友同行", "学生", "独旅"],
    dailyTitles: ["茶馆开场", "市场与街区", "夜色美食"],
    poiNames: ["人民公园", "宽窄巷子", "望平街"],
    foodNames: ["火锅", "钟水饺", "甜水面"],
  },
  {
    id: "mock-hangzhou-archive",
    slug: "hangzhou-lake-archive",
    city: "杭州",
    cityCode: "hangzhou",
    tripType: "citywalk",
    days: 2,
    title: "把西湖留白当成主角",
    summary: "湖边散步、龙井微雨和书店停顿，更适合慢一点的两天。",
    archiveIntro:
      "杭州适合把节奏主动放慢。你不需要排很多点位，只要保留湖边散步、茶香和几次安静停顿，这趟旅程就已经成立。",
    featuredReason: "适合想要轻复古、轻留白旅行感的人。",
    theme: "湖边留白",
    pace: "轻松",
    tags: ["湖景", "茶香", "周末", "情侣"],
    highlights: ["湖边留白", "龙井微雨", "书店停顿"],
    coverImageUrl: "/images/explore/cities/hangzhou-city-card.png",
    recommendedFor: ["情侣", "家庭", "独旅"],
    dailyTitles: ["西湖慢走", "龙井和书页"],
    poiNames: ["西湖", "龙井村", "南山路"],
    foodNames: ["片儿川", "定胜糕", "龙井茶饮"],
  },
  {
    id: "mock-beijing-archive",
    slug: "beijing-hutong-archive",
    city: "北京",
    cityCode: "beijing",
    tripType: "citywalk",
    days: 3,
    title: "胡同和城门之间的城市切片",
    summary: "把博物馆、旧城街巷和早餐摊收成一册北方档案。",
    archiveIntro:
      "北京最适合被拆成一块块城市切片来读。旧城的尺度感、博物馆的厚度和早餐摊的烟火气，组合起来比单纯打卡更有意思。",
    featuredReason: "适合第一次想读懂北京节奏的人。",
    theme: "旧城切片",
    pace: "稳妥",
    tags: ["博物馆", "胡同", "城市漫步", "家庭"],
    highlights: ["旧城清晨", "博物馆半天", "胡同晚风"],
    coverImageUrl: "/images/explore/cities/beijing-city-card.png",
    recommendedFor: ["家庭", "学生", "朋友同行"],
    dailyTitles: ["旧城清晨", "博物馆下午", "胡同傍晚"],
    poiNames: ["故宫周边", "国子监", "南锣鼓巷"],
    foodNames: ["豆汁儿", "焦圈", "铜锅涮肉"],
  },
  {
    id: "mock-shanghai-archive",
    slug: "shanghai-night-archive",
    city: "上海",
    cityCode: "shanghai",
    tripType: "citywalk",
    days: 2,
    title: "高楼之间也要留夜色散步",
    summary: "梧桐街区、河边夜景和老洋房，是更柔和的上海版本。",
    archiveIntro:
      "上海不一定要很快。把咖啡馆、书店和夜晚散步排成一条线，这份档案会更像一本可复制的周末城市样本。",
    featuredReason: "适合周末城市灵感与独自旅行。",
    theme: "梧桐夜色",
    pace: "轻松",
    tags: ["夜景", "咖啡馆", "周末", "独旅"],
    highlights: ["梧桐街区", "河边夜风", "书店停留"],
    coverImageUrl: "/images/explore/cities/shanghai-city-card.png",
    recommendedFor: ["独旅", "情侣", "朋友同行"],
    dailyTitles: ["梧桐与咖啡", "河边和夜色"],
    poiNames: ["武康路", "苏州河", "愚园路"],
    foodNames: ["生煎", "葱油拌面", "蝴蝶酥"],
  },
  {
    id: "mock-kyoto-archive",
    slug: "kyoto-walk-archive",
    city: "京都",
    cityCode: "kyoto",
    tripType: "old-town",
    days: 3,
    title: "寺院清晨与傍晚小巷同页出现",
    summary: "适合把步行、和果子店和安静街巷排成一页东方旅行杂志。",
    archiveIntro:
      "京都的魅力不在于你一天跑了多少寺院，而在于你愿不愿意给小巷、坡道和安静停顿留出空间。这份档案会帮你把这种气质保存下来。",
    featuredReason: "适合情侣与安静步行旅行。",
    theme: "古都散步",
    pace: "轻缓",
    tags: ["古都", "散步", "秋季", "情侣"],
    highlights: ["清晨寺院", "坡道散步", "黄昏和果子店"],
    coverImageUrl: "/images/landing/decoration/stamps/11-kyoto-destination-card.png",
    recommendedFor: ["情侣", "独旅", "朋友同行"],
    dailyTitles: ["清晨寺院", "坡道和小店", "黄昏河岸"],
    poiNames: ["清水寺周边", "鸭川", "祇园小路"],
    foodNames: ["抹茶甜品", "汤豆腐", "和果子"],
  },
  {
    id: "mock-paris-archive",
    slug: "paris-cafe-archive",
    city: "巴黎",
    cityCode: "paris",
    tripType: "citywalk",
    days: 3,
    title: "从地铁口开始翻开一页巴黎",
    summary: "博物馆、咖啡馆和塞纳河边的停顿，适合慢慢翻阅。",
    archiveIntro:
      "巴黎这份档案更像一本慢慢翻的画册。它不会逼你跑完所有景点，而是把光线、步行和咖啡馆窗口里的停顿保留下来。",
    featuredReason: "适合艺术与城市漫步主题。",
    theme: "左岸光线",
    pace: "从容",
    tags: ["艺术", "咖啡馆", "城市漫步", "情侣"],
    highlights: ["博物馆半日", "塞纳河边停顿", "咖啡馆窗边"],
    coverImageUrl: "/images/explore/cities/paris-city-card.png",
    recommendedFor: ["情侣", "独旅", "朋友同行"],
    dailyTitles: ["博物馆日", "左岸散步", "桥边黄昏"],
    poiNames: ["塞纳河", "拉丁区", "奥赛周边"],
    foodNames: ["可颂", "洋葱汤", "法式甜点"],
  },
  {
    id: "mock-tokyo-archive",
    slug: "tokyo-district-archive",
    city: "东京",
    cityCode: "tokyo",
    tripType: "city",
    days: 3,
    title: "把巨大都市拆成安静的小路线",
    summary: "从街区切片入手，在高密度城市里给自己留一点喘息。",
    archiveIntro:
      "东京如果一次塞太满，很容易只剩下赶路。这份档案会把它拆成几个更容易呼吸的街区切片，让第一次去的人也能读懂这座城市。",
    featuredReason: "适合第一次去东京的城市探索。",
    theme: "都市切片",
    pace: "平衡",
    tags: ["都市", "夜色", "街区", "独旅"],
    highlights: ["街区切片", "深夜便利店", "高架下散步"],
    coverImageUrl: "/images/explore/cities/tokyo-city-card.png",
    recommendedFor: ["独旅", "朋友同行", "学生"],
    dailyTitles: ["街区初见", "夜色东京", "安静切片"],
    poiNames: ["浅草周边", "代代木", "中目黑"],
    foodNames: ["拉面", "便利店早餐", "和牛定食"],
  },
  {
    id: "mock-rome-archive",
    slug: "rome-sunlight-archive",
    city: "罗马",
    cityCode: "rome",
    tripType: "old-town",
    days: 3,
    title: "遗迹和午后光线一起存档",
    summary: "适合把石墙、广场和慢餐桌留进一册复古旅行档案。",
    archiveIntro:
      "罗马更像一部老电影。你真正会记住的，往往不是赶景点的速度，而是午后广场的光线、石板路的温度和一顿慢慢吃完的晚餐。",
    featuredReason: "适合复古旅行与历史感路线。",
    theme: "古典午后",
    pace: "缓慢",
    tags: ["古迹", "复古", "慢旅行", "情侣"],
    highlights: ["石板路午后", "遗迹留白", "广场晚餐"],
    coverImageUrl: "/images/landing/decoration/cities/rome-colosseum.png",
    recommendedFor: ["情侣", "朋友同行", "独旅"],
    dailyTitles: ["古迹初见", "广场与巷子", "傍晚收尾"],
    poiNames: ["斗兽场周边", "纳沃纳广场", "台伯河边"],
    foodNames: ["Carbonara", "披萨", "Gelato"],
  },
];

function buildContent(seed: ArchiveSeed): ExploreTripContent {
  return {
    id: seed.id,
    externalId: seed.id,
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    city: seed.city,
    cityCode: seed.cityCode,
    region: seed.city,
    tripType: seed.tripType,
    days: seed.days,
    tags: seed.tags,
    theme: seed.theme,
    pace: seed.pace,
    budgetLevel: "medium",
    budgetNote: "按慢节奏自由行估算。",
    coverImageUrl: seed.coverImageUrl,
    archiveIntro: seed.archiveIntro,
    featured: true,
    featuredReason: seed.featuredReason,
    creatorType: "editorial",
    creatorId: "wanderly-editorial",
    creator: "Wanderly",
    likes: 0,
    views: 0,
    savedCount: 0,
    terrainTags: seed.tags.filter((tag) =>
      ["古城", "海边", "城市漫步", "湖景", "都市"].includes(tag),
    ),
    cuisineTags: seed.foodNames,
    seasonTags: seed.tags.filter((tag) =>
      ["秋季", "夏日", "周末"].includes(tag),
    ),
    companionTags: seed.recommendedFor,
    highlights: seed.highlights,
    dailyItinerary: seed.dailyTitles.map((title, index) => ({
      dayNumber: index + 1,
      title,
      summary: `${seed.city} 的第 ${index + 1} 天建议围绕“${title}”展开，不赶路，保留步行和停顿。`,
      activities: [
        {
          timeBlock: "上午",
          description: `从 ${seed.poiNames[index % seed.poiNames.length]} 开始，先进入城市情绪。`,
          poiRefs: [],
          foodRefs: [],
        },
        {
          timeBlock: "下午",
          description: `安排 ${seed.foodNames[index % seed.foodNames.length]} 与附近街区慢逛。`,
          poiRefs: [],
          foodRefs: [],
        },
        {
          timeBlock: "晚上",
          description: "留一点空白给夜色、散步和临时决定的停顿。",
          poiRefs: [],
          foodRefs: [],
        },
      ],
    })),
    pois: seed.poiNames.map((name, index) => ({
      id: `${seed.slug}-poi-${index + 1}`,
      name,
      reason: `这处点位能代表 ${seed.city} 这一版路线的核心氛围。`,
      district: seed.city,
      type: "sight",
      recommendedDurationMinutes: 90,
    })),
    food: seed.foodNames.map((name, index) => ({
      id: `${seed.slug}-food-${index + 1}`,
      name,
      reason: `这类味道很适合放进 ${seed.city} 的旅行故事里。`,
      district: seed.city,
      category: "local",
    })),
    status: "published",
    reviewStatus: "approved",
    source: {
      pipeline: "travel-content-pipeline",
      sourceContentKey: seed.slug,
    },
    rawContent: {
      recommendedFor: seed.recommendedFor,
    },
    publishedAt: "2026-07-11T00:00:00.000Z",
    createdAt: "2026-07-11T00:00:00.000Z",
    updatedAt: "2026-07-11T00:00:00.000Z",
  };
}

export const EXPLORE_MOCK_ARCHIVES = archiveSeeds.map(buildContent);

export function getMockExploreDetail(idOrSlug: string) {
  const normalized = idOrSlug.trim();
  return (
    EXPLORE_MOCK_ARCHIVES.find(
      (item) =>
        item.id === normalized ||
        item.slug === normalized ||
        item.externalId === normalized ||
        item.cityCode === normalized ||
        item.city === normalized,
    ) ?? null
  );
}

export function getMockExploreList(): ExploreTripListItem[] {
  return EXPLORE_MOCK_ARCHIVES.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    city: item.city,
    cityCode: item.cityCode,
    region: item.region,
    tripType: item.tripType,
    days: item.days,
    tags: item.tags,
    theme: item.theme,
    pace: item.pace,
    coverImageUrl: item.coverImageUrl,
    archiveIntro: item.archiveIntro,
    featured: item.featured,
    featuredReason: item.featuredReason,
    creatorType: item.creatorType,
    creatorId: item.creatorId,
    creator: item.creator,
    likes: item.likes,
    views: item.views,
    savedCount: item.savedCount,
    terrainTags: item.terrainTags,
    cuisineTags: item.cuisineTags,
    seasonTags: item.seasonTags,
    companionTags: item.companionTags,
    highlights: item.highlights,
  }));
}
