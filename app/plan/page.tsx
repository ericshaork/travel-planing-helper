"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { GenerateLoading } from "@/components/trip/GenerateLoading";
import { MissingFieldsSummary } from "@/components/trip/MissingFieldsSummary";
import { ParsedTripCard } from "@/components/trip/ParsedTripCard";
import {
  PLAN_STEPS,
  StepQuestionForm,
} from "@/components/trip/StepQuestionForm";
import {
  getMissingTripRequestFieldDetails,
  getPlanFieldMeta,
  getTripRequestIssueFieldDetails,
  type PlanFormField,
} from "@/lib/trip/plan-fields";
import {
  getMissingTripRequestFields,
  normalizeTripRequestDraft,
  resolveTripRequestDraftDates,
  type TripRequestNormalizationIssue,
} from "@/lib/trip/normalize";
import {
  markCurrentTripAsUnsaved,
  loadParsedTripSession,
  loadTripRequestDraft,
  saveTripPlan,
  saveTripRequest,
  saveTripRequestDraft,
} from "@/lib/trip/storage";
import { generateTripResponseSchema } from "@/lib/trip/schema";
import type {
  GenerateTripResponse,
  TripRequest,
  TripRequestDraft,
} from "@/lib/trip/types";
import type { ApiErrorResponse } from "@/lib/utils/errors";

type PageState = "loading" | "missing" | "editing" | "prepared";

class FriendlyGenerationError extends Error {}

function mergeParsedSessionDraft(
  draft: TripRequestDraft,
  selectedInterests: string[],
  selectedTravelStyles: string[],
): TripRequestDraft {
  return {
    ...draft,
    interests: [
      ...new Set([...(draft.interests ?? []), ...selectedInterests]),
    ],
    travelStyles: [
      ...new Set([...(draft.travelStyles ?? []), ...selectedTravelStyles]),
    ],
  };
}

function ReturnHomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center border-b border-[var(--line-strong)] pb-1 text-sm font-semibold text-[var(--ink-muted)] transition-colors duration-200 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
    >
      回到工作台
    </Link>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [draft, setDraft] = useState<TripRequestDraft>();
  const [tripRequest, setTripRequest] = useState<TripRequest>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string>();
  const generationInFlight = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [issues, setIssues] = useState<TripRequestNormalizationIssue[]>([]);
  const [stepMessage, setStepMessage] = useState<string>();
  const [highlightedField, setHighlightedField] = useState<PlanFormField>();
  const requestedFocusField = useRef<PlanFormField | undefined>(undefined);
  const [focusRequestKey, setFocusRequestKey] = useState(0);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedDraft = loadTripRequestDraft();
      const parsedSession = loadParsedTripSession();

      if (!savedDraft && !parsedSession) {
        setPageState("missing");
        return;
      }

      const restoredDraft =
        savedDraft ??
        mergeParsedSessionDraft(
          parsedSession?.parseResult.parsed ?? {},
          parsedSession?.selectedInterests ?? [],
          parsedSession?.selectedTravelStyles ?? [],
        );
      const syncedDraft = {
        ...restoredDraft,
        ...resolveTripRequestDraftDates(restoredDraft),
      };
      const missingFieldDetails = getMissingTripRequestFieldDetails(
        getMissingTripRequestFields(syncedDraft),
      );

      setDraft(syncedDraft);
      setCurrentStep(missingFieldDetails[0]?.step ?? 0);
      saveTripRequestDraft(syncedDraft);
      setPageState("editing");
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (pageState === "editing" && draft) {
      saveTripRequestDraft(draft);
    }
  }, [draft, pageState]);

  const missingFields = useMemo(
    () => (draft ? getMissingTripRequestFields(draft) : []),
    [draft],
  );
  const missingFieldDetails = useMemo(
    () => getMissingTripRequestFieldDetails(missingFields),
    [missingFields],
  );
  const issueFieldDetails = useMemo(
    () => getTripRequestIssueFieldDetails(issues),
    [issues],
  );
  const fieldErrors = useMemo(() => {
    const nextFieldErrors: Partial<Record<PlanFormField, string>> = {};

    for (const field of missingFieldDetails) {
      nextFieldErrors[field.field] = field.message;
    }

    for (const field of issueFieldDetails) {
      nextFieldErrors[field.field] = field.message;
    }

    return nextFieldErrors;
  }, [issueFieldDetails, missingFieldDetails]);

  useEffect(() => {
    const field = requestedFocusField.current;

    if (!field) {
      return;
    }

    const meta = getPlanFieldMeta(field);
    const element = document.getElementById(meta.elementId);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    const focusTimer = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      element.focus({ preventScroll: true });
      requestedFocusField.current = undefined;
    });

    return () => window.cancelAnimationFrame(focusTimer);
  }, [currentStep, focusRequestKey]);

  function focusField(field: PlanFormField) {
    const meta = getPlanFieldMeta(field);
    requestedFocusField.current = field;
    setHighlightedField(field);
    setFocusRequestKey((value) => value + 1);
    setCurrentStep(meta.step);
  }

  function updateDraft(patch: Partial<TripRequestDraft>) {
    setDraft((current) => {
      const nextDraft = {
        ...current,
        ...patch,
      };

      return {
        ...nextDraft,
        ...resolveTripRequestDraftDates(nextDraft),
      };
    });
    setIssues([]);
    setStepMessage(undefined);
    setHighlightedField(undefined);
  }

  function handleNext() {
    const blockers = missingFieldDetails.filter(
      (field) => field.step === currentStep,
    );

    if (blockers.length > 0) {
      setStepMessage("这一步还有几项没补完，点提示就能继续改。");
      focusField(blockers[0].field);
      return;
    }

    setStepMessage(undefined);
    setCurrentStep((step) => Math.min(step + 1, PLAN_STEPS.length - 1));
  }

  async function generateTrip(request: TripRequest) {
    if (generationInFlight.current) {
      return;
    }

    generationInFlight.current = true;
    setGenerationError(undefined);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tripRequest: request }),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const apiError = payload as Partial<ApiErrorResponse>;
        throw new FriendlyGenerationError(
          apiError.error?.message ??
            "路线刚刚没排出来，原来的信息还在，可以再试一次。",
        );
      }

      const parsed = generateTripResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw new FriendlyGenerationError(
          "返回的行程格式不完整，先别用这版，再试一次。",
        );
      }

      const result: GenerateTripResponse = parsed.data;
      saveTripPlan(result.tripPlan);
      router.push("/result");
    } catch (error) {
      setGenerationError(
        error instanceof FriendlyGenerationError
          ? error.message
          : "路线刚刚没排出来，原来的信息还在，可以再试一次。",
      );
    } finally {
      generationInFlight.current = false;
      setIsGenerating(false);
    }
  }

  function handleSubmit() {
    if (!draft) {
      return;
    }

    const result = normalizeTripRequestDraft(draft);

    if (!result.success) {
      setIssues(result.issues);
      setStepMessage(
        result.missingFields.length > 0
          ? "还差几项信息，补完这些就能生成行程。"
          : "有几项还对不上，按提示改一下。",
      );
      const missingDetails = getMissingTripRequestFieldDetails(
        result.missingFields,
      );
      const issueDetails = getTripRequestIssueFieldDetails(result.issues);
      const firstField = missingDetails[0]?.field ?? issueDetails[0]?.field;

      if (firstField) {
        focusField(firstField);
      }

      return;
    }

    markCurrentTripAsUnsaved();
    saveTripRequest(result.tripRequest);
    setTripRequest(result.tripRequest);
    setPageState("prepared");
    void generateTrip(result.tripRequest);
  }

  if (pageState === "loading") {
    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8">
          <ReturnHomeLink />
          <p className="py-20 text-center text-sm font-semibold text-[var(--ink-muted)]">
            正在打开这张旅行草稿…
          </p>
        </main>
      </div>
    );
  }

  if (pageState === "missing") {
    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
          <ReturnHomeLink />
          <section className="mt-10 border border-[var(--line-strong)] bg-[var(--paper)] p-7 shadow-[8px_9px_0_var(--sand)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              没找到旅行草稿
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              这页还不知道你想去哪。
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              先回首页写一句旅行需求。解析完以后，这里会接着帮你补齐信息。
            </p>
            <Link
              href="/create"
              className="mt-7 inline-block border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              重新填写需求
            </Link>
            <div className="mt-3">
              <Link
                href="/"
                className="inline-block border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                回到工作台
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (pageState === "prepared" && tripRequest) {
    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="flex-1 px-5 py-10 sm:px-8">
          <div className="mx-auto mb-8 max-w-4xl">
            <ReturnHomeLink />
          </div>
          <GenerateLoading
            tripRequest={tripRequest}
            isGenerating={isGenerating}
            errorMessage={generationError}
            onBack={() => {
              setGenerationError(undefined);
              setPageState("editing");
            }}
            onRetry={() => void generateTrip(tripRequest)}
          />
        </main>
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>
    );
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 pb-3 pt-2 sm:px-8 sm:pb-16 sm:pt-10 lg:overflow-visible">
        <div className="mb-3 sm:mb-4">
          <ReturnHomeLink />
        </div>

        <div className="mb-2 max-w-2xl lg:mb-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
            补几句，就能开始排路线
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] sm:mt-3 sm:text-4xl">
            先把旅行需求说清楚。
          </h1>
          <p className="mt-2 hidden text-sm leading-6 text-[var(--ink-muted)] sm:block sm:mt-3 sm:leading-7">
            已经认出来的都留着。你可以直接改，也可以按步骤把空白补上。
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            这一页才是最终确认页。你现在改过的预算、日期、天数、地点和偏好，会覆盖上一页的一句话草稿，并作为最终 TripRequest 进入生成。
          </p>
        </div>

        <div className="min-h-0 lg:hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            <ParsedTripCard draft={draft} missingFields={missingFields} />

            <MissingFieldsSummary
              missingFields={missingFieldDetails}
              onSelect={focusField}
            />

            <div className="min-h-0 flex-1">
              <StepQuestionForm
                draft={draft}
                currentStep={currentStep}
                issues={issues}
                fieldErrors={fieldErrors}
                highlightedField={highlightedField}
                stepMessage={stepMessage}
                mobileViewport
                onChange={updateDraft}
                onBack={() => {
                  setStepMessage(undefined);
                  setHighlightedField(undefined);
                  setCurrentStep((step) => Math.max(0, step - 1));
                }}
                onNext={handleNext}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>

        <div className="hidden items-start gap-4 lg:grid lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)] lg:gap-7">
          <ParsedTripCard draft={draft} missingFields={missingFields} />

          <div className="min-w-0 space-y-4">
            <MissingFieldsSummary
              missingFields={missingFieldDetails}
              onSelect={focusField}
            />

            <StepQuestionForm
              draft={draft}
              currentStep={currentStep}
              issues={issues}
              fieldErrors={fieldErrors}
              highlightedField={highlightedField}
              stepMessage={stepMessage}
              onChange={updateDraft}
              onBack={() => {
                setStepMessage(undefined);
                setHighlightedField(undefined);
                setCurrentStep((step) => Math.max(0, step - 1));
              }}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
