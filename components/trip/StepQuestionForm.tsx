"use client";

import { FormEvent } from "react";

import { InterestSelector } from "@/components/trip/InterestSelector";
import { TravelStyleSelector } from "@/components/trip/TravelStyleSelector";
import {
  getPlanFieldMeta,
  type PlanFormField,
} from "@/lib/trip/plan-fields";
import type { TripRequestNormalizationIssue } from "@/lib/trip/normalize";
import type { TripRequestDraft } from "@/lib/trip/types";

export const PLAN_STEPS = [
  {
    title: "路线和时间",
    note: "先确认去哪、从哪出发，以及玩几天。",
  },
  {
    title: "预算和兴趣",
    note: "预算不用抠到个位数，大概范围就够。",
  },
  {
    title: "旅行偏好",
    note: "这些不是必填，但会让路线更像你的。",
  },
] as const;

interface StepQuestionFormProps {
  draft: TripRequestDraft;
  currentStep: number;
  issues: TripRequestNormalizationIssue[];
  fieldErrors: Partial<Record<PlanFormField, string>>;
  highlightedField?: PlanFormField;
  stepMessage?: string;
  onChange: (patch: Partial<TripRequestDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const inputClassName =
  "mt-2 min-h-11 w-full rounded-none border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[var(--sage-deep)]";

function fieldErrorId(field: PlanFormField): string {
  return `plan-field-error-${field}`;
}

function panelClass(invalid: boolean, highlighted: boolean): string {
  return invalid || highlighted
    ? "rounded-sm border border-[var(--clay)] bg-[var(--clay-soft)] p-3"
    : "";
}

function inputWithStateClass(invalid: boolean): string {
  return invalid
    ? `${inputClassName} border-[var(--clay)]`
    : inputClassName;
}

function FieldError({
  field,
  message,
}: {
  field: PlanFormField;
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={fieldErrorId(field)}
      role="alert"
      className="mt-2 break-words text-xs leading-5 text-[var(--clay-deep)]"
    >
      {message}
    </p>
  );
}

function parseList(value: string): string[] {
  return value
    .split(/[、,，\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleValue(values: string[] | undefined, value: string): string[] {
  const current = values ?? [];
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

interface PreferenceButtonsProps {
  label: string;
  value?: string;
  options: string[];
  onChange: (value?: string) => void;
}

function PreferenceButtons({
  label,
  value,
  options,
  onChange,
}: PreferenceButtonsProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? undefined : option)}
              className={`min-h-10 max-w-full break-words border px-3 py-2 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                selected
                  ? "border-[var(--clay)] bg-[var(--clay-soft)] font-semibold text-[var(--clay-deep)]"
                  : "border-[var(--line)] bg-[var(--paper-bright)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function StepQuestionForm({
  draft,
  currentStep,
  issues,
  fieldErrors,
  highlightedField,
  stepMessage,
  onChange,
  onBack,
  onNext,
  onSubmit,
}: StepQuestionFormProps) {
  const step = PLAN_STEPS[currentStep];

  function getFieldMessage(field: PlanFormField): string | undefined {
    return fieldErrors[field];
  }

  function getFieldState(field: PlanFormField) {
    const message = getFieldMessage(field);

    return {
      message,
      invalid: Boolean(message),
      highlighted: highlightedField === field,
      describedBy: message ? fieldErrorId(field) : undefined,
    };
  }

  const departureCityState = getFieldState("departureCity");
  const destinationCityState = getFieldState("destinationCity");
  const daysOrDatesState = getFieldState("daysOrDates");
  const daysState = getFieldState("days");
  const startDateState = getFieldState("startDate");
  const endDateState = getFieldState("endDate");
  const budgetState = getFieldState("budget");
  const interestsState = getFieldState("interests");
  const travelStylesState = getFieldState("travelStyles");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentStep === PLAN_STEPS.length - 1) {
      onSubmit();
    } else {
      onNext();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-5 shadow-[8px_9px_0_var(--sand)] sm:p-7"
    >
      <div className="flex flex-col gap-4 border-b border-dashed border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
            第 {currentStep + 1} 步，共 {PLAN_STEPS.length} 步
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{step.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
            {step.note}
          </p>
        </div>
        <div className="flex gap-1" aria-label="填写进度">
          {PLAN_STEPS.map((item, index) => (
            <span
              key={item.title}
              aria-hidden="true"
              className={`h-2 w-8 ${
                index <= currentStep ? "bg-[var(--clay)]" : "bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
      </div>

      {stepMessage ? (
        <p
          role="alert"
          className="mt-5 break-words border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]"
        >
          {stepMessage}
        </p>
      ) : null}

      {issues.length > 0 ? (
        <ul className="mt-5 space-y-1 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]">
          {issues.map((issue) => (
            <li key={`${issue.field}-${issue.message}`} className="break-words">
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 min-w-0">
        {currentStep === 0 ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`block text-sm font-semibold ${panelClass(
                  departureCityState.invalid,
                  departureCityState.highlighted,
                )}`}
              >
                从哪个城市出发
                <input
                  id={getPlanFieldMeta("departureCity").elementId}
                  value={draft.departureCity ?? ""}
                  onChange={(event) =>
                    onChange({ departureCity: event.target.value })
                  }
                  placeholder="例如：深圳"
                  aria-invalid={departureCityState.invalid || undefined}
                  aria-describedby={departureCityState.describedBy}
                  className={inputWithStateClass(departureCityState.invalid)}
                />
                <FieldError
                  field="departureCity"
                  message={departureCityState.message}
                />
              </label>
              <label
                className={`block text-sm font-semibold ${panelClass(
                  destinationCityState.invalid,
                  destinationCityState.highlighted,
                )}`}
              >
                想去哪个城市
                <input
                  id={getPlanFieldMeta("destinationCity").elementId}
                  value={draft.destinationCity ?? ""}
                  onChange={(event) =>
                    onChange({ destinationCity: event.target.value })
                  }
                  placeholder="例如：厦门"
                  aria-invalid={destinationCityState.invalid || undefined}
                  aria-describedby={destinationCityState.describedBy}
                  className={inputWithStateClass(destinationCityState.invalid)}
                />
                <FieldError
                  field="destinationCity"
                  message={destinationCityState.message}
                />
              </label>
            </div>

            <div
              className={`scroll-mt-28 ${panelClass(
                daysOrDatesState.invalid,
                daysOrDatesState.highlighted,
              )}`}
            >
              <div className="break-words border-l-2 border-[var(--sage-deep)] bg-[var(--sage-soft)] px-4 py-3 text-sm leading-6 text-[var(--sage-deep)]">
                天数和完整日期，填一组就行。日期没定，也可以先按天数排通用方案。
              </div>
              <FieldError
                field="daysOrDates"
                message={daysOrDatesState.message}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label
                className={`block text-sm font-semibold ${panelClass(
                  daysState.invalid,
                  daysState.highlighted,
                )}`}
              >
                玩几天
                <input
                  id={getPlanFieldMeta("days").elementId}
                  type="number"
                  min={1}
                  max={60}
                  value={draft.days ?? ""}
                  onChange={(event) =>
                    onChange({
                      days:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  placeholder="3"
                  aria-invalid={daysState.invalid || undefined}
                  aria-describedby={daysState.describedBy}
                  className={inputWithStateClass(daysState.invalid)}
                />
                <FieldError field="days" message={daysState.message} />
              </label>
              <label
                className={`block text-sm font-semibold ${panelClass(
                  startDateState.invalid,
                  startDateState.highlighted,
                )}`}
              >
                开始日期
                <input
                  id={getPlanFieldMeta("startDate").elementId}
                  type="date"
                  value={draft.startDate ?? ""}
                  onChange={(event) =>
                    onChange({
                      startDate: event.target.value || undefined,
                    })
                  }
                  aria-invalid={startDateState.invalid || undefined}
                  aria-describedby={startDateState.describedBy}
                  className={inputWithStateClass(startDateState.invalid)}
                />
                <FieldError
                  field="startDate"
                  message={startDateState.message}
                />
              </label>
              <label
                className={`block text-sm font-semibold ${panelClass(
                  endDateState.invalid,
                  endDateState.highlighted,
                )}`}
              >
                结束日期
                <input
                  id={getPlanFieldMeta("endDate").elementId}
                  type="date"
                  value={draft.endDate ?? ""}
                  onChange={(event) =>
                    onChange({
                      endDate: event.target.value || undefined,
                    })
                  }
                  aria-invalid={endDateState.invalid || undefined}
                  aria-describedby={endDateState.describedBy}
                  className={inputWithStateClass(endDateState.invalid)}
                />
                <FieldError field="endDate" message={endDateState.message} />
              </label>
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-7">
            <label
              className={`block max-w-xs text-sm font-semibold ${panelClass(
                budgetState.invalid,
                budgetState.highlighted,
              )}`}
            >
              大概预算
              <div className="relative">
                <input
                  id={getPlanFieldMeta("budget").elementId}
                  type="number"
                  min={1}
                  value={draft.budget ?? ""}
                  onChange={(event) =>
                    onChange({
                      budget:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  placeholder="2500"
                  aria-invalid={budgetState.invalid || undefined}
                  aria-describedby={budgetState.describedBy}
                  className={`${inputWithStateClass(budgetState.invalid)} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-[var(--ink-muted)]">
                  元
                </span>
              </div>
              <FieldError field="budget" message={budgetState.message} />
            </label>

            <InterestSelector
              fieldId={getPlanFieldMeta("interests").elementId}
              errorId={interestsState.describedBy}
              errorMessage={interestsState.message}
              invalid={interestsState.invalid}
              highlighted={interestsState.highlighted}
              legend="更想体验什么"
              helperText="至少选一个。已经识别出来的可以继续改。"
              selected={draft.interests ?? []}
              onToggle={(interest) =>
                onChange({
                  interests: toggleValue(draft.interests, interest),
                })
              }
            />

            <TravelStyleSelector
              fieldId={getPlanFieldMeta("travelStyles").elementId}
              errorId={travelStylesState.describedBy}
              errorMessage={travelStylesState.message}
              invalid={travelStylesState.invalid}
              highlighted={travelStylesState.highlighted}
              legend="这趟想怎么走"
              helperText="至少选一个，别怕选得不够专业。"
              selected={draft.travelStyles ?? []}
              onToggle={(style) =>
                onChange({
                  travelStyles: toggleValue(draft.travelStyles, style),
                })
              }
            />
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                一定想去
                <input
                  value={draft.mustVisitPlaces?.join("、") ?? ""}
                  onChange={(event) =>
                    onChange({
                      mustVisitPlaces: parseList(event.target.value),
                    })
                  }
                  placeholder="鼓浪屿、沙坡尾"
                  className={inputClassName}
                />
              </label>
              <label className="text-sm font-semibold">
                明确不想去
                <input
                  value={draft.avoidPlaces?.join("、") ?? ""}
                  onChange={(event) =>
                    onChange({
                      avoidPlaces: parseList(event.target.value),
                    })
                  }
                  placeholder="寺庙、太商业化的景点"
                  className={inputClassName}
                />
              </label>
            </div>

            <PreferenceButtons
              label="住宿更看重什么"
              value={draft.accommodationPreference}
              options={["交通方便", "安静", "景点附近", "性价比"]}
              onChange={(value) => onChange({ accommodationPreference: value })}
            />

            <PreferenceButtons
              label="市内交通偏好"
              value={draft.localTransportPreference}
              options={["少换乘", "公共交通优先", "打车方便", "少走路"]}
              onChange={(value) =>
                onChange({ localTransportPreference: value })
              }
            />

            <PreferenceButtons
              label="作息偏好"
              value={draft.schedulePreference}
              options={["不想早起", "可以早起", "午后慢一点"]}
              onChange={(value) => onChange({ schedulePreference: value })}
            />

            <label className="block text-sm font-semibold">
              还有什么需要提前说
              <textarea
                rows={4}
                maxLength={1000}
                value={draft.specialRequirements ?? ""}
                onChange={(event) =>
                  onChange({ specialRequirements: event.target.value })
                }
                placeholder="例如：不吃辣、不想爬山、带着老人出行。"
                className={`${inputClassName} min-h-28 resize-y`}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-dashed border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={currentStep === 0}
          className="min-h-11 px-2 py-2 text-left text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] disabled:cursor-not-allowed disabled:opacity-30 sm:text-center"
        >
          上一步
        </button>
        <button
          type="submit"
          className="min-h-11 w-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] sm:w-auto"
        >
          {currentStep === PLAN_STEPS.length - 1 ? "信息齐了，继续" : "下一步"}
        </button>
      </div>
    </form>
  );
}
