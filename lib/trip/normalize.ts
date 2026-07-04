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
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftIsoDate(value: string, daysOffset: number): string | undefined {
  const date = parseIsoDate(value);

  if (!date) {
    return undefined;
  }

  return formatIsoDate(
    new Date(date.getTime() + daysOffset * MILLISECONDS_PER_DAY),
  );
}

function hasPositiveDays(days: number | undefined): days is number {
  return typeof days === "number" && Number.isInteger(days) && days > 0;
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

export function resolveTripRequestDraftDates(
  draft: Pick<TripRequestDraft, "days" | "startDate" | "endDate">,
): Pick<TripRequestDraft, "days" | "startDate" | "endDate"> {
  const startDate = normalizeOptionalText(draft.startDate);
  const endDate = normalizeOptionalText(draft.endDate);
  const days = typeof draft.days === "number" ? draft.days : undefined;

  if (startDate && endDate) {
    const calculatedDays = calculateInclusiveTripDays(startDate, endDate);

    if (calculatedDays !== null) {
      return {
        startDate,
        endDate,
        days: calculatedDays,
      };
    }

    return {
      startDate,
      endDate,
      days,
    };
  }

  if (hasPositiveDays(days) && startDate) {
    return {
      startDate,
      endDate: shiftIsoDate(startDate, days - 1),
      days,
    };
  }

  if (hasPositiveDays(days) && endDate) {
    return {
      startDate: shiftIsoDate(endDate, -(days - 1)),
      endDate,
      days,
    };
  }

  return {
    startDate,
    endDate,
    days,
  };
}

export function normalizeTripRequestDraft(
  draft: TripRequestDraft,
): TripRequestNormalizationResult {
  const resolvedDates = resolveTripRequestDraftDates(draft);
  const resolvedDraft = {
    ...draft,
    ...resolvedDates,
  };
  const missingFields = getMissingTripRequestFields(resolvedDraft);

  if (missingFields.length > 0) {
    return {
      success: false,
      missingFields,
      issues: [],
    };
  }

  if (
    resolvedDates.startDate &&
    resolvedDates.endDate &&
    calculateInclusiveTripDays(
      resolvedDates.startDate,
      resolvedDates.endDate,
    ) === null
  ) {
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

  const candidate = {
    departureCity: resolvedDraft.departureCity?.trim() ?? "",
    destinationCity: resolvedDraft.destinationCity?.trim() ?? "",
    startDate: resolvedDates.startDate,
    endDate: resolvedDates.endDate,
    days: resolvedDates.days,
    budget: resolvedDraft.budget,
    currency: normalizeOptionalText(resolvedDraft.currency) ?? DEFAULT_CURRENCY,
    interests: normalizeStringList(resolvedDraft.interests),
    travelStyles: normalizeStringList(resolvedDraft.travelStyles),
    mustVisitPlaces: normalizeStringList(resolvedDraft.mustVisitPlaces),
    avoidPlaces: normalizeStringList(resolvedDraft.avoidPlaces),
    accommodationPreference: normalizeOptionalText(
      resolvedDraft.accommodationPreference,
    ),
    localTransportPreference: normalizeOptionalText(
      resolvedDraft.localTransportPreference,
    ),
    schedulePreference: normalizeOptionalText(resolvedDraft.schedulePreference),
    specialRequirements: normalizeOptionalText(
      resolvedDraft.specialRequirements,
    ),
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
