"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthStatus } from "@/components/auth/useAuthStatus";
import type { TripResultEnrichment } from "@/lib/trip/enrichment-types";
import {
  getSavedTripMetadata,
  type SavedTripMetadata,
} from "@/lib/trip/storage";
import type { TripPlan, TripRequest } from "@/lib/trip/types";
import { persistCurrentTrip } from "@/lib/trips/save-flow";
import { buildSaveTripLoginHref } from "@/lib/trips/save-client";
import {
  getSaveButtonCopy,
  type SaveActionState,
} from "@/lib/trips/save-status";

interface SaveCurrentTripButtonProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
  tripEnrichment?: TripResultEnrichment | null;
}

export function SaveCurrentTripButton({
  tripPlan,
  tripRequest,
  tripEnrichment = null,
}: SaveCurrentTripButtonProps) {
  const router = useRouter();
  const authState = useAuthStatus();
  const [actionState, setActionState] = useState<SaveActionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [savedTripMetadata, setSavedTripMetadata] =
    useState<SavedTripMetadata | null>(() => getSavedTripMetadata());

  async function handleSaveClick() {
    if (!tripRequest) {
      setActionState("error");
      setErrorMessage("当前缺少原始出行需求，暂时还不能保存这版方案。");
      return;
    }

    if (authState.status !== "authenticated") {
      router.push(buildSaveTripLoginHref("/result"));
      return;
    }

    const isUpdate = Boolean(savedTripMetadata?.savedTripId);
    setActionState(isUpdate ? "updating" : "saving");
    setErrorMessage(undefined);

    try {
      const result = await persistCurrentTrip({
        tripRequest,
        tripPlan,
        tripEnrichment,
      });

      setSavedTripMetadata(getSavedTripMetadata());
      setActionState(result.mode === "updated" ? "updated" : "saved");
    } catch (error) {
      setActionState("error");
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : isUpdate
            ? "暂时更新不了这条已保存计划，请稍后再试。"
            : "当前方案暂时没保存成功，请稍后再试。",
      );
    }
  }

  const copy = getSaveButtonCopy(
    authState.status,
    actionState,
    savedTripMetadata,
    errorMessage,
  );

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleSaveClick}
        disabled={
          actionState === "saving" ||
          actionState === "updating" ||
          authState.status === "loading"
        }
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-4 py-2.5 font-semibold text-[var(--sage-deep)] transition-colors hover:bg-[var(--paper-bright)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
      >
        {copy.label}
      </button>

      <p
        aria-live="polite"
        className="max-w-64 text-xs leading-5 text-[var(--ink-muted)]"
      >
        {copy.message}
      </p>
    </div>
  );
}
