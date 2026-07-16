"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import {
  createBlankWorkspaceDraft,
  loadTripPlan,
  loadTripRequest,
} from "@/lib/trip/storage";
import type { TripPlan, TripRequest } from "@/lib/trip/types";

import { TripWorkspace } from "./TripWorkspace";

type WorkspaceRouteMode = "result" | "workspace";
type WorkspaceRouteState = "loading" | "missing" | "ready";

interface WorkspaceRoutePageProps {
  mode: WorkspaceRouteMode;
}

function MissingWorkspaceState() {
  const [isCreatingBlankTrip, setIsCreatingBlankTrip] = useState(false);
  const [blankTripError, setBlankTripError] = useState<string>();

  function handleCreateBlankTrip() {
    setIsCreatingBlankTrip(true);
    setBlankTripError(undefined);

    try {
      createBlankWorkspaceDraft();
      window.location.assign("/workspace");
    } catch (error) {
      setBlankTripError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "空白计划暂时没创建成功，请稍后再试。",
      );
      setIsCreatingBlankTrip(false);
    }
  }

  return (
    <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
      <Header minimal overlay={false} />
      <main className="mx-auto max-w-xl px-5 py-10 sm:py-16">
        <section className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-7 shadow-[8px_9px_0_var(--sand)]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
            工作台还没有计划
          </p>
          <h1 className="mt-3 text-3xl font-semibold">先选一个开始方式</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
            Workspace 可以从 AI 生成、历史计划恢复，也可以直接从空白手帐开始。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateBlankTrip}
              disabled={isCreatingBlankTrip}
              className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              {isCreatingBlankTrip ? "正在创建空白计划..." : "从空白计划开始"}
            </button>
            <Link
              href="/create"
              className="border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              AI 创建计划
            </Link>
            <Link
              href="/explore"
              className="border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              去探索灵感
            </Link>
          </div>

          {blankTripError ? (
            <p className="mt-4 rounded-[18px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2.5 text-sm leading-6 text-[var(--dusty-rose)]">
              {blankTripError}
            </p>
          ) : null}
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
  }, [mode]);

  if (pageState === "loading") {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header minimal overlay={false} />
        <main className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="text-sm font-semibold text-[var(--ink-muted)]">
            正在打开你的 Workspace...
          </p>
        </main>
      </div>
    );
  }

  if (pageState === "missing" || !tripPlan) {
    return <MissingWorkspaceState />;
  }

  return (
    <div className="paper-texture flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden text-[var(--ink)]">
      <Header minimal overlay={false} />
      <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-0.5 sm:px-4 sm:pb-4 sm:pt-1 lg:px-4">
        <TripWorkspace tripPlan={tripPlan} tripRequest={tripRequest} />
      </main>
    </div>
  );
}
