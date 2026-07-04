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
    note: "预算先填大概范围，兴趣先选最想要的。",
  },
  {
    title: "风格和确认",
    note: "选好旅行节奏，再补几条可选要求就能生成。",
  },
] as const;

interface StepQuestionFormProps {
  draft: TripRequestDraft;
  currentStep: number;
  issues: TripRequestNormalizationIssue[];
  fieldErrors: Partial<Record<PlanFormField, string>>;
  highlightedField?: PlanFormField;
  stepMessage?: string;
  mobileViewport?: boolean;
  onChange: (patch: Partial<TripRequestDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const inputClassName =
  "mt-2 min-h-11 w-full rounded-none border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[var(--sage-deep)]";
const START_DATE_HELPER_ID = "plan-field-start-date-helper";
const END_DATE_HELPER_ID = "plan-field-end-date-helper";

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

function describedBy(...ids: Array<string | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
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
    .split(/[、，\n]+/)
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
      <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? undefined : option)}
              className={`min-h-10 shrink-0 whitespace-nowrap border px-3 py-2 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:max-w-full sm:break-words sm:whitespace-normal ${
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

function OptionalPreferences({
  draft,
  onChange,
}: Pick<StepQuestionFormProps, "draft" | "onChange">) {
  return (
    <div className="space-y-5">
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
            placeholder="太商业化的景点"
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
        onChange={(value) => onChange({ localTransportPreference: value })}
      />

      <PreferenceButtons
        label="作息偏好"
        value={draft.schedulePreference}
        options={["不想早起", "可以早起", "下午慢一点"]}
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
          placeholder="比如：不吃辣、不想爬山、带着老人出行。"
          className={`${inputClassName} min-h-28 resize-y`}
        />
      </label>
    </div>
  );
}

export function StepQuestionForm({
  draft,
  currentStep,
  issues,
  fieldErrors,
  highlightedField,
  stepMessage,
  mobileViewport = false,
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
      className={`min-w-0 overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] shadow-[5px_6px_0_var(--sand)] sm:shadow-[8px_9px_0_var(--sand)] ${
        mobileViewport
          ? "flex h-full min-h-0 flex-col p-4"
          : "p-4 sm:p-7"
      }`}
    >
      <div className="flex flex-col gap-3 border-b border-dashed border-[var(--line)] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
            第 {currentStep + 1} 步，共 {PLAN_STEPS.length} 步
          </p>
          <h2 className="mt-1.5 text-xl font-semibold sm:mt-2 sm:text-2xl">
            {step.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
            {step.note}
          </p>
        </div>
        <div
          className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto"
          aria-label={`填写进度：第 ${currentStep + 1} 步，共 ${PLAN_STEPS.length} 步`}
        >
          {PLAN_STEPS.map((item, index) => (
            <span
              key={item.title}
              aria-hidden="true"
              className={`h-1.5 min-w-0 sm:h-2 sm:w-8 ${
                index <= currentStep ? "bg-[var(--clay)]" : "bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
      </div>

      {stepMessage ? (
        <p
          role="alert"
          className="mt-4 break-words border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]"
        >
          {stepMessage}
        </p>
      ) : null}

      {issues.length > 0 ? (
        <ul className="mt-4 space-y-1 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]">
          {issues.map((issue) => (
            <li key={`${issue.field}-${issue.message}`} className="break-words">
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={
          mobileViewport
            ? "mt-4 min-h-0 flex-1 overflow-y-auto pr-1"
            : "mt-6 min-w-0"
        }
      >
        {currentStep === 0 ? (
          <div className="space-y-4">
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
                  lang="zh-CN"
                  value={draft.startDate ?? ""}
                  onChange={(event) =>
                    onChange({
                      startDate: event.target.value || undefined,
                    })
                  }
                  title="请选择开始日期"
                  aria-invalid={startDateState.invalid || undefined}
                  aria-describedby={describedBy(
                    START_DATE_HELPER_ID,
                    startDateState.describedBy,
                  )}
                  className={inputWithStateClass(startDateState.invalid)}
                />
                <p
                  id={START_DATE_HELPER_ID}
                  className="mt-1.5 text-xs font-normal leading-5 text-[var(--ink-muted)]"
                >
                  日期可选。不填日期时，会按天数生成通用方案。
                </p>
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
                  lang="zh-CN"
                  value={draft.endDate ?? ""}
                  onChange={(event) =>
                    onChange({
                      endDate: event.target.value || undefined,
                    })
                  }
                  title="请选择结束日期"
                  aria-invalid={endDateState.invalid || undefined}
                  aria-describedby={describedBy(
                    END_DATE_HELPER_ID,
                    endDateState.describedBy,
                  )}
                  className={inputWithStateClass(endDateState.invalid)}
                />
                <p
                  id={END_DATE_HELPER_ID}
                  className="mt-1.5 text-xs font-normal leading-5 text-[var(--ink-muted)]"
                >
                  若填写，请用日期选择器选择完整日期。
                </p>
                <FieldError field="endDate" message={endDateState.message} />
              </label>
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-5">
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
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-5">
            <TravelStyleSelector
              fieldId={getPlanFieldMeta("travelStyles").elementId}
              errorId={travelStylesState.describedBy}
              errorMessage={travelStylesState.message}
              invalid={travelStylesState.invalid}
              highlighted={travelStylesState.highlighted}
              legend="这趟想怎么走"
              helperText="至少选一个，不用担心选得不够专业。"
              selected={draft.travelStyles ?? []}
              onToggle={(style) =>
                onChange({
                  travelStyles: toggleValue(draft.travelStyles, style),
                })
              }
            />

            <details className="group overflow-hidden border border-dashed border-[var(--line-strong)] bg-[var(--paper-bright)] lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--clay)] [&::-webkit-details-marker]:hidden">
                <span>再补一点（可选）</span>
                <span className="text-xs text-[var(--ink-muted)]">
                  <span className="group-open:hidden">展开</span>
                  <span className="hidden group-open:inline">收起</span>
                </span>
              </summary>
              <div className="border-t border-dashed border-[var(--line)] px-3.5 py-4">
                <OptionalPreferences draft={draft} onChange={onChange} />
              </div>
            </details>

            <div className="hidden lg:block">
              <OptionalPreferences draft={draft} onChange={onChange} />
            </div>

            <p className="border-l-2 border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--sage-deep)]">
              最后看一眼左边的旅行草稿。没问题就生成，之后还可以继续修改。
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={`border-t border-dashed border-[var(--line)] pt-4 ${
          mobileViewport
            ? "mt-4"
            : "mt-7 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2.5 sm:mt-8 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:pt-5"
        }`}
      >
        <div className={mobileViewport ? "grid grid-cols-2 gap-2.5" : ""}>
          <button
            type="button"
            onClick={onBack}
            disabled={currentStep === 0}
            className="min-h-12 w-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] disabled:cursor-not-allowed disabled:opacity-30 sm:min-h-11 sm:w-auto sm:border-0 sm:bg-transparent sm:px-2 sm:py-2"
          >
            上一步
          </button>

          <button
            type="submit"
            className="min-h-12 w-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] sm:min-h-11 sm:w-auto sm:px-5 sm:shadow-[4px_4px_0_var(--clay)]"
          >
            {currentStep === PLAN_STEPS.length - 1 ? "生成行程" : "下一步"}
          </button>
        </div>
      </div>
    </form>
  );
}
