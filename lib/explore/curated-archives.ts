export interface CuratedArchiveEntry {
  id: string;
  number: string;
  city: string;
  title: string;
  description: string;
  image?: string;
  days: number | null;
  tags: string[];
  mood: string;
  featured: boolean;
  priority: number;
  slug?: string;
  coverImageUrl?: string;
}

export const CURATED_ARCHIVE_ENTRIES: CuratedArchiveEntry[] = [
  {
    id: "archive-024",
    number: "024",
    city: "苏州",
    title: "两天情侣园林和城市漫步路线",
    description:
      "面向情侣的苏州 2 天园林和城市漫步路线，节奏偏均衡，先保证能照着走，再保留一点现场弹性。",
    days: 2,
    tags: ["garden", "citywalk"],
    mood: "balanced",
    featured: true,
    priority: 1,
  },
  {
    id: "archive-023",
    number: "023",
    city: "杭州",
    title: "西湖暮色与老城慢漫步路线",
    description:
      "面向独旅的杭州 2 天慢节奏城市漫步路线，把西湖暮色、老街巷和盖碗茶排进同一天。",
    days: 2,
    tags: ["citywalk", "solo"],
    mood: "slow",
    featured: true,
    priority: 2,
  },
  {
    id: "archive-022",
    number: "022",
    city: "西安",
    title: "回坊烟火与城墙风华",
    description:
      "回坊街头美食与夜生活路线，以城墙骑行和夜市烟火收束每一天，预算紧也走得动。",
    days: 3,
    tags: ["food", "nightlife"],
    mood: "balanced",
    featured: true,
    priority: 3,
  },
  {
    id: "archive-020",
    number: "020",
    city: "成都",
    title: "熊猫与茶馆的慢生活",
    description: "上午看熊猫，下午泡茶馆，把成都的慢拍子排进三天里。",
    days: 3,
    tags: ["food", "tea"],
    mood: "slow",
    featured: true,
    priority: 4,
  },
  {
    id: "archive-021",
    number: "021",
    city: "南京",
    title: "梧桐树下的民国散步",
    description: "沿着梧桐大道走民国建筑群，一天刚好走完一段历史。",
    days: 1,
    tags: ["citywalk", "history"],
    mood: "slow",
    featured: true,
    priority: 5,
  },
  {
    id: "archive-019",
    number: "019",
    city: "厦门",
    title: "三天海岸与小巷的浪漫日常",
    description: "海岸线骑行加老街小巷寻味，适合把节奏放软的三天。",
    days: 3,
    tags: ["coast", "alley"],
    mood: "relaxed",
    featured: true,
    priority: 6,
  },
  {
    id: "archive-018",
    number: "018",
    city: "泉州",
    title: "半城烟火半城海的古早味",
    description: "古厝、南音与海边日落，泉州的古早味值得慢吞吞地走。",
    days: 2,
    tags: ["old-town", "food"],
    mood: "slow",
    featured: true,
    priority: 7,
  },
  {
    id: "archive-025",
    number: "025",
    city: "成都",
    title: "熊猫与茶馆的慢生活",
    description: "熊猫基地加人民公园盖碗茶，一天只排两件事。",
    days: 3,
    tags: ["food", "tea"],
    mood: "slow",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-026",
    number: "026",
    city: "南京",
    title: "梧桐树下的民国记忆",
    description: "颐和路、长江路与旧书店，民国记忆散步线。",
    days: 2,
    tags: ["citywalk", "history"],
    mood: "slow",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-027",
    number: "027",
    city: "厦门",
    title: "海风与小巷的浪漫日常",
    description: "环岛路海风、沙坡尾小巷，浪漫日常两日版。",
    days: 2,
    tags: ["coast", "alley"],
    mood: "relaxed",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-028",
    number: "028",
    city: "泉州",
    title: "古厝、南音与海的味道",
    description: "西街古厝听一段南音，再去海边吹一晚的风。",
    days: 2,
    tags: ["old-town", "coast"],
    mood: "slow",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-029",
    number: "029",
    city: "大理",
    title: "苍山洱海的风花日常",
    description: "苍山索道加洱海骑行，风花雪月排成三天日常。",
    days: 3,
    tags: ["mountain", "lake"],
    mood: "relaxed",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-030",
    number: "030",
    city: "青岛",
    title: "红瓦绿树的海滨散步",
    description: "八大关红瓦绿树，栈桥海边散步两日线。",
    days: 2,
    tags: ["citywalk", "harbor"],
    mood: "relaxed",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-031",
    number: "031",
    city: "重庆",
    title: "山城夜色与街巷火锅",
    description: "索道过江、步道爬坡，晚上交给街巷火锅。",
    days: 3,
    tags: ["mountain", "nightlife"],
    mood: "balanced",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-032",
    number: "032",
    city: "广州",
    title: "早茶、骑楼与城市烟火",
    description: "早茶开场，骑楼街收尾，城市烟火两日版。",
    days: 2,
    tags: ["citywalk", "harbor"],
    mood: "balanced",
    featured: false,
    priority: 0,
  },
  {
    id: "archive-033",
    number: "033",
    city: "香港",
    title: "电车、海港与旧城漫游",
    description: "叮叮车穿城，海港边看夜景，旧城漫游两日。",
    days: 2,
    tags: ["coast", "nightlife"],
    mood: "balanced",
    featured: false,
    priority: 0,
  },
];

export interface FeaturedArchiveSplit {
  main: CuratedArchiveEntry | null;
  secondary: CuratedArchiveEntry[];
  mini: CuratedArchiveEntry[];
}

export function splitFeaturedArchives(
  entries: CuratedArchiveEntry[],
): FeaturedArchiveSplit {
  const featured = entries
    .filter((entry) => entry.featured)
    .sort((a, b) => a.priority - b.priority);
  const [main, ...rest] = featured;

  return {
    main: main ?? null,
    secondary: rest.slice(0, 2),
    mini: rest.slice(2, 6),
  };
}

export function getStandardArchives(entries: CuratedArchiveEntry[]) {
  return entries.filter((entry) => !entry.featured);
}

export function formatArchiveMeta(entry: CuratedArchiveEntry) {
  const days =
    typeof entry.days === "number" && entry.days > 0
      ? `${entry.days} DAYS`
      : "DAYS TBD";
  const tag = (entry.tags[0] ?? "trip").toUpperCase();
  const mood = entry.mood.toUpperCase();

  return `${days} · ${tag} · ${mood}`;
}
