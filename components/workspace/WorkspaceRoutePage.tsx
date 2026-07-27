"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { UserMenu } from "@/components/auth/UserMenu";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { createBlankWorkspaceProjectEntry } from "@/lib/projects/entry-client";
import { getUserSettings } from "@/lib/settings/client";
import { restoreWorkspaceProjectVersionContext } from "@/lib/projects/workspace-context-client";
import {
  loadTripPlan,
  loadTripRequest,
} from "@/lib/trip/storage";
import type { TripPlan, TripRequest } from "@/lib/trip/types";
import type { WorkspaceMode } from "@/hooks/useTripWorkspaceState";

import { TripWorkspace } from "./TripWorkspace";

type WorkspaceRouteMode = "result" | "workspace";
type WorkspaceRouteState = "loading" | "missing" | "ready";

interface WorkspaceRoutePageProps {
  mode: WorkspaceRouteMode;
}

const chromeLinkClass =
  "inline-flex min-h-8 items-center rounded-full border border-[rgba(204,193,171,0.28)] bg-[rgba(255,251,243,0.38)] px-2.5 py-1 text-xs font-semibold text-[rgba(88,69,52,0.92)] transition-colors hover:bg-[rgba(255,251,243,0.58)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.4)]";

export function WorkspaceChromeHeader() {
  return (
    <header className="shrink-0 border-b border-[rgba(158,136,110,0.16)] bg-[rgba(250,245,234,0.82)] px-3 py-1.5 backdrop-blur-[4px] sm:px-4">
      <div className="mx-auto flex w-full max-w-[clamp(1280px,92vw,1760px)] items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="Wanderly 首页"
          className="inline-flex shrink-0 items-center rounded-[14px] border border-[rgba(193,181,158,0.18)] bg-[rgba(255,249,239,0.38)] px-2 py-1 shadow-[0_4px_10px_rgba(65,58,45,0.025)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        >
          <Image
            src="/images/brand/logo/logo-horizontal-transparent.svg"
            alt="Wanderly"
            width={146}
            height={82}
            priority
            className="h-auto w-[7.2rem]"
          />
        </Link>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <Link href="/explore" className={chromeLinkClass}>
            返回探索
          </Link>
          <span className="hidden rounded-full border border-[rgba(158,136,110,0.16)] bg-[rgba(255,253,247,0.62)] px-3 py-1 text-xs font-semibold text-[var(--ink-muted)] lg:inline-flex">
            工作台
          </span>
          <UserMenu minimal />
        </div>
      </div>
    </header>
  );
}

function MissingWorkspaceState() {
  const [isCreatingBlankTrip, setIsCreatingBlankTrip] = useState(false);
  const [blankTripError, setBlankTripError] = useState<string>();

  async function handleCreateBlankTrip() {
    setIsCreatingBlankTrip(true);
    setBlankTripError(undefined);

    try {
      await createBlankWorkspaceProjectEntry();
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
      <main className="mx-auto max-w-xl px-4 py-4 sm:py-5">
        <section className="edit-gear-card p-3">
          <p className="journey-kicker">工作台还没有计划</p>
          <h1 className="journey-title mt-1 text-xl">先选一个开始方式</h1>
          <p className="journey-subtitle mt-1.5 text-sm leading-6">
            Workspace 可以从 AI 生成、历史计划恢复，也可以直接从空白手帐开始。
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void handleCreateBlankTrip()}
              disabled={isCreatingBlankTrip}
              className="border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              {isCreatingBlankTrip ? "正在创建空白计划..." : "从空白计划开始"}
            </button>
            <Link
              href="/create"
              className="border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              AI 创建计划
            </Link>
            <Link
              href="/explore"
              className="border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              去探索灵感
            </Link>
          </div>

          {blankTripError ? (
            <p className="mt-2 rounded-[18px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-2.5 py-1.5 text-sm leading-5 text-[var(--dusty-rose)]">
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
  const [initialWorkspaceModeDefault, setInitialWorkspaceModeDefault] =
    useState<WorkspaceMode>("read");

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      void (async () => {
        const restoredProjectContext =
          await restoreWorkspaceProjectVersionContext().catch(() => null);
        const savedTripPlan =
          restoredProjectContext?.tripPlan ?? loadTripPlan();
        const savedTripRequest =
          restoredProjectContext?.tripRequest ?? loadTripRequest();

        setTripRequest(savedTripRequest);

        if (!savedTripPlan) {
          setPageState("missing");
          return;
        }

        try {
          const settings = await getUserSettings();
          setInitialWorkspaceModeDefault(
            settings.workspacePreferences.defaultMode,
          );
        } catch {
          setInitialWorkspaceModeDefault("read");
        }

        setTripPlan(savedTripPlan);
        setPageState("ready");
      })();
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [mode]);

  if (pageState === "loading") {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header minimal overlay={false} />
        <main className="mx-auto max-w-3xl px-4 py-6 text-center">
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
      <WorkspaceChromeHeader />
      <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-1 sm:px-4 sm:pb-4 lg:px-4">
        <TripWorkspace
          tripPlan={tripPlan}
          tripRequest={tripRequest}
          initialWorkspaceModeDefault={initialWorkspaceModeDefault}
        />
      </main>
    </div>
  );
}
