import { DEFAULT_CURRENCY } from "./defaults";
import { tripRequestSchema } from "./schema";
import type { TripRequest, TripRequestDraft } from "./types";
import { calculateInclusiveTripDays } from "./validators";

export type MissingTripRequestFieldName =
  | "departureCity"
  | "destinationCity"
  | "budget"
  | "interests"
  | "travelStyles"
  | "startDate"
  | "endDate"
  | "daysOrDates";

export interface MissingTripRequestField {
  field: MissingTripRequestFieldName;
  message: string;
}

export interface TripRequestNormalizationIssue {
  field: string;
  message: string;
}

export type TripRequestNormalizationResult =
  | {
      success: true;
      tripRequest: TripRequest;
    }
  | {
      success: false;
      missingFields: MissingTripRequestField[];
      issues: TripRequestNormalizationIssue[];
    };

const REQUIRED_FIELD_QUESTIONS: Record<
  MissingTripRequestFieldName,
  string
> = {
  departureCity: "你从哪个城市出发？",
  destinationCity: "你想去哪个城市？",
  budget: "大概预算是多少？",
  interests: "你更喜欢哪些类型的体验？",
  travelStyles: "你希望行程轻松一点，还是高效率一点？",
  startDate: "再补一个开始日期，或者直接告诉我准备玩几天。",
  endDate: "再补一个结束日期，或者直接告诉我准备玩几天。",
  daysOrDates: "准备玩几天，或者具体哪几天？",
};

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasListValue(value: string[] | undefined): boolean {
  return Boolean(value?.some((item) => item.trim().length > 0));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeStringList(value: string[] | undefined): string[] {
  return [
    ...new Set(
      (value ?? []).map((item) => item.trim()).filter((item) => item.length > 0),
    ),
  ];
}

function missingField(
  field: MissingTripRequestFieldName,
): MissingTripRequestField {
  return {
    field,
    message: REQUIRED_FIELD_QUESTIONS[field],
  };
}

export function getMissingTripRequestFields(
  draft: TripRequestDraft,
): MissingTripRequestField[] {
  const missingFields: MissingTripRequestField[] = [];

  if (!hasText(draft.departureCity)) {
    missingFields.push(missingField("departureCity"));
  }

  if (!hasText(draft.destinationCity)) {
    missingFields.push(missingField("destinationCity"));
  }

  if (draft.budget === undefined) {
    missingFields.push(missingField("budget"));
  }

  if (!hasListValue(draft.interests)) {
    missingFields.push(missingField("interests"));
  }

  if (!hasListValue(draft.travelStyles)) {
    missingFields.push(missingField("travelStyles"));
  }

  if (draft.days === undefined) {
    const hasStartDate = hasText(draft.startDate);
    const hasEndDate = hasText(draft.endDate);

    if (hasStartDate && !hasEndDate) {
      missingFields.push(missingField("endDate"));
    } else if (!hasStartDate && hasEndDate) {
      missingFields.push(missingField("startDate"));
    } else if (!hasStartDate && !hasEndDate) {
      missingFields.push(missingField("daysOrDates"));
    }
  }

  return missingFields;
}

export function normalizeTripRequestDraft(
  draft: TripRequestDraft,
): TripRequestNormalizationResult {
  const missingFields = getMissingTripRequestFields(draft);

  if (missingFields.length > 0) {
    return {
      success: false,
      missingFields,
      issues: [],
    };
  }

  let days = draft.days;

  if (days === undefined && draft.startDate && draft.endDate) {
    days = calculateInclusiveTripDays(draft.startDate, draft.endDate) ?? undefined;

    if (days === undefined) {
      return {
        success: false,
        missingFields: [],
        issues: [
          {
            field: "endDate",
            message: "结束日期不能早于开始日期，请重新选择出行日期。",
          },
        ],
      };
    }
  }

  const candidate = {
    departureCity: draft.departureCity?.trim() ?? "",
    destinationCity: draft.destinationCity?.trim() ?? "",
    startDate: normalizeOptionalText(draft.startDate),
    endDate: normalizeOptionalText(draft.endDate),
    days,
    budget: draft.budget,
    currency: normalizeOptionalText(draft.currency) ?? DEFAULT_CURRENCY,
    interests: normalizeStringList(draft.interests),
    travelStyles: normalizeStringList(draft.travelStyles),
    mustVisitPlaces: normalizeStringList(draft.mustVisitPlaces),
    avoidPlaces: normalizeStringList(draft.avoidPlaces),
    accommodationPreference: normalizeOptionalText(
      draft.accommodationPreference,
    ),
    localTransportPreference: normalizeOptionalText(
      draft.localTransportPreference,
    ),
    schedulePreference: normalizeOptionalText(draft.schedulePreference),
    specialRequirements: normalizeOptionalText(draft.specialRequirements),
  };

  const parsed = tripRequestSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      success: false,
      missingFields: [],
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join(".") || "tripRequest",
        message: issue.message,
      })),
    };
  }

  return {
    success: true,
    tripRequest: parsed.data,
  };
}
