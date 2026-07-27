const DEFAULT_AMAP_BASE_URL = "https://restapi.amap.com";

interface AmapApiResponseBase {
  status?: string;
  info?: string;
  infocode?: string;
}

export interface AmapPoiRecord {
  id?: string;
  name?: string;
  address?: string;
  adname?: string;
  cityname?: string;
  location?: string;
  type?: string;
}

export interface AmapPlaceSearchResponse extends AmapApiResponseBase {
  pois?: AmapPoiRecord[];
}

export interface AmapRouteStepRecord {
  instruction?: string;
  road?: string;
  distance?: string;
  duration?: string;
  action?: string;
  assistant_action?: string;
}

export interface AmapWalkingPathRecord {
  distance?: string;
  duration?: string;
  steps?: AmapRouteStepRecord[];
}

export interface AmapWalkingRouteResponse extends AmapApiResponseBase {
  route?: {
    paths?: AmapWalkingPathRecord[];
  };
}

export class AmapClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey ?? process.env.AMAP_API_KEY ?? "";
    this.baseUrl = options?.baseUrl ?? process.env.AMAP_API_BASE_URL ?? DEFAULT_AMAP_BASE_URL;

    if (!this.apiKey) {
      throw new Error("Missing AMAP_API_KEY environment variable.");
    }
  }

  async searchPois(params: { city?: string; keywords: string; pageSize?: number }): Promise<AmapPlaceSearchResponse> {
    return this.request<AmapPlaceSearchResponse>("/v3/place/text", {
      keywords: params.keywords,
      city: params.city,
      citylimit: params.city ? "true" : undefined,
      offset: String(params.pageSize ?? 5),
      page: "1",
      extensions: "base",
    });
  }

  async planWalkingRoute(params: {
    origin: { longitude: number; latitude: number };
    destination: { longitude: number; latitude: number };
  }): Promise<AmapWalkingRouteResponse> {
    return this.request<AmapWalkingRouteResponse>("/v3/direction/walking", {
      origin: `${params.origin.longitude},${params.origin.latitude}`,
      destination: `${params.destination.longitude},${params.destination.latitude}`,
    });
  }

  private async request<T extends AmapApiResponseBase>(pathname: string, query: Record<string, string | undefined>): Promise<T> {
    const url = new URL(pathname, this.baseUrl);
    url.searchParams.set("key", this.apiKey);

    for (const [name, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(name, value);
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Amap request failed with status ${response.status}: ${bodyText}`);
    }

    const payload = (await response.json()) as T;
    if (payload.status !== "1") {
      throw new Error(`Amap request failed: ${payload.info ?? "Unknown error"} (${payload.infocode ?? "no infocode"})`);
    }

    return payload;
  }
}
