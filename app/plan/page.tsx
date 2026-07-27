"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { GenerateLoading } from "@/components/trip/GenerateLoading";
import { MissingFieldsSummary } from "@/components/trip/MissingFieldsSummary";
import { TripDraftSidebar } from "@/components/trip/TripDraftSidebar";
import {
  ENTRY_SESSION_SOURCE_TYPES,
  ensureWorkspaceProjectEntry,
  getExistingProjectIdFromSession,
} from "@/lib/projects/entry-client";
import {
  PLAN_STEPS,
  StepQuestionForm,
} from "@/components/trip/StepQuestionForm";
import { postGenerateTrip } from "@/lib/ai/generate-client";
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
  clearWorkspaceSessionMetadata,
  ensureWorkspaceSessionMetadata,
  loadTripPlanDraft,
  markCurrentTripAsUnsaved,
  loadParsedTripSession,
  loadTripRequestDraft,
  saveTripPlanDraft,
  saveTripPlan,
  saveTripRequest,
  saveTripRequestDraft,
} from "@/lib/trip/storage";
import { generateTripResponseSchema } from "@/lib/trip/schema";
import type {
  GenerateTripResponse,
  TripPlanDraft,
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
      href="/create"
      className="inline-flex items-center border-b border-[var(--line-strong)] pb-1 text-sm font-semibold text-[var(--ink-muted)] transition-colors duration-200 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
    >
      回到创建页
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
  const [tripPlanDraft, setTripPlanDraft] = useState<TripPlanDraft | null>(null);
  const generationInFlight = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [issues, setIssues] = useState<TripRequestNormalizationIssue[]>([]);
  const [stepMessage, setStepMessage] = useState<string>();
  const [highlightedField, setHighlightedField] = useState<PlanFormField>();
  const requestedFocusField = useRef<PlanFormField | undefined>(undefined);
  const [focusRequestKey, setFocusRequestKey] = useState(0);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedPlanDraft = loadTripPlanDraft();
      const savedDraft = loadTripRequestDraft();
      const parsedSession = loadParsedTripSession();

      if (!savedPlanDraft && !savedDraft && !parsedSession) {
        setPageState("missing");
        return;
      }

      const restoredDraft =
        savedPlanDraft?.tripRequestDraft ??
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
      setTripPlanDraft(savedPlanDraft);
      setCurrentStep(missingFieldDetails[0]?.step ?? 0);
      saveTripRequestDraft(syncedDraft);
      setPageState("editing");
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (pageState === "editing" && draft) {
      saveTripRequestDraft(draft);

      if (tripPlanDraft) {
        saveTripPlanDraft({
          ...tripPlanDraft,
          tripRequestDraft: draft,
        });
      }
    }
  }, [draft, pageState, tripPlanDraft]);

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
      const response = await postGenerateTrip({
        tripRequest: request,
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
      ensureWorkspaceSessionMetadata({
        sourceType: "ai_generated",
        workspaceModeDefault: "read",
      });
      await ensureWorkspaceProjectEntry(
        {
          title:
            tripPlanDraft?.tripTitle?.trim() ||
            result.tripPlan.tripTitle ||
            `${request.destinationCity} trip`,
          sessionSourceType:
            tripPlanDraft?.sourceType === "explore_archive"
              ? ENTRY_SESSION_SOURCE_TYPES.exploreImport
              : ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
          sourceTitle:
            tripPlanDraft?.tripTitle?.trim() || request.destinationCity || null,
          sourcePayload:
            tripPlanDraft?.sourceType === "explore_archive"
              ? {
                  sourceOrigin: ENTRY_SESSION_SOURCE_TYPES.exploreImport,
                  sourceExploreId: tripPlanDraft.sourceExploreId,
                  sourceExploreSlug: tripPlanDraft.sourceExploreSlug,
                  tripRequestDraft: tripPlanDraft.tripRequestDraft,
                }
              : {
                  sourceOrigin: ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
                },
          tripPlan: result.tripPlan,
          tripRequest: request,
          createdFrom:
            tripPlanDraft?.sourceType === "explore_archive"
              ? "template_import"
              : "ai_generate",
          existingProjectId: getExistingProjectIdFromSession(),
          lifecycleState: "workspace",
          flowStage: "workspace_ready",
          workspaceModeDefault: "read",
        },
      ).catch(() => null);
      router.push("/workspace");
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
    clearWorkspaceSessionMetadata();
    saveTripRequest(result.tripRequest);
    setTripRequest(result.tripRequest);
    setPageState("prepared");
    void generateTrip(result.tripRequest);
  }

  if (pageState === "loading") {
    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
          <ReturnHomeLink />
          <p className="py-8 text-center text-sm font-semibold text-[var(--ink-muted)]">
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
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-5">
          <ReturnHomeLink />
          <section className="edit-gear-card mt-4 p-4">
            <p className="journey-kicker">没找到旅行草稿</p>
            <h1 className="journey-title mt-1.5 text-xl">
              这页还不知道你想去哪。
            </h1>
            <p className="journey-subtitle mt-2 text-sm leading-6">
              先回创建页写一句旅行需求。解析完以后，这里会接着帮你补齐信息。
            </p>
            <Link
              href="/create"
              className="mt-3 inline-block border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              重新填写需求
            </Link>
            <div className="mt-1.5">
              <Link
                href="/create"
                className="inline-block border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                回到创建页
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
        <main className="flex-1 px-2 py-2 sm:px-3 sm:py-3">
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
      <main className="mx-auto flex w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-1.5 sm:px-5 sm:pb-4 sm:pt-2.5 lg:max-w-7xl lg:overflow-visible">
        <div className="mb-0.5 max-w-2xl">
          <p className="journey-kicker">把想法搭成路线</p>
          <h1 className="journey-title mt-0.5 text-xl sm:mt-0.5 sm:text-xl">
            补几句，就能开始排路线。
          </h1>
          <p className="journey-subtitle mt-0.5 sm:mt-1 sm:text-[14px]">
            已经认出来的都留着。你可以直接改，也可以按步骤把空白补上。
          </p>
        </div>

        <div className="min-h-0 lg:hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <TripDraftSidebar draft={draft} missingFields={missingFields} />

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

        <div className="hidden items-start gap-3 lg:grid lg:grid-cols-[minmax(15rem,0.55fr)_minmax(0,1.45fr)] lg:gap-3.5">
          <TripDraftSidebar draft={draft} missingFields={missingFields} />

          <div className="min-w-0 space-y-1.5">
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
