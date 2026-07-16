"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NaturalLanguageInput } from "@/components/trip/NaturalLanguageInput";
import {
  clearTripPlanDraft,
  clearTripRequestDraft,
  createBlankWorkspaceDraft,
  loadTripPlanDraft,
} from "@/lib/trip/storage";
import type { TripPlanDraft } from "@/lib/trip/types";

type CreateView = "ai" | "blank";

export default function CreatePage() {
  const router = useRouter();
  const [view, setView] = useState<CreateView>("ai");
  const [exploreDraft, setExploreDraft] = useState<TripPlanDraft | null>(() =>
    typeof window === "undefined" ? null : loadTripPlanDraft(),
  );
  const [isCreatingBlankTrip, setIsCreatingBlankTrip] = useState(false);
  const [blankTripError, setBlankTripError] = useState<string>();

  function handleStartBlankTrip() {
    setIsCreatingBlankTrip(true);
    setBlankTripError(undefined);

    try {
      createBlankWorkspaceDraft();
      router.push("/workspace");
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
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-8 sm:pb-14 sm:pt-8">
        <nav className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7">
          <Link
            href="/"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
          >
            回到首页
          </Link>
          <Link
            href="/explore"
            className="border-b border-transparent pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
          >
            去看灵感
          </Link>
        </nav>

        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          <div className="min-w-0 pt-1 lg:pt-6">
            <p className="inline-flex rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
              开始这趟旅行
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl">
              先选一个入口，
              <span className="mt-1 block text-[var(--clay)]">再把计划慢慢搭起来。</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--ink-muted)] sm:text-base">
              你可以让 AI 先排一版，也可以直接从空白计划开始，在 Workspace 里自己搭。
            </p>

            <div className="mt-7 grid gap-3">
              <button
                type="button"
                onClick={() => setView("ai")}
                className={`rounded-[22px] border px-5 py-4 text-left transition-colors ${
                  view === "ai"
                    ? "border-[var(--ink)] bg-[var(--paper-bright)] shadow-[4px_4px_0_var(--sand-soft)]"
                    : "border-[var(--line)] bg-[rgba(255,253,247,0.72)]"
                }`}
              >
                <p className="text-lg font-semibold">AI 帮我先排一版</p>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  写一句想去哪、玩几天、想怎么玩，生成后直接进入 Workspace。
                </p>
              </button>

              <button
                type="button"
                onClick={() => setView("blank")}
                className={`rounded-[22px] border px-5 py-4 text-left transition-colors ${
                  view === "blank"
                    ? "border-[var(--ink)] bg-[var(--paper-bright)] shadow-[4px_4px_0_var(--sand-soft)]"
                    : "border-[var(--line)] bg-[rgba(255,253,247,0.72)]"
                }`}
              >
                <p className="text-lg font-semibold">从空白计划开始</p>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  直接进入 Workspace 编辑模式，从 Day 1 开始添加地点。
                </p>
              </button>
            </div>

            {exploreDraft ? (
              <section className="workspace-panel mt-6 px-5 py-5">
                <div className="relative z-[1] space-y-3">
                  <p className="workspace-kicker">已有草稿</p>
                  <h2 className="text-xl font-semibold">继续刚才那份灵感草稿</h2>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    目的地：{exploreDraft.tripRequestDraft.destinationCity ?? "待定"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/plan")}
                      className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)]"
                    >
                      继续补需求
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearTripPlanDraft();
                        clearTripRequestDraft();
                        setExploreDraft(null);
                      }}
                      className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
                    >
                      清掉这份草稿
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <div className="min-w-0">
            {view === "ai" ? (
              <section className="workspace-panel px-5 py-5 sm:px-6">
                <div className="relative z-[1] space-y-4">
                  <div>
                    <p className="workspace-kicker">AI 入口</p>
                    <h2 className="mt-2 text-2xl font-semibold">先生成一版行程</h2>
                  </div>
                  <NaturalLanguageInput />
                </div>
              </section>
            ) : (
              <section className="workspace-panel px-5 py-5 sm:px-6">
                <div className="relative z-[1] space-y-4">
                  <div>
                    <p className="workspace-kicker">空白入口</p>
                    <h2 className="mt-2 text-2xl font-semibold">直接打开空白工作台</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      会先创建一份 Day 1 空白草稿，然后进入 Workspace 的编辑模式。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="journal-chip">默认 1 天</span>
                    <span className="journal-chip">直接进编辑模式</span>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleStartBlankTrip}
                      disabled={isCreatingBlankTrip}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCreatingBlankTrip ? "正在创建空白计划..." : "从空白计划开始"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("ai")}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
                    >
                      还是先用 AI
                    </button>
                  </div>

                  {blankTripError ? (
                    <p className="rounded-[18px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2.5 text-sm leading-6 text-[var(--dusty-rose)]">
                      {blankTripError}
                    </p>
                  ) : null}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
