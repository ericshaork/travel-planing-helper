"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { loadTripPlan, loadTripRequest } from "@/lib/trip/storage";
import type { TripPlan, TripRequest } from "@/lib/trip/types";

import { TripWorkspace } from "./TripWorkspace";

type WorkspaceRouteMode = "result" | "workspace";
type WorkspaceRouteState = "loading" | "missing" | "ready";

interface WorkspaceRoutePageProps {
  mode: WorkspaceRouteMode;
}

function MissingWorkspaceState({ mode }: { mode: WorkspaceRouteMode }) {
  const isWorkspaceMode = mode === "workspace";

  return (
    <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
      <Header minimal overlay={false} />
      <main className="mx-auto max-w-xl px-5 py-10 sm:py-16">
        <section className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-7 shadow-[8px_9px_0_var(--sand)]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
            {isWorkspaceMode ? "WORKSPACE EMPTY" : "RESULT MISSING"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            {isWorkspaceMode
              ? "This workspace is still empty"
              : "There is no generated trip here yet"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
            {isWorkspaceMode
              ? "Start from Explore for inspiration, or create your first trip directly. Once AI generation finishes, this workspace becomes your main editing space."
              : "Go back to Plan to finish the request, or start over if you want a completely different trip."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={isWorkspaceMode ? "/create" : "/plan"}
              className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              {isWorkspaceMode ? "Create your first trip" : "Back to plan"}
            </Link>
            <Link
              href={isWorkspaceMode ? "/explore" : "/create"}
              className="border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              {isWorkspaceMode ? "Browse Explore" : "Start over"}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function WorkspaceRoutePage({ mode }: WorkspaceRoutePageProps) {
  const [pageState, setPageState] = useState<WorkspaceRouteState>("loading");
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [tripRequest, setTripRequest] = useState<TripRequest | null>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedTripPlan = loadTripPlan();
      const savedTripRequest = loadTripRequest();

      setTripRequest(savedTripRequest);

      if (!savedTripPlan) {
        setPageState("missing");
        return;
      }

      setTripPlan(savedTripPlan);
      setPageState("ready");
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  if (pageState === "loading") {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header minimal overlay={false} />
        <main className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="text-sm font-semibold text-[var(--ink-muted)]">
            Opening your trip workspace...
          </p>
        </main>
      </div>
    );
  }

  if (pageState === "missing" || !tripPlan) {
    return <MissingWorkspaceState mode={mode} />;
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header minimal overlay={false} />
      <main className="mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-4 pb-4 pt-2 sm:px-8 sm:pb-20 sm:pt-4">
        <TripWorkspace tripPlan={tripPlan} tripRequest={tripRequest} />
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
