"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SavedTripsList } from "@/components/trips/SavedTripsList";
import { deleteSavedTrip } from "@/lib/trips/delete-flow";
import { listSavedTrips } from "@/lib/trips/list-client";
import { openSavedTripIntoWorkspace } from "@/lib/trips/open-flow";
import { buildSaveTripLoginHref } from "@/lib/trips/save-client";
import type { SavedTripListItem } from "@/lib/trips/types";

type TripsPageState = "idle" | "loading" | "ready" | "error";

function LoginPrompt() {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] max-w-2xl">
        <p className="workspace-kicker">LOGIN REQUIRED</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">
          请先登录后，再来看“我的行程”。
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
          生成流程还是照常能用。这里只负责把你已经保存过的版本集中列出来，不会拦住
          <code> /create -&gt; /plan -&gt; /result </code>
          这条主链路。
        </p>
        <Link
          href={buildSaveTripLoginHref("/trips")}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        >
          去登录
        </Link>
      </div>
    </section>
  );
}

function TripsLoadingState() {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1]">
        <p className="workspace-kicker">LOADING TRIPS</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
          正在把你保存过的行程翻出来。
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          这里先拉轻量列表，不会把完整行程 JSON 一口气全搬下来。
        </p>
      </div>
    </section>
  );
}

function TripsErrorState({ message }: { message: string }) {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] max-w-2xl">
        <p className="workspace-kicker">LIST UNAVAILABLE</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
          暂时没拉到你的行程列表。
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          {message}
        </p>
      </div>
    </section>
  );
}

export default function TripsPage() {
  const authState = useAuthStatus();
  const router = useRouter();
  const [pageState, setPageState] = useState<TripsPageState>("idle");
  const [trips, setTrips] = useState<SavedTripListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [openingTripId, setOpeningTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [openErrorByTripId, setOpenErrorByTripId] = useState<
    Record<string, string | undefined>
  >({});
  const [deleteErrorByTripId, setDeleteErrorByTripId] = useState<
    Record<string, string | undefined>
  >({});

  useEffect(() => {
    if (authState.status !== "authenticated") {
      return;
    }

    let active = true;

    async function loadTrips() {
      setPageState("loading");
      setErrorMessage("");

      try {
        const nextTrips = await listSavedTrips();

        if (!active) {
          return;
        }

        setTrips(nextTrips);
        setPageState("ready");
      } catch (error) {
        if (!active) {
          return;
        }

        setTrips([]);
        setPageState("error");
        setErrorMessage(
          error instanceof Error && error.message.trim()
            ? error.message
            : "请稍后再试。",
        );
      }
    }

    void loadTrips();

    return () => {
      active = false;
    };
  }, [authState.status]);

  async function handleOpenTrip(trip: SavedTripListItem) {
    setOpeningTripId(trip.id);
    setOpenErrorByTripId((current) => ({
      ...current,
      [trip.id]: undefined,
    }));

    try {
      await openSavedTripIntoWorkspace(trip.id, {
        navigate: (href) => router.push(href),
      });
    } catch (error) {
      setOpenErrorByTripId((current) => ({
        ...current,
        [trip.id]:
          error instanceof Error && error.message.trim()
            ? error.message
            : "暂时打不开这条历史行程，请稍后再试。",
      }));
    } finally {
      setOpeningTripId((current) => (current === trip.id ? null : current));
    }
  }

  async function handleDeleteTrip(trip: SavedTripListItem) {
    const shouldDelete = window.confirm(
      `确定删除“${trip.title}”吗？删除后这条已保存计划会从我的行程里移除。`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingTripId(trip.id);
    setDeleteErrorByTripId((current) => ({
      ...current,
      [trip.id]: undefined,
    }));

    try {
      await deleteSavedTrip(trip.id);
      setTrips((current) => current.filter((item) => item.id !== trip.id));
    } catch (error) {
      setDeleteErrorByTripId((current) => ({
        ...current,
        [trip.id]:
          error instanceof Error && error.message.trim()
            ? error.message
            : "暂时删不掉这条已保存计划，请稍后再试。",
      }));
    } finally {
      setDeletingTripId((current) => (current === trip.id ? null : current));
    }
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-10">
        <nav
          aria-label="我的行程返回入口"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7"
        >
          <Link
            href="/"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回到首页
          </Link>
          <Link
            href="/create"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            去创建新计划
          </Link>
        </nav>

        <section className="mb-6 max-w-3xl sm:mb-8">
          <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
            phase 7 更新与删除收口
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-6 sm:text-6xl">
            把已保存计划管起来，但先不把工作台重做一遍。
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
            这轮会继续沿用现有工作台：历史计划可以打开回 `/result`，也可以在这里直接删除。
            保存和更新逻辑则交给顶部保存按钮按 `savedTripId` 自动判断。
          </p>
        </section>

        {authState.status === "loading" ? <TripsLoadingState /> : null}
        {authState.status === "anonymous" ? <LoginPrompt /> : null}
        {authState.status === "authenticated" && pageState === "loading" ? (
          <TripsLoadingState />
        ) : null}
        {authState.status === "authenticated" && pageState === "error" ? (
          <TripsErrorState message={errorMessage} />
        ) : null}
        {authState.status === "authenticated" && pageState === "ready" ? (
          <SavedTripsList
            trips={trips}
            openingTripId={openingTripId}
            deletingTripId={deletingTripId}
            openErrorByTripId={openErrorByTripId}
            deleteErrorByTripId={deleteErrorByTripId}
            onOpenTrip={handleOpenTrip}
            onDeleteTrip={handleDeleteTrip}
          />
        ) : null}
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
