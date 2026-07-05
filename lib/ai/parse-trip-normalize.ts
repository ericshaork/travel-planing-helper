import "server-only";

import type { ZodError, ZodIssue } from "zod";

import { isValidIsoDate } from "../trip/validators";

const COMMA_SPLIT_PATTERN = /[,\n，、/｜|]+/;

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readFirst(record: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    if (alias in record) {
      return record[alias];
    }
  }

  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => cleanString(item))
      .filter((item): item is string => Boolean(item));

    return items.length > 0 ? items : undefined;
  }

  const single = cleanString(value);

  if (!single) {
    return undefined;
  }

  const items = single
    .split(COMMA_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function toPositiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  const normalized = cleanString(value);

  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/\d+/);

  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  const normalized = cleanString(value);

  if (!normalized) {
    return undefined;
  }

  const match = normalized.replace(/,/g, "").match(/\d+(?:\.\d+)?/);

  if (!match) {
    return undefined;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toStrictIsoDate(value: unknown): string | undefined {
  const normalized = cleanString(value);

  if (!normalized) {
    return undefined;
  }

  return isValidIsoDate(normalized) ? normalized : undefined;
}

function summarizeValueType(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      return "string[]";
    }

    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function pickDraftSource(candidate: Record<string, unknown>) {
  const nestedParsed = candidate.parsed;

  if (
    nestedParsed &&
    typeof nestedParsed === "object" &&
    !Array.isArray(nestedParsed)
  ) {
    return nestedParsed as Record<string, unknown>;
  }

  return candidate;
}

export function normalizeTripRequestDraftCandidate(candidate: unknown) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  const departureCity = cleanString(
    readFirst(record, [
      "departureCity",
      "from",
      "departure",
      "originCity",
      "startCity",
      "origin",
      "出发城市",
      "出发地",
    ]),
  );
  const destinationCity = cleanString(
    readFirst(record, [
      "destinationCity",
      "to",
      "city",
      "targetCity",
      "destination",
      "目的地",
      "目的地城市",
    ]),
  );
  const startDate = toStrictIsoDate(
    readFirst(record, ["startDate", "start", "开始日期"]),
  );
  const endDate = toStrictIsoDate(
    readFirst(record, ["endDate", "end", "结束日期"]),
  );
  const days = toPositiveInteger(
    readFirst(record, ["days", "duration", "tripDays", "travelDays", "天数"]),
  );
  const budget = toPositiveNumber(
    readFirst(record, [
      "budget",
      "totalBudget",
      "budgetCny",
      "estimatedBudget",
      "预算",
    ]),
  );
  const interests = toStringArray(
    readFirst(record, ["interests", "interest", "preferences", "tags", "兴趣"]),
  );
  const travelStyles = toStringArray(
    readFirst(record, [
      "travelStyles",
      "styles",
      "pace",
      "tripStyles",
      "旅行风格",
      "风格",
    ]),
  );
  const mustVisitPlaces = toStringArray(
    readFirst(record, [
      "mustVisitPlaces",
      "mustVisit",
      "必去",
      "必去地点",
    ]),
  );
  const avoidPlaces = toStringArray(
    readFirst(record, ["avoidPlaces", "avoid", "避开", "不想去"]),
  );

  if (departureCity) {
    normalized.departureCity = departureCity;
  }

  if (destinationCity) {
    normalized.destinationCity = destinationCity;
  }

  if (startDate) {
    normalized.startDate = startDate;
  }

  if (endDate) {
    normalized.endDate = endDate;
  }

  if (days !== undefined) {
    normalized.days = days;
  }

  if (budget !== undefined) {
    normalized.budget = budget;
  }

  if (interests) {
    normalized.interests = interests;
  }

  if (travelStyles) {
    normalized.travelStyles = travelStyles;
  }

  if (mustVisitPlaces) {
    normalized.mustVisitPlaces = mustVisitPlaces;
  }

  if (avoidPlaces) {
    normalized.avoidPlaces = avoidPlaces;
  }

  return normalized;
}

export function normalizeParseTripResponseCandidate(candidate: unknown) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;
  const parsedSource = pickDraftSource(record);

  return {
    parsed: normalizeTripRequestDraftCandidate(parsedSource),
    missingFields:
      toStringArray(
        readFirst(record, ["missingFields", "missing", "requiredFields"]),
      ) ?? [],
    followUpQuestions:
      toStringArray(
        readFirst(record, [
          "followUpQuestions",
          "followUps",
          "questions",
          "nextQuestions",
        ]),
      ) ?? [],
  };
}

export function summarizeObjectKeys(candidate: unknown): string[] {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return [];
  }

  return Object.keys(candidate as Record<string, unknown>);
}

export function summarizeObjectFieldTypes(candidate: unknown) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {};
  }

  const record = candidate as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, summarizeValueType(value)]),
  );
}

export function summarizeZodIssues(error: ZodError) {
  return error.issues.map(
    (
      issue: ZodIssue & { expected?: unknown; received?: unknown },
    ) => ({
      path: issue.path.join("."),
      expected: "expected" in issue ? issue.expected : undefined,
      received: "received" in issue ? issue.received : undefined,
      message: issue.message,
    }),
  );
}
