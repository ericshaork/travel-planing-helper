"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuthStatus } from "../../components/auth/useAuthStatus";
import { Footer } from "../../components/layout/Footer";
import { Header } from "../../components/layout/Header";
import { SavedTripsList } from "../../components/trips/SavedTripsList";
import { deleteSavedTrip } from "../../lib/trips/delete-flow";
import { listSavedTrips } from "../../lib/trips/list-client";
import {
  markSavedTripOpened,
  patchSavedTripMetadata,
} from "../../lib/trips/metadata-client";
import type { TripSourceType, TripStatus } from "../../lib/trips/metadata";
import { openSavedTripIntoWorkspace } from "../../lib/trips/open-flow";
import { buildSaveTripLoginHref } from "../../lib/trips/save-client";
import type { SavedTripListItem } from "../../lib/trips/types";

type TripsPageState = "idle" | "loading" | "ready" | "error";

function LoginPrompt() {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] max-w-2xl">
        <p className="workspace-kicker">需要登录</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">
          登录后查看“我的行程”
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
          这里会集中放你保存过的旅行计划。未登录也可以继续从创建页生成，或先去 Workspace 手动整理。
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
        <p className="workspace-kicker">正在加载</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
          正在翻出你保存过的行程
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          先拉轻量列表，打开某一条时再恢复完整计划。
        </p>
      </div>
    </section>
  );
}

function TripsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] max-w-2xl">
        <p className="workspace-kicker">列表暂不可用</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
          暂时没拉到你的行程列表
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
        >
          重试
        </button>
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
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<
    TripSourceType | "all"
  >("all");
  const [openingTripId, setOpeningTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [renamingTripId, setRenamingTripId] = useState<string | null>(null);
  const [confirmingDeleteTripId, setConfirmingDeleteTripId] = useState<
    string | null
  >(null);
  const [openErrorByTripId, setOpenErrorByTripId] = useState<
    Record<string, string | undefined>
  >({});
  const [deleteErrorByTripId, setDeleteErrorByTripId] = useState<
    Record<string, string | undefined>
  >({});
  const [renameErrorByTripId, setRenameErrorByTripId] = useState<
    Record<string, string | undefined>
  >({});

  const loadTrips = useCallback(async () => {
    setPageState("loading");
    setErrorMessage("");

    try {
      const nextTrips = await listSavedTrips({
        search: appliedSearch,
        status: statusFilter,
        sourceType: sourceTypeFilter,
      });

      setTrips(nextTrips);
      setPageState("ready");
    } catch (error) {
      setTrips([]);
      setPageState("error");
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "请稍后再试。",
      );
    }
  }, [appliedSearch, sourceTypeFilter, statusFilter]);

  useEffect(() => {
    if (authState.status !== "authenticated") {
      return;
    }

    void loadTrips();
  }, [authState.status, loadTrips]);

  async function handleOpenTrip(trip: SavedTripListItem) {
    setOpeningTripId(trip.id);
    setOpenErrorByTripId((current) => ({
      ...current,
      [trip.id]: undefined,
    }));

    try {
      await openSavedTripIntoWorkspace(trip.id, {
        markTripOpened: markSavedTripOpened,
        navigate: (href) => router.push(href),
      });

      const openedAt = new Date().toISOString();
      setTrips((current) =>
        current.map((item) =>
          item.id === trip.id ? { ...item, last_opened_at: openedAt } : item,
        ),
      );
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
    if (confirmingDeleteTripId !== trip.id) {
      setConfirmingDeleteTripId(trip.id);
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
      setConfirmingDeleteTripId(null);
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

  async function handleRenameTrip(trip: SavedTripListItem, nextTitle: string) {
    setRenamingTripId(trip.id);
    setRenameErrorByTripId((current) => ({
      ...current,
      [trip.id]: undefined,
    }));

    try {
      const updatedTrip = await patchSavedTripMetadata(trip.id, {
        title: nextTitle,
      });
      setTrips((current) =>
        current.map((item) => (item.id === trip.id ? updatedTrip : item)),
      );
    } catch (error) {
      setRenameErrorByTripId((current) => ({
        ...current,
        [trip.id]:
          error instanceof Error && error.message.trim()
            ? error.message
            : "暂时还改不了这个标题，请稍后再试。",
      }));
      throw error;
    } finally {
      setRenamingTripId((current) => (current === trip.id ? null : current));
    }
  }

  function resetFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setStatusFilter("all");
    setSourceTypeFilter("all");
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
            创建新计划
          </Link>
        </nav>

        <section className="mb-6 max-w-3xl sm:mb-8">
          <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
            Workspace 入口收口
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-6 sm:text-6xl">
            把已保存计划重新打开，继续在 Workspace 里往下做
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
            这里可以搜标题、筛状态、改名字，也能看到最近一次打开时间。真正打开时，还是沿用原来的恢复流程进入
            /workspace。
          </p>
        </section>

        {authState.status === "loading" ? <TripsLoadingState /> : null}
        {authState.status === "anonymous" ? <LoginPrompt /> : null}
        {authState.status === "authenticated" && pageState === "loading" ? (
          <TripsLoadingState />
        ) : null}
        {authState.status === "authenticated" && pageState === "error" ? (
          <TripsErrorState message={errorMessage} onRetry={() => void loadTrips()} />
        ) : null}
        {authState.status === "authenticated" && pageState === "ready" ? (
          <SavedTripsList
            trips={trips}
            searchValue={searchInput}
            statusFilter={statusFilter}
            sourceTypeFilter={sourceTypeFilter}
            openingTripId={openingTripId}
            deletingTripId={deletingTripId}
            renamingTripId={renamingTripId}
            confirmingDeleteTripId={confirmingDeleteTripId}
            openErrorByTripId={openErrorByTripId}
            deleteErrorByTripId={deleteErrorByTripId}
            renameErrorByTripId={renameErrorByTripId}
            onSearchValueChange={setSearchInput}
            onSearchSubmit={() => setAppliedSearch(searchInput.trim())}
            onResetFilters={resetFilters}
            onStatusFilterChange={setStatusFilter}
            onSourceTypeFilterChange={setSourceTypeFilter}
            onOpenTrip={handleOpenTrip}
            onDeleteTrip={handleDeleteTrip}
            onRenameTrip={handleRenameTrip}
            onCancelDeleteTrip={(trip) => {
              setConfirmingDeleteTripId((current) =>
                current === trip.id ? null : current,
              );
            }}
          />
        ) : null}
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
