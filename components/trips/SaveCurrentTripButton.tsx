"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { getWorkspaceSaveVisualMeta } from "@/lib/trip/workspace-visuals";
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
      setErrorMessage(
        "The original trip request is missing, so this version cannot be saved yet.",
      );
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
            ? "We could not update this saved trip yet. Please try again in a moment."
            : "We could not save this trip yet. Please try again in a moment.",
      );
    }
  }

  const copy = getSaveButtonCopy(
    authState.status,
    actionState,
    savedTripMetadata,
    errorMessage,
  );

  const visualMeta = getWorkspaceSaveVisualMeta({
    authStatus: authState.status,
    actionState,
    hasSavedTrip: Boolean(savedTripMetadata?.savedTripId),
  });

  const isBusy =
    actionState === "saving" ||
    actionState === "updating" ||
    authState.status === "loading";

  const toneClassName =
    visualMeta.tone === "success"
      ? "border-[rgb(108_137_106_/_0.65)] bg-[linear-gradient(180deg,rgba(236,244,232,0.98)_0%,rgba(255,253,247,0.98)_100%)] text-[var(--sage-deep)]"
      : visualMeta.tone === "error"
        ? "border-[rgb(150_88_77_/_0.6)] bg-[linear-gradient(180deg,rgba(249,236,232,0.98)_0%,rgba(255,253,247,0.98)_100%)] text-[var(--clay-deep)]"
        : "border-[rgb(179_164_132_/_0.72)] bg-[linear-gradient(180deg,rgba(252,246,231,0.98)_0%,rgba(255,253,247,0.98)_100%)] text-[var(--ink)]";

  const buttonClassName =
    visualMeta.tone === "success"
      ? "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)] hover:bg-[var(--paper-bright)]"
      : visualMeta.tone === "error"
        ? "border-[var(--clay-deep)] bg-[rgb(248_232_228_/_0.92)] text-[var(--clay-deep)] hover:bg-[var(--paper-bright)]"
        : "border-[var(--line-strong)] bg-[var(--paper-bright)] text-[var(--ink)] hover:bg-[var(--paper)]";

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border px-3.5 py-3 shadow-[4px_4px_0_var(--sand-soft)] ${toneClassName}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-30">
        <Image
          src="/images/ui/button/button-accent-soft.png"
          alt=""
          fill
          aria-hidden
          sizes="240px"
          className="object-cover object-top"
        />
      </div>

      <div className="relative z-[1] flex items-start gap-3">
        <div className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.72)]">
          <Image
            src={visualMeta.imageSrc}
            alt=""
            fill
            aria-hidden
            sizes="40px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <p className="workspace-kicker">SAVE STATUS</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
            {visualMeta.label}
          </p>
          <p
            aria-live="polite"
            className="mt-1 max-w-72 text-xs leading-5 text-[var(--ink-muted)]"
          >
            {copy.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveClick}
        disabled={isBusy}
        className={`relative z-[1] mt-3 inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${buttonClassName}`}
      >
        {copy.label}
      </button>
    </div>
  );
}
