import type { TripEvidenceMetadata, TripRequest } from "../../../lib/trip/types";
import type { EvidencePack } from "../data-hub/evidencePackService";
import { stripUnsafeProductData } from "../data-hub/productDataHubService.ts";
import type { MissingFieldNotice } from "../data-hub/types";

export interface EvidenceAwarePlanInput {
  tripRequest: TripRequest;
  evidencePack: EvidencePack | null;
  evidencePromptSection: string;
  evidenceWarnings: string[];
  evidenceMetadata: TripEvidenceMetadata;
}

export interface BuildEvidenceAwarePlanInputOptions {
  tripRequest: TripRequest;
  evidencePack: EvidencePack | null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fieldNames(fields: MissingFieldNotice[]): string[] {
  return unique(fields.map((field) => field.fieldName));
}

function hasMissingField(fields: MissingFieldNotice[], names: string[]) {
  return fields.some((field) => names.includes(field.fieldName));
}

function createWarnings(pack: EvidencePack | null): string[] {
  if (!pack) {
    return ["Data Hub evidence pack 暂不可用，本次生成会使用保守提示并标记待确认信息。"];
  }

  const warnings: string[] = [];
  const missingFields = pack.missingFields;

  if (pack.places.length === 0) {
    warnings.push("Data Hub 暂未匹配到可用于本次生成的 normalized 地点，地点事实需出行前确认。");
  }

  if (hasMissingField(missingFields, ["openingHours", "opening_hours"])) {
    warnings.push("部分地点缺少开放时间，建议出行前确认。");
  }

  if (hasMissingField(missingFields, ["ticketInfo", "ticket_info"])) {
    warnings.push("部分地点缺少门票或预约信息，建议出行前确认。");
  }

  if (pack.weatherContext.length === 0) {
    warnings.push("Data Hub 暂无可用天气上下文，天气信息按现有 WeatherProvider 兜底。");
  }

  if (pack.routeEstimates.length === 0 && pack.places.length > 1) {
    warnings.push("部分地点之间缺少路线估算缓存，交通耗时需待确认。");
  }

  if (pack.routeEstimates.length > 0) {
    warnings.push("路线耗时来自估算缓存，可能受实时交通影响。");
  }

  return unique(warnings);
}

function formatMissingField(field: MissingFieldNotice): string {
  return `${field.fieldName}:${field.reason}:${field.severity}`;
}

function buildPromptSection(pack: EvidencePack | null): string {
  if (!pack) {
    return [
      "- evidencePackStatus: unavailable",
      "- openingHours: 待确认",
      "- ticketInfo: 待确认",
      "- weather: 待确认",
      "- route: 待确认",
    ].join("\n");
  }

  const lines: string[] = [
    `- destination: ${pack.destination ?? pack.city ?? "待确认"}`,
    `- confidence: ${pack.confidence ?? "unknown"}`,
    `- lastVerifiedAt: ${pack.freshness.lastVerifiedAt ?? "待确认"}`,
  ];

  for (const item of pack.places) {
    const detail = item.detail;
    const facts = [
      detail.intro ? `intro=${detail.intro}` : "intro=待确认",
      detail.openingHours ? "openingHours=available" : "openingHours=待确认",
      detail.ticketInfo ? "ticketInfo=available" : "ticketInfo=待确认",
      detail.place.address ? `address=${detail.place.address}` : "address=待确认",
      typeof detail.recommendedDurationMinutes === "number"
        ? `recommendedDurationMinutes=${detail.recommendedDurationMinutes}`
        : "recommendedDurationMinutes=待确认",
    ];

    lines.push(
      `- place: ${detail.place.name} | provider=${detail.place.source.provider} | confidence=${detail.confidence ?? "unknown"} | lastVerifiedAt=${detail.lastVerifiedAt ?? "待确认"} | ${facts.join(" | ")}`,
    );
  }

  lines.push(
    `- weatherContext: ${pack.weatherContext.length > 0 ? "available" : "待确认"}`,
    `- routeEstimates: ${pack.routeEstimates.length > 0 ? "available_estimate_cache" : "待确认"}`,
  );

  if (pack.missingFields.length > 0) {
    lines.push(`- missingFields: ${pack.missingFields.map(formatMissingField).join(", ")}`);
  }

  if (pack.sourceList.length > 0) {
    lines.push(
      `- sources: ${pack.sourceList
        .map((source) => `${source.provider}/${source.fieldName ?? "unknown"}/confidence=${source.confidence ?? "unknown"}`)
        .join(", ")}`,
    );
  }

  return lines.join("\n");
}

function buildEvidenceMetadata(
  pack: EvidencePack | null,
  warnings: string[],
): TripEvidenceMetadata {
  if (!pack) {
    return {
      sources: [],
      confidence: null,
      lastVerifiedAt: null,
      missingFields: ["evidencePack"],
      warnings,
    };
  }

  return {
    sources: pack.sourceList.map((source) => ({
      provider: String(source.provider),
      fieldName: source.fieldName,
      sourceUrl: source.sourceUrl ?? null,
      externalId: source.externalId ?? null,
      confidence: source.confidence,
      fetchedAt: source.fetchedAt ?? null,
      lastVerifiedAt: source.lastVerifiedAt ?? null,
    })),
    confidence: pack.confidence,
    lastVerifiedAt: pack.freshness.lastVerifiedAt,
    missingFields: fieldNames(pack.missingFields),
    warnings,
  };
}

export function buildEvidenceAwarePlanInput(
  options: BuildEvidenceAwarePlanInputOptions,
): EvidenceAwarePlanInput {
  const evidenceWarnings = createWarnings(options.evidencePack);
  const value: EvidenceAwarePlanInput = {
    tripRequest: options.tripRequest,
    evidencePack: options.evidencePack,
    evidencePromptSection: buildPromptSection(options.evidencePack),
    evidenceWarnings,
    evidenceMetadata: buildEvidenceMetadata(options.evidencePack, evidenceWarnings),
  };

  return stripUnsafeProductData(value) as EvidenceAwarePlanInput;
}
