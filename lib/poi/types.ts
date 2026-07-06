export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PoiSearchRequest {
  city: string;
  keyword: string;
  limit?: number;
}

export interface PoiCandidate {
  id: string;
  name: string;
  address: string;
  city: string;
  coordinates: Coordinates;
  type?: string;
  confidence: number;
  provider: "mock" | "amap";
}

export interface PoiSearchResult {
  candidates: PoiCandidate[];
  warnings?: string[];
}
