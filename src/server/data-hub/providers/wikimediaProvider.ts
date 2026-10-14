import "server-only";

import type { NormalizedPlaceDetail } from "../types";
import {
  BaseDataHubProvider,
  buildSourceSummary,
  createMissingFieldNotice,
  providerUnavailableResult,
  type ImagesInput,
  type PlaceDetailsInput,
  type ProviderResult,
} from "./providerTypes";

interface WikimediaProviderOptions {
  wikipediaApiUrl?: string | null;
  wikipediaZhApiUrl?: string | null;
  wikipediaEnApiUrl?: string | null;
  wikimediaCommonsApiUrl?: string | null;
  wikidataSparqlUrl?: string | null;
  fetchImplementation?: typeof fetch;
  now?: () => Date;
}

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{ title?: string; pageid?: number }>;
    pages?: Record<string, { pageid?: number; title?: string; extract?: string; thumbnail?: { source?: string }; fullurl?: string }>;
  };
}

function firstConfiguredEndpoint(options: WikimediaProviderOptions): string | null {
  return (
    options.wikipediaZhApiUrl?.trim() ||
    options.wikipediaApiUrl?.trim() ||
    options.wikipediaEnApiUrl?.trim() ||
    null
  );
}

export class WikimediaDataHubProvider extends BaseDataHubProvider {
  id = "wikimedia";
  displayName = "Wikimedia / Wikipedia / Wikidata";
  capabilities = {
    getPlaceDetails: true,
    getImages: true,
  };

  private readonly wikipediaApiUrl: string | null;
  private readonly wikimediaCommonsApiUrl: string | null;
  private readonly wikidataSparqlUrl: string | null;
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => Date;

  constructor(options: WikimediaProviderOptions) {
    super();
    this.wikipediaApiUrl = firstConfiguredEndpoint(options);
    this.wikimediaCommonsApiUrl = options.wikimediaCommonsApiUrl?.trim() || null;
    this.wikidataSparqlUrl = options.wikidataSparqlUrl?.trim() || null;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async getPlaceDetails(input: PlaceDetailsInput): Promise<ProviderResult<NormalizedPlaceDetail>> {
    if (!this.wikipediaApiUrl) {
      return providerUnavailableResult(this.id, "getPlaceDetails", "未配置 Wikipedia / Wikimedia endpoint，无法补充百科简介。");
    }

    const title = input.name?.trim();
    if (!title) {
      return {
        ok: false,
        provider: this.id,
        reason: "invalidInput",
        message: "Wikimedia 补全需要地点名称。",
        missingFields: [createMissingFieldNotice({ fieldName: "name", reason: "not_returned", message: "缺少可用于百科搜索的地点名称。", provider: this.id })],
      };
    }

    const searchUrl = new URL(this.wikipediaApiUrl);
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", title);
    searchUrl.searchParams.set("srlimit", "1");

    const searchResponse = await this.fetchImplementation(searchUrl.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const searchData = (await searchResponse.json()) as WikipediaSearchResponse;
    const pageTitle = searchData.query?.search?.[0]?.title;
    if (!pageTitle) {
      return {
        ok: false,
        provider: this.id,
        reason: "notFound",
        message: "Wikimedia 未找到匹配百科条目。",
        missingFields: [createMissingFieldNotice({ fieldName: "encyclopediaIntro", reason: "not_returned", message: "Wikimedia 未找到匹配百科条目。", provider: this.id })],
      };
    }

    const detailUrl = new URL(this.wikipediaApiUrl);
    detailUrl.searchParams.set("action", "query");
    detailUrl.searchParams.set("format", "json");
    detailUrl.searchParams.set("origin", "*");
    detailUrl.searchParams.set("prop", "extracts|pageimages|info");
    detailUrl.searchParams.set("exintro", "1");
    detailUrl.searchParams.set("explaintext", "1");
    detailUrl.searchParams.set("piprop", "thumbnail");
    detailUrl.searchParams.set("pithumbsize", "640");
    detailUrl.searchParams.set("inprop", "url");
    detailUrl.searchParams.set("titles", pageTitle);

    const detailResponse = await this.fetchImplementation(detailUrl.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const detailData = (await detailResponse.json()) as WikipediaSearchResponse;
    const page = Object.values(detailData.query?.pages ?? {})[0];
    const fetchedAt = this.now().toISOString();
    const source = buildSourceSummary({ provider: this.id, fieldName: "encyclopediaIntro", sourceUrl: page?.fullurl ?? null, externalId: page?.pageid ? String(page.pageid) : null, confidence: 0.7, fetchedAt });
    const missingFields = [];
    if (!page?.extract?.trim()) {
      missingFields.push(createMissingFieldNotice({ fieldName: "encyclopediaIntro", reason: "not_returned", message: "百科条目没有返回简介。", provider: this.id, checkedAt: fetchedAt }));
    }

    const detail: NormalizedPlaceDetail = {
      place: {
        id: input.placeId ?? `wikimedia:${page?.pageid ?? pageTitle}`,
        name: input.name ?? pageTitle,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        address: input.address ?? null,
        tags: ["百科候选"],
        status: "active",
        source,
        confidence: source.confidence,
        lastVerifiedAt: fetchedAt,
        missingFields: [],
      },
      intro: page?.extract?.trim() || null,
      imageUrls: page?.thumbnail?.source
        ? [{ url: page.thumbnail.source, alt: page.title ?? input.name ?? pageTitle, source }]
        : [],
      sources: [source],
      confidence: source.confidence,
      lastVerifiedAt: fetchedAt,
      missingFields,
    };

    return { ok: true, provider: this.id, data: detail, sources: [source], missingFields };
  }

  async getImages(input: ImagesInput): Promise<ProviderResult<NormalizedPlaceDetail["imageUrls"]>> {
    const details = await this.getPlaceDetails(input);
    if (!details.ok) return details as ProviderResult<NormalizedPlaceDetail["imageUrls"]>;
    return {
      ok: true,
      provider: this.id,
      data: details.data.imageUrls,
      sources: details.sources,
      missingFields: details.data.imageUrls.length
        ? details.missingFields
        : [createMissingFieldNotice({ fieldName: "imageUrls", reason: "not_returned", message: "Wikimedia 未返回图片候选。", provider: this.id })],
    };
  }
}
