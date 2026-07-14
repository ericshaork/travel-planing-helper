import type {
  ExploreDetailResponse,
  ExploreFacetsResponse,
  ExploreListResponse,
  ExploreTripListFilters,
} from "./types";

function buildExploreQuery(filters: ExploreTripListFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search) {
    searchParams.set("q", filters.search);
  }

  if (filters.city) {
    searchParams.set("city", filters.city);
  }

  if (filters.tripType) {
    searchParams.set("trip_type", filters.tripType);
  }

  if (typeof filters.days === "number") {
    searchParams.set("days", String(filters.days));
  }

  if (filters.tags && filters.tags.length > 0) {
    searchParams.set("tags", filters.tags.join(","));
  }

  if (typeof filters.limit === "number") {
    searchParams.set("limit", String(filters.limit));
  }

  const query = searchParams.toString();
  return query ? `/api/explore?${query}` : "/api/explore";
}

function getErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return "暂时拿不到 Explore 内容，请稍后再试。";
}

export async function fetchExploreList(filters: ExploreTripListFilters = {}) {
  const response = await fetch(buildExploreQuery(filters), {
    cache: "no-store",
  });
  const payload = (await response.json()) as ExploreListResponse | unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return (payload as ExploreListResponse).items;
}

export async function fetchExploreDetail(id: string) {
  const response = await fetch(`/api/explore/${id}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as ExploreDetailResponse | unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return (payload as ExploreDetailResponse).item;
}

export async function fetchExploreFacets() {
  const response = await fetch("/api/explore/facets", {
    cache: "no-store",
  });
  const payload = (await response.json()) as ExploreFacetsResponse | unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return (payload as ExploreFacetsResponse).facets;
}
