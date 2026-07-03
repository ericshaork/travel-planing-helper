"use client";

import Link from "next/link";
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
  "这次没改出来，先保留原方案。可以直接再试一次。";

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
      setErrorMessage(
        "原始需求这边没留住，想改这版的话，先回 /plan 重新生成一次。",
      );
      setSuccessMessage(undefined);
      setAppliedChanges([]);
      return;
    }

    if (!trimmedRequest) {
      setStatusDraftVersion(externalDraftVersion);
      setErrorMessage("想改哪儿？直接说一句就行。");
      setSuccessMessage(undefined);
      setAppliedChanges([]);
      return;
    }

    if (trimmedRequest.length > TRIP_INPUT_LIMITS.modificationRequest) {
      setStatusDraftVersion(externalDraftVersion);
      setErrorMessage(
        `修改要求先别写太长，控制在 ${TRIP_INPUT_LIMITS.modificationRequest} 个字以内。`,
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
        throw new Error(
          "这次返回的内容不够完整，先别用这一版，再试一次。",
        );
      }

      onRegenerated(parsed.data);
      setStatusDraftVersion(externalDraftVersion);
      setAppliedChanges(parsed.data.appliedChanges ?? []);
      setSuccessMessage("已经按你的补充要求重排了一版。");
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
      className="overflow-hidden border border-dashed border-[var(--line-strong)] bg-[var(--sand-soft)] p-4 sm:p-5"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
        想再改一版
      </p>
      <h2 id="regenerate-title" className="mt-2 text-lg font-semibold sm:text-xl">
        想改哪儿？直接说。
      </h2>
      <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
        比如：这天太满了，少安排两个点。或者：加一个夜市，别太早起。
      </p>

      <label className="mt-4 block">
        <span className="sr-only">重新生成修改要求</span>
        <textarea
          value={modificationRequest}
          onChange={(event) => {
            onModificationRequestChange(event.target.value);
            setErrorMessage(undefined);
          }}
          maxLength={TRIP_INPUT_LIMITS.modificationRequest}
          rows={4}
          placeholder="把这版改轻一点，或者告诉我哪里想换。"
          className="min-h-32 w-full resize-y border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-3 text-sm leading-6 placeholder:text-[var(--ink-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
        <p className="min-w-0 break-words">
          会保留原来的出发地、预算、兴趣和当前这版行程。
        </p>
        <span className="shrink-0">
          {trimmedRequest.length}/{TRIP_INPUT_LIMITS.modificationRequest}
        </span>
      </div>

      {!hasTripRequest ? (
        <div className="mt-4 border-l-2 border-[var(--clay)] bg-[var(--paper-bright)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)]">
          原始需求这边没保存完整，这一版还能看，但现在没法安全重排。
          <div className="mt-3">
            <Link
              href="/plan"
              className="border-b border-[var(--clay-deep)] pb-1 font-semibold"
            >
              回 /plan 重新生成
            </Link>
          </div>
        </div>
      ) : null}

      {showCurrentStatus && successMessage ? (
        <p
          role="status"
          className="mt-4 break-words border-l-2 border-[var(--sage-deep)] bg-[var(--paper-bright)] px-4 py-3 text-sm leading-6 text-[var(--sage-deep)]"
        >
          {successMessage}
        </p>
      ) : null}

      {showCurrentStatus && appliedChanges.length > 0 ? (
        <div className="mt-4 border border-[var(--line)] bg-[var(--paper-bright)] px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
            这次改了什么
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
          className="mt-4 break-words border-l-2 border-[var(--clay)] bg-[var(--paper-bright)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)]"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => void submitRegeneration()}
          disabled={isSubmitting || !hasTripRequest}
          className="min-h-11 w-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:shadow-[4px_4px_0_var(--clay)]"
        >
          {isSubmitting ? "重新排一版..." : "按这句重排"}
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
            保留你的偏好，把这版改轻一点。
          </p>
        ) : null}
      </div>
    </section>
  );
}
