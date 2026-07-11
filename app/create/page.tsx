"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CreateModeSelector } from "@/components/trip/CreateModeSelector";
import { NaturalLanguageInput } from "@/components/trip/NaturalLanguageInput";
import type { CreateModeId } from "@/lib/trip/create-modes";
import {
  clearTripPlanDraft,
  clearTripRequestDraft,
  loadTripPlanDraft,
} from "@/lib/trip/storage";
import type { TripPlanDraft } from "@/lib/trip/types";

export default function CreatePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] =
    useState<CreateModeId>("ai-assisted");
  const [exploreDraft, setExploreDraft] = useState<TripPlanDraft | null>(() =>
    typeof window === "undefined" ? null : loadTripPlanDraft(),
  );

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-6 pt-3 sm:px-8 sm:pb-16 sm:pt-12">
        <nav
          aria-label="Create page links"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7"
        >
          <Link
            href="/"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            Back to home
          </Link>
        </nav>

        <section className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:gap-12">
          <div className="min-w-0 max-w-xl pt-0.5 lg:pt-8">
            <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
              Pick the way you want to begin
            </p>

            <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-6 sm:text-6xl">
              How do you want to start this trip?
              <span className="mt-1 block text-[var(--clay)]">
                We can keep the entry simple first.
              </span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
              The existing Create flow still feeds into `/plan`, then AI generation,
              then Workspace. This phase only adds Explore as another way to enter
              that same pipeline.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--ink-muted)]">
              If you came from Explore, we keep your inspiration or archive source
              info and let you continue from here without rebuilding the planner.
            </p>

            <div className="workspace-panel mt-8 hidden px-5 py-5 lg:block">
              <div className="relative z-[1] space-y-3 text-sm leading-7 text-[var(--ink-muted)]">
                <p className="workspace-kicker">THIS ROUND SUPPORTS</p>
                <p>
                  Existing parse, confirm, generate, and workspace logic stays the
                  same.
                </p>
                <p>
                  Explore now acts as a product entry, not a separate generation
                  stack.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {exploreDraft ? (
              <section className="workspace-panel px-5 py-5 sm:px-6">
                <div className="relative z-[1] space-y-4">
                  <div>
                    <p className="workspace-kicker">EXPLORE ENTRY</p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      Continue this Explore draft
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      Source: {exploreDraft.sourceType}
                      {exploreDraft.sourceExploreSlug
                        ? ` · ${exploreDraft.sourceExploreSlug}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      Destination:{" "}
                      {exploreDraft.tripRequestDraft.destinationCity ?? "To be decided"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push("/plan")}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)]"
                    >
                      Continue in Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearTripPlanDraft();
                        clearTripRequestDraft();
                        setExploreDraft(null);
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
                    >
                      Start over
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="workspace-panel px-5 py-5 sm:px-6">
              <div className="relative z-[1] space-y-4">
                <CreateModeSelector
                  selectedMode={selectedMode}
                  onSelect={setSelectedMode}
                />

                {selectedMode === "ai-assisted" ? (
                  <NaturalLanguageInput />
                ) : (
                  <section className="workspace-panel-soft px-5 py-5 sm:px-6">
                    <p className="workspace-kicker">MAP EXPLORATION</p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      Map exploration stays for a later phase
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-base sm:leading-7">
                      We are keeping this slot, but the current priority is to make
                      AI-assisted planning and Explore entry work end to end first.
                    </p>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <div className="workspace-panel-soft px-3 py-3 text-sm text-[var(--ink-muted)]">
                        Map exploration remains staged
                      </div>
                      <div className="workspace-panel-soft px-3 py-3 text-sm text-[var(--ink-muted)]">
                        Explore now joins the same Create pipeline
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMode("ai-assisted")}
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                    >
                      Use AI-assisted planning
                    </button>
                  </section>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
