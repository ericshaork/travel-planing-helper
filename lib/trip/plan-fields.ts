import type {
  MissingTripRequestField,
  MissingTripRequestFieldName,
  TripRequestNormalizationIssue,
} from "./normalize";

export type PlanFormField = MissingTripRequestFieldName | "days";

export interface PlanFieldMeta {
  field: PlanFormField;
  label: string;
  step: number;
  elementId: string;
  order: number;
}

export interface PlanFieldDetail extends PlanFieldMeta {
  kind: "missing" | "invalid";
  message: string;
  sourceField: string;
}

const PLAN_FIELD_META: Record<PlanFormField, PlanFieldMeta> = {
  departureCity: {
    field: "departureCity",
    label: "出发城市",
    step: 0,
    elementId: "plan-field-departure-city",
    order: 0,
  },
  destinationCity: {
    field: "destinationCity",
    label: "目的地",
    step: 0,
    elementId: "plan-field-destination-city",
    order: 1,
  },
  daysOrDates: {
    field: "daysOrDates",
    label: "出行天数或日期",
    step: 0,
    elementId: "plan-field-days",
    order: 2,
  },
  days: {
    field: "days",
    label: "出行天数",
    step: 0,
    elementId: "plan-field-days",
    order: 3,
  },
  startDate: {
    field: "startDate",
    label: "开始日期",
    step: 0,
    elementId: "plan-field-start-date",
    order: 4,
  },
  endDate: {
    field: "endDate",
    label: "结束日期",
    step: 0,
    elementId: "plan-field-end-date",
    order: 5,
  },
  budget: {
    field: "budget",
    label: "预算",
    step: 1,
    elementId: "plan-field-budget",
    order: 6,
  },
  interests: {
    field: "interests",
    label: "兴趣",
    step: 1,
    elementId: "plan-field-interests",
    order: 7,
  },
  travelStyles: {
    field: "travelStyles",
    label: "出行风格",
    step: 1,
    elementId: "plan-field-travel-styles",
    order: 8,
  },
};

const MISSING_FIELD_MESSAGES: Record<MissingTripRequestFieldName, string> = {
  departureCity: "还没填出发城市",
  destinationCity: "还没填目的地",
  budget: "填一个大概预算就行",
  interests: "至少选一个兴趣，方便生成更像你的行程",
  travelStyles: "至少选一个出行风格",
  startDate: "还差开始日期，或者直接填出行天数",
  endDate: "还差结束日期，或者直接填出行天数",
  daysOrDates: "请选择出行天数，或者填写开始/结束日期",
};

export function getPlanFieldMeta(field: PlanFormField): PlanFieldMeta {
  return PLAN_FIELD_META[field];
}

function comparePlanFieldOrder(
  left: { field: PlanFormField },
  right: { field: PlanFormField },
): number {
  return getPlanFieldMeta(left.field).order - getPlanFieldMeta(right.field).order;
}

export function getMissingTripRequestFieldDetails(
  fields: MissingTripRequestField[],
): PlanFieldDetail[] {
  return [...fields]
    .sort(comparePlanFieldOrder)
    .map((item) => {
      const meta = getPlanFieldMeta(item.field);

      return {
        ...meta,
        kind: "missing" as const,
        message: MISSING_FIELD_MESSAGES[item.field],
        sourceField: item.field,
      };
    });
}

function mapIssueFieldToPlanField(field: string): PlanFormField | null {
  const rootField = field.split(".")[0];

  if (rootField === "days") {
    return "days";
  }

  if (
    rootField === "departureCity" ||
    rootField === "destinationCity" ||
    rootField === "budget" ||
    rootField === "interests" ||
    rootField === "travelStyles" ||
    rootField === "startDate" ||
    rootField === "endDate"
  ) {
    return rootField;
  }

  return null;
}

export function getTripRequestIssueFieldDetails(
  issues: TripRequestNormalizationIssue[],
): PlanFieldDetail[] {
  const details = issues
    .map((issue) => {
      const field = mapIssueFieldToPlanField(issue.field);

      if (!field) {
        return null;
      }

      const meta = getPlanFieldMeta(field);

      return {
        ...meta,
        kind: "invalid" as const,
        message: issue.message,
        sourceField: issue.field,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return details.sort(comparePlanFieldOrder);
}
