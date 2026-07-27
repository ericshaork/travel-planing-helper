import { applyInterviewDefaults } from "./proposal/interview-defaults";
import { normalizeTripRequestDraft } from "../trip/normalize";
import type { TripRequest, TripRequestDraft } from "../trip/types";

export type StructuredImportField =
  | "departureCity"
  | "destination"
  | "days"
  | "budget"
  | "travelCompanion"
  | "interests"
  | "schedule"
  | "preferences"
  | "avoidPlaces"
  | "specialRequirements";

export interface StructuredImportParseResult {
  rawText: string;
  extractedFields: Partial<Record<StructuredImportField, string>>;
  draft: TripRequestDraft;
  missingTemplateFields: StructuredImportField[];
}

export interface StructuredImportValidationResult {
  tripRequest: TripRequest;
  draft: TripRequestDraft;
  autoFilledFields: string[];
}

const FIELD_LABELS: Record<StructuredImportField, string> = {
  departureCity: "出发地",
  destination: "目的地",
  days: "天数",
  budget: "预算",
  travelCompanion: "同行人",
  interests: "兴趣偏好",
  schedule: "行程节奏",
  preferences: "旅行偏好",
  avoidPlaces: "避开地点",
  specialRequirements: "特殊要求",
};

const FIELD_ALIASES: Array<{ field: StructuredImportField; aliases: string[] }> = [
  { field: "departureCity", aliases: ["departure", "departurecity", "出发地", "出发城市"] },
  { field: "destination", aliases: ["destination", "destinationcity", "目的地", "目的地城市"] },
  { field: "days", aliases: ["days", "duration", "天数", "行程天数"] },
  { field: "budget", aliases: ["budget", "预算"] },
  {
    field: "travelCompanion",
    aliases: ["travelcompanion", "companion", "同行人", "出行同伴", "同行"],
  },
  { field: "interests", aliases: ["interests", "interest", "兴趣", "兴趣偏好"] },
  { field: "schedule", aliases: ["schedule", "pace", "节奏", "行程节奏"] },
  { field: "preferences", aliases: ["preferences", "preference", "偏好", "旅行偏好"] },
  { field: "avoidPlaces", aliases: ["avoidplaces", "avoid", "避开地点", "不想去"] },
  {
    field: "specialRequirements",
    aliases: ["specialrequirements", "requirements", "特殊要求", "备注", "说明"],
  },
];

const REQUIRED_TEMPLATE_FIELDS: StructuredImportField[] = [
  "destination",
  "days",
  "budget",
  "travelCompanion",
  "interests",
  "avoidPlaces",
  "specialRequirements",
];

function normalizeAlias(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function resolveFieldKey(label: string): StructuredImportField | null {
  const normalized = normalizeAlias(label.replace(/^#+\s*/, "").trim());

  for (const entry of FIELD_ALIASES) {
    if (entry.aliases.some((alias) => normalizeAlias(alias) === normalized)) {
      return entry.field;
    }
  }

  return null;
}

function appendFieldValue(
  target: Partial<Record<StructuredImportField, string>>,
  field: StructuredImportField,
  value: string,
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  target[field] = target[field]?.trim()
    ? `${target[field]}\n${trimmed}`
    : trimmed;
}

function collectStructuredFields(text: string) {
  const extracted: Partial<Record<StructuredImportField, string>> = {};
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const keyValuePattern = /^\s*(?:[-*]\s*)?([^:：#\n]+?)\s*[:：]\s*(.+?)\s*$/;

  let activeHeading: StructuredImportField | null = null;
  let headingBuffer: string[] = [];

  function flushHeadingBuffer() {
    if (activeHeading && headingBuffer.length > 0) {
      appendFieldValue(extracted, activeHeading, headingBuffer.join("\n"));
    }
    activeHeading = null;
    headingBuffer = [];
  }

  for (const line of lines) {
    const headingMatch = /^\s*#{1,6}\s*(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flushHeadingBuffer();
      activeHeading = resolveFieldKey(headingMatch[1]);
      continue;
    }

    const keyValueMatch = keyValuePattern.exec(line);
    if (keyValueMatch) {
      flushHeadingBuffer();
      const field = resolveFieldKey(keyValueMatch[1]);
      if (field) {
        appendFieldValue(extracted, field, keyValueMatch[2]);
      }
      continue;
    }

    if (activeHeading && line.trim()) {
      headingBuffer.push(line.replace(/^\s*[-*]\s*/, "").trim());
    }
  }

  flushHeadingBuffer();

  return extracted;
}

function splitList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/\n|,|，|、|;|；/)
        .map((item) => item.replace(/^\s*[-*]\s*/, "").trim())
        .filter((item) => item.length > 0),
    ),
  ];
}

function parsePositiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\d+/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseBudget(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function joinNonEmpty(values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function buildDraftFromStructuredFields(
  extracted: Partial<Record<StructuredImportField, string>>,
): TripRequestDraft {
  const interests = splitList(extracted.interests);
  const avoidPlaces = splitList(extracted.avoidPlaces);
  const preferenceText = joinNonEmpty([extracted.schedule, extracted.preferences]).join("；");
  const specialRequirements = joinNonEmpty([
    extracted.specialRequirements,
    extracted.travelCompanion ? `同行人：${extracted.travelCompanion.trim()}` : undefined,
  ]).join("；");

  return {
    ...(extracted.departureCity?.trim()
      ? { departureCity: extracted.departureCity.trim() }
      : {}),
    ...(extracted.destination?.trim()
      ? { destinationCity: extracted.destination.trim() }
      : {}),
    ...(parsePositiveInteger(extracted.days)
      ? { days: parsePositiveInteger(extracted.days) }
      : {}),
    ...(parseBudget(extracted.budget)
      ? { budget: parseBudget(extracted.budget) }
      : {}),
    ...(interests.length > 0 ? { interests } : {}),
    ...(preferenceText ? { schedulePreference: preferenceText } : {}),
    ...(splitList(extracted.preferences).length > 0
      ? { travelStyles: splitList(extracted.preferences) }
      : {}),
    ...(avoidPlaces.length > 0 ? { avoidPlaces } : {}),
    ...(specialRequirements ? { specialRequirements } : {}),
  };
}

function hasFieldValue(
  field: StructuredImportField,
  extracted: Partial<Record<StructuredImportField, string>>,
) {
  if (field === "days") {
    return Boolean(parsePositiveInteger(extracted.days));
  }

  if (field === "budget") {
    return Boolean(parseBudget(extracted.budget));
  }

  if (field === "schedule") {
    return Boolean(
      extracted.schedule?.trim() || extracted.preferences?.trim(),
    );
  }

  return Boolean(extracted[field]?.trim());
}

export function parseStructuredTravelFile(text: string): StructuredImportParseResult {
  const rawText = text.replace(/\r\n/g, "\n").trim();
  const extractedFields = collectStructuredFields(rawText);
  const draft = buildDraftFromStructuredFields(extractedFields);
  const missingTemplateFields: StructuredImportField[] = [
    ...REQUIRED_TEMPLATE_FIELDS.filter(
      (field) => !hasFieldValue(field, extractedFields),
    ),
    ...(hasFieldValue("schedule", extractedFields)
      ? []
      : (["schedule"] satisfies StructuredImportField[])),
  ].filter((field, index, array) => array.indexOf(field) === index);

  return {
    rawText,
    extractedFields,
    draft,
    missingTemplateFields,
  };
}

export function getStructuredImportMissingFieldLabels(
  fields: StructuredImportField[],
) {
  return fields.map((field) => FIELD_LABELS[field]);
}

function mergeStringLists(...lists: Array<string[] | undefined>) {
  return [
    ...new Set(
      lists
        .flatMap((list) => list ?? [])
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
}

export function mergeImportedDrafts(
  structuredDraft: TripRequestDraft,
  parsedDraft?: TripRequestDraft | null,
) {
  return {
    ...parsedDraft,
    ...structuredDraft,
    interests: mergeStringLists(parsedDraft?.interests, structuredDraft.interests),
    travelStyles: mergeStringLists(
      parsedDraft?.travelStyles,
      structuredDraft.travelStyles,
    ),
    avoidPlaces: mergeStringLists(
      parsedDraft?.avoidPlaces,
      structuredDraft.avoidPlaces,
    ),
    mustVisitPlaces: mergeStringLists(
      parsedDraft?.mustVisitPlaces,
      structuredDraft.mustVisitPlaces,
    ),
    specialRequirements: joinNonEmpty([
      parsedDraft?.specialRequirements,
      structuredDraft.specialRequirements,
    ]).join("；"),
    schedulePreference:
      structuredDraft.schedulePreference ?? parsedDraft?.schedulePreference,
  } satisfies TripRequestDraft;
}

export function validateStructuredImportDraft(
  draft: TripRequestDraft,
): StructuredImportValidationResult {
  const autoFilled = applyInterviewDefaults(draft);
  const normalized = normalizeTripRequestDraft(autoFilled.draft);

  if (!normalized.success) {
    throw new Error("导入文件缺少必要旅行信息，请补充后重新导入。");
  }

  return {
    tripRequest: normalized.tripRequest,
    draft: autoFilled.draft,
    autoFilledFields: autoFilled.filledFields,
  };
}
