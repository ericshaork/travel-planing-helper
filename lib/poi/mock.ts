import "server-only";

import type { PoiProvider } from "./provider";
import { POI_WARNINGS, unavailablePoiResult } from "./provider";
import type {
  PoiCandidate,
  PoiSearchRequest,
  PoiSearchResult,
} from "./types";

interface MockPoiEntry {
  city: string;
  candidate: PoiCandidate;
}

const MOCK_POIS: MockPoiEntry[] = [
  {
    city: "厦门",
    candidate: {
      id: "mock-xiamen-gulangyu",
      name: "鼓浪屿",
      address: "福建省厦门市思明区鼓浪屿",
      city: "厦门",
      coordinates: { lat: 24.4485, lng: 118.0674 },
      type: "island",
      confidence: 0.99,
      provider: "mock",
    },
  },
  {
    city: "厦门",
    candidate: {
      id: "mock-xiamen-shapowei",
      name: "沙坡尾",
      address: "福建省厦门市思明区沙坡尾",
      city: "厦门",
      coordinates: { lat: 24.4383, lng: 118.0897 },
      type: "district",
      confidence: 0.96,
      provider: "mock",
    },
  },
  {
    city: "厦门",
    candidate: {
      id: "mock-xiamen-zhongshan-road",
      name: "中山路步行街",
      address: "福建省厦门市思明区中山路步行街",
      city: "厦门",
      coordinates: { lat: 24.4558, lng: 118.0819 },
      type: "shopping",
      confidence: 0.95,
      provider: "mock",
    },
  },
  {
    city: "厦门",
    candidate: {
      id: "mock-xiamen-zengcuoan",
      name: "曾厝垵",
      address: "福建省厦门市思明区曾厝垵",
      city: "厦门",
      coordinates: { lat: 24.4258, lng: 118.1194 },
      type: "village",
      confidence: 0.95,
      provider: "mock",
    },
  },
  {
    city: "成都",
    candidate: {
      id: "mock-chengdu-kuanzhai",
      name: "宽窄巷子",
      address: "四川省成都市青羊区宽窄巷子",
      city: "成都",
      coordinates: { lat: 30.6671, lng: 104.0497 },
      type: "historic_district",
      confidence: 0.99,
      provider: "mock",
    },
  },
  {
    city: "成都",
    candidate: {
      id: "mock-chengdu-jinli",
      name: "锦里",
      address: "四川省成都市武侯区锦里古街",
      city: "成都",
      coordinates: { lat: 30.6456, lng: 104.0492 },
      type: "historic_street",
      confidence: 0.96,
      provider: "mock",
    },
  },
  {
    city: "成都",
    candidate: {
      id: "mock-chengdu-chunxi-road",
      name: "春熙路",
      address: "四川省成都市锦江区春熙路",
      city: "成都",
      coordinates: { lat: 30.6574, lng: 104.0838 },
      type: "shopping",
      confidence: 0.95,
      provider: "mock",
    },
  },
  {
    city: "成都",
    candidate: {
      id: "mock-chengdu-renmin-park",
      name: "人民公园",
      address: "四川省成都市青羊区人民公园",
      city: "成都",
      coordinates: { lat: 30.6597, lng: 104.0555 },
      type: "park",
      confidence: 0.95,
      provider: "mock",
    },
  },
  {
    city: "杭州",
    candidate: {
      id: "mock-hangzhou-west-lake",
      name: "西湖",
      address: "浙江省杭州市西湖区西湖风景名胜区",
      city: "杭州",
      coordinates: { lat: 30.2431, lng: 120.1501 },
      type: "lake",
      confidence: 0.99,
      provider: "mock",
    },
  },
  {
    city: "杭州",
    candidate: {
      id: "mock-hangzhou-hefang-street",
      name: "河坊街",
      address: "浙江省杭州市上城区河坊街",
      city: "杭州",
      coordinates: { lat: 30.2414, lng: 120.1717 },
      type: "historic_street",
      confidence: 0.96,
      provider: "mock",
    },
  },
  {
    city: "杭州",
    candidate: {
      id: "mock-hangzhou-lingyin",
      name: "灵隐寺",
      address: "浙江省杭州市西湖区灵隐路法云弄1号",
      city: "杭州",
      coordinates: { lat: 30.2429, lng: 120.1014 },
      type: "temple",
      confidence: 0.96,
      provider: "mock",
    },
  },
  {
    city: "杭州",
    candidate: {
      id: "mock-hangzhou-hubin-intime",
      name: "湖滨银泰",
      address: "浙江省杭州市上城区延安路258号",
      city: "杭州",
      coordinates: { lat: 30.2553, lng: 120.1645 },
      type: "shopping",
      confidence: 0.94,
      provider: "mock",
    },
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreCandidate(keyword: string, candidateName: string): number {
  const normalizedKeyword = normalize(keyword);
  const normalizedName = normalize(candidateName);

  if (normalizedKeyword === normalizedName) {
    return 100;
  }

  if (normalizedName.includes(normalizedKeyword)) {
    return 90;
  }

  if (normalizedKeyword.includes(normalizedName)) {
    return 80;
  }

  return 0;
}

export class MockPoiProvider implements PoiProvider {
  async searchPoi(request: PoiSearchRequest): Promise<PoiSearchResult> {
    const city = request.city.trim();
    const keyword = request.keyword.trim();
    const limit = Math.max(1, request.limit ?? 5);

    if (!city) {
      return unavailablePoiResult(POI_WARNINGS.emptyCity);
    }

    if (!keyword) {
      return unavailablePoiResult(POI_WARNINGS.emptyKeyword);
    }

    const normalizedCity = normalize(city);
    const matches = MOCK_POIS.filter(
      (entry) => normalize(entry.city) === normalizedCity,
    )
      .map((entry) => ({
        score: scoreCandidate(keyword, entry.candidate.name),
        candidate: entry.candidate,
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((entry) => entry.candidate);

    if (matches.length === 0) {
      return unavailablePoiResult(POI_WARNINGS.noMatch);
    }

    return {
      candidates: matches,
    };
  }
}
