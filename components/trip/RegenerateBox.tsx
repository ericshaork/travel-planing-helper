"use client";

import { useState } from "react";

import { TRIP_INPUT_LIMITS } from "@/lib/trip/defaults";
import { generateTripResponseSchema } from "@/lib/trip/schema";
import type {
  GenerateTripResponse,
  TripPlan,
  TripRequest,
} from "@/lib/trip/types";
import type { ApiErrorResponse } from "@/lib/utils/errors";

interface RegenerateBoxProps {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
  modificationRequest: string;
  externalDraftVersion?: number;
  onModificationRequestChange: (value: string) => void;
  onRegenerated: (response: GenerateTripResponse) => void;
}

const retryableErrorMessage =
  "这次 AI 调整没有顺利完成。先保留当前行程，再试一次更短、更明确的修改要求。";

export function RegenerateBox({
  tripPlan,
  tripRequest,
  modificationRequest,
  externalDraftVersion = 0,
  onModificationRequestChange,
  onRegenerated,
}: RegenerateBoxProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [appliedChanges, setAppliedChanges] = useState<string[]>([]);
  const [statusDraftVersion, setStatusDraftVersion] = useState(0);

  const trimmedRequest = modificationRequest.trim();
  const hasTripRequest = Boolean(tripRequest);
  const showCurrentStatus = statusDraftVersion === externalDraftVersion;

  async function submitRegeneration() {
    if (!hasTripRequest) {
      setStatusDraftVersion(externalDraftVersion);
      setErrorMessage("补全旅行需求后，才能让 AI 安全地扩展或重排这份行程。");
      setSuccessMessage(undefined);
      setAppliedChanges([]);
      return;
    }

    if (!trimmedRequest) {
      setStatusDraftVersion(externalDraftVersion);
      setErrorMessage("先写一句你想怎么改。");
      setSuccessMessage(undefined);
      setAppliedChanges([]);
      return;
    }

    if (trimmedRequest.length > TRIP_INPUT_LIMITS.modificationRequest) {
      setStatusDraftVersion(externalDraftVersion);
      setErrorMessage(
        `修改要求请控制在 ${TRIP_INPUT_LIMITS.modificationRequest} 个字符内。`,
      );
      setSuccessMessage(undefined);
      setAppliedChanges([]);
      return;
    }

    setIsSubmitting(true);
    setStatusDraftVersion(externalDraftVersion);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    setAppliedChanges([]);

    try {
      const response = await fetch("/api/generate-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripRequest,
          previousPlan: tripPlan,
          modificationRequest: trimmedRequest,
        }),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const apiError = payload as Partial<ApiErrorResponse>;
        throw new Error(apiError.error?.message ?? retryableErrorMessage);
      }

      const parsed = generateTripResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Error("AI 返回的内容不完整，换一个更小的调整试试。");
      }

      onRegenerated(parsed.data);
      setStatusDraftVersion(externalDraftVersion);
      setAppliedChanges(parsed.data.appliedChanges ?? []);
      setSuccessMessage("已经按你的最新要求准备了一版新行程。");
      onModificationRequestChange("");
    } catch (error) {
      setStatusDraftVersion(externalDraftVersion);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : retryableErrorMessage,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="regenerate-title"
      className="workspace-panel relative overflow-hidden border border-dashed border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(248,241,226,0.96)_0%,rgba(255,253,247,0.98)_100%)] p-4 sm:p-5"
    >
      <div className="relative z-[1]">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          AI 调整
        </p>
        <h3 id="regenerate-title" className="mt-2 text-lg font-semibold sm:text-xl">
          告诉 AI 你想怎么改
        </h3>
        <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
          例如：这一天轻松一点、加一个夜市、不要太早出门。
        </p>

        <label className="mt-4 block">
          <span className="sr-only">AI 调整要求</span>
          <textarea
            value={modificationRequest}
            onChange={(event) => {
              onModificationRequestChange(event.target.value);
              setErrorMessage(undefined);
            }}
            maxLength={TRIP_INPUT_LIMITS.modificationRequest}
            rows={4}
            placeholder="比如：把这一天改轻松一点，保留海边和晚饭。"
            className="min-h-32 w-full resize-y rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-3 text-sm leading-6 placeholder:text-[var(--ink-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
          <p className="min-w-0 break-words">
            AI 会保留当前需求、预算偏好和这份行程，再按你的要求重排。
          </p>
          <span className="shrink-0">
            {trimmedRequest.length}/{TRIP_INPUT_LIMITS.modificationRequest}
          </span>
        </div>

        {!hasTripRequest ? (
          <div className="mt-4 rounded-[18px] border-l-2 border-[var(--clay)] bg-[var(--paper-bright)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)]">
            当前草稿信息还少，建议先补目的地或第一个地点，再让 AI 帮你扩展行程。
          </div>
        ) : null}

        {showCurrentStatus && successMessage ? (
          <p
            role="status"
            className="mt-4 break-words rounded-[18px] border-l-2 border-[var(--sage-deep)] bg-[var(--paper-bright)] px-4 py-3 text-sm leading-6 text-[var(--sage-deep)]"
          >
            {successMessage}
          </p>
        ) : null}

        {showCurrentStatus && appliedChanges.length > 0 ? (
          <div className="mt-4 rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
              已应用的调整
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--ink)]">
              {appliedChanges.map((item) => (
                <li key={item} className="break-words">
                  - {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showCurrentStatus && errorMessage ? (
          <p
            role="alert"
            className="mt-4 break-words rounded-[18px] border-l-2 border-[var(--clay)] bg-[var(--paper-bright)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void submitRegeneration()}
            disabled={isSubmitting || !hasTripRequest}
            className="min-h-11 w-full rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:shadow-[4px_4px_0_var(--clay)]"
          >
            {isSubmitting ? "AI 正在调整..." : "让 AI 帮我调整"}
          </button>

          {showCurrentStatus && errorMessage && hasTripRequest ? (
            <button
              type="button"
              onClick={() => void submitRegeneration()}
              disabled={isSubmitting}
              className="min-h-11 border-b border-[var(--line-strong)] pb-1 text-left text-sm font-semibold text-[var(--ink-muted)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)] disabled:cursor-wait disabled:opacity-40"
            >
              再试一次
            </button>
          ) : null}

          {isSubmitting ? (
            <p className="text-sm text-[var(--ink-muted)]">
              正在保留现有偏好，重排这一版行程。
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
