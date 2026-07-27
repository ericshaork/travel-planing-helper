"use client";

import { useEffect, useMemo, useState } from "react";

import {
  GENERATION_BOTTOM_FRAME_SRC,
  GENERATION_PROGRESS_STAGES,
  GENERATION_TOP_FRAME_SRC,
  GENERATION_WATERCOLOR_IMAGES,
  LOADING_MESSAGES_DATA,
  resolveGenerationMessageTheme,
  TRAVEL_QUOTES_DATA,
  type GenerationExperienceStatus,
  type GenerationQuoteItem,
} from "@/lib/projects/generation-experience";

interface ProjectGenerationExperienceProps {
  status: GenerationExperienceStatus;
  destinationLabel?: string;
  latestUserMessage?: string;
  errorMessage?: string;
  onRetry: () => void;
  onBack: () => void;
}

export function ProjectGenerationExperience({
  status,
  destinationLabel,
  latestUserMessage,
  errorMessage,
  onRetry,
  onBack,
}: ProjectGenerationExperienceProps) {
  const [illustrationIndex, setIllustrationIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(4);

  const theme = useMemo(
    () =>
      resolveGenerationMessageTheme({
        latestUserMessage,
        destination: destinationLabel,
      }),
    [destinationLabel, latestUserMessage],
  );

  const stage =
    GENERATION_PROGRESS_STAGES[
      Math.min(stageIndex, GENERATION_PROGRESS_STAGES.length - 1)
    ]!;
  const themeMessages =
    LOADING_MESSAGES_DATA[theme]?.length > 0
      ? LOADING_MESSAGES_DATA[theme]
      : LOADING_MESSAGES_DATA.general;
  const themeQuotes =
    TRAVEL_QUOTES_DATA[theme]?.length > 0
      ? TRAVEL_QUOTES_DATA[theme]
      : TRAVEL_QUOTES_DATA.general;
  const topMessage =
    themeMessages[stageIndex % themeMessages.length] ?? themeMessages[0] ?? "";
  const quote: GenerationQuoteItem =
    themeQuotes[quoteIndex % themeQuotes.length] ??
    themeQuotes[0] ??
    TRAVEL_QUOTES_DATA.general[0]!;
  const activeIllustration =
    GENERATION_WATERCOLOR_IMAGES[
      illustrationIndex % GENERATION_WATERCOLOR_IMAGES.length
    ]!;

  useEffect(() => {
    if (status !== "generating") {
      return;
    }

    const illustrationTimer = window.setInterval(() => {
      setIllustrationIndex(
        (current) => (current + 1) % GENERATION_WATERCOLOR_IMAGES.length,
      );
    }, 4200);
    const quoteTimer = window.setInterval(() => {
      setQuoteIndex((current) => current + 1);
    }, 6200);
    const stageTimer = window.setInterval(() => {
      setStageIndex((current) =>
        Math.min(current + 1, GENERATION_PROGRESS_STAGES.length - 1),
      );
    }, 2800);

    return () => {
      window.clearInterval(illustrationTimer);
      window.clearInterval(quoteTimer);
      window.clearInterval(stageTimer);
    };
  }, [status]);

  useEffect(() => {
    if (status === "error") {
      return;
    }

    if (status === "success") {
      setStageIndex(GENERATION_PROGRESS_STAGES.length - 1);
      setProgress(100);
      return;
    }

    const target = stage.progressTarget;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= target) {
          return current;
        }

        return Math.min(target, current + Math.max(1, (target - current) / 5));
      });
    }, 240);

    return () => {
      window.clearInterval(timer);
    };
  }, [stage.progressTarget, status]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-3 shadow-[8px_8px_0_var(--sand-soft)] sm:px-4 sm:py-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(208,190,156,0.14),_transparent_48%)]" />

      <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-col items-center space-y-5">
        <div className="relative mx-auto w-full max-w-4xl">
          <div className="relative mx-auto aspect-[5/1.55] w-full max-w-[780px] drop-shadow-[0_16px_26px_rgba(80,58,35,0.16)]">
            <img
              src={GENERATION_TOP_FRAME_SRC}
              alt=""
              className="block h-full w-full object-contain"
            />
            <div className="absolute inset-[10%_7%_16%_7%] flex flex-col justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)] sm:text-[11px]">
                {status === "error" ? "Generation paused" : "Wanderly is drafting"}
              </p>
              <h2 className="mt-1 text-base font-semibold leading-tight text-[var(--ink)] sm:text-xl">
                {status === "success"
                  ? "Travel workspace draft is ready."
                  : status === "error"
                    ? "The trip draft paused before handoff."
                    : destinationLabel
                      ? `Building ${destinationLabel} into a full trip.`
                      : "Building your full trip now."}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)] sm:text-sm">
                {status === "error" ? errorMessage : topMessage}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl space-y-5">
          <div className="relative mx-auto w-full overflow-hidden rounded-[28px] border border-[var(--line)] bg-[rgb(255_251_243/0.96)] p-3 shadow-[0_18px_32px_rgba(60,42,24,0.14)] sm:p-4">
            <div className="relative">
              <img
                key={activeIllustration}
                src={activeIllustration}
                alt="Travel watercolor illustration"
                className="block h-auto min-h-[360px] w-full rounded-[22px] object-cover shadow-[0_12px_28px_rgba(76,56,38,0.18)] sm:min-h-[460px] lg:min-h-[560px]"
              />
              <div className="absolute left-4 top-4 rounded-full border border-[rgba(255,251,243,0.92)] bg-[rgba(255,251,243,0.92)] px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[var(--ink-muted)] shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
                Watercolor travel sketch
              </div>
              <div className="absolute inset-x-0 bottom-0 space-y-2 bg-[linear-gradient(180deg,rgba(255,251,243,0)_0%,rgba(255,251,243,0.84)_58%,rgba(255,251,243,0.96)_100%)] px-4 pb-4 pt-14 sm:px-5 sm:pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--line)] bg-[rgb(255_251_243/0.95)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--ink-muted)]">
                    {stage.label}
                  </span>
                  <span className="rounded-full border border-[var(--line)] bg-[rgb(255_251_243/0.95)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-muted)]">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(231_224_212/0.95)]">
                  <div
                    className={`h-full rounded-full transition-[width,background-color] duration-500 ${
                      status === "error"
                        ? "bg-[var(--dusty-rose)]"
                        : status === "success"
                          ? "bg-[var(--sage-deep)]"
                          : "bg-[var(--clay)]"
                    }`}
                    style={{ width: `${Math.round(progress)}%` }}
                  />
                </div>

                <p className="max-w-2xl text-sm leading-6 text-[var(--ink)] sm:text-[15px]">
                  {status === "success"
                    ? "Everything is packed into the project context. Opening Workspace next."
                    : status === "error"
                      ? "You can retry generation, or go back and keep adjusting the proposal."
                      : stage.detail}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:items-start">
            <div className="rounded-[24px] border border-[var(--line)] bg-[rgb(255_251_243/0.74)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                Current handoff
              </p>
              <div className="mt-2 space-y-2">
                {GENERATION_PROGRESS_STAGES.map((item, index) => {
                  const isActive = index === stageIndex;
                  const isDone = index < stageIndex || progress >= item.progressTarget;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-[18px] border px-3 py-2 transition-colors ${
                        isActive
                          ? "border-[var(--clay)] bg-[var(--clay-soft)]"
                          : isDone
                            ? "border-[var(--sage)] bg-[rgb(219_232_220/0.52)]"
                            : "border-[var(--line)] bg-[var(--paper-bright)]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                        {item.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative mx-auto aspect-[5/1.7] w-full max-w-[560px] drop-shadow-[0_16px_26px_rgba(80,58,35,0.14)]">
                <img
                  src={GENERATION_BOTTOM_FRAME_SRC}
                  alt=""
                  className="block h-full w-full object-contain"
                />
                <div className="absolute inset-[16%_9%_18%_9%] flex flex-col justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                    Travel note
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink)] sm:text-[15px]">
                    "{quote.text}"
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-[var(--ink-muted)]">
                    {quote.author}
                  </p>
                </div>
              </div>

              {status === "error" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)]"
                  >
                    Retry generation
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
                  >
                    Back to proposal
                  </button>
                </div>
              ) : (
                <p className="px-1 text-xs leading-5 text-[var(--ink-muted)]">
                  {status === "success"
                    ? "Project version and workspace session are ready."
                    : "This first pass keeps the progress simulated, with the artwork and quote data already wired in."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
