"use client";

import Link from "next/link";
import { useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CreateModeSelector } from "@/components/trip/CreateModeSelector";
import { NaturalLanguageInput } from "@/components/trip/NaturalLanguageInput";
import type { CreateModeId } from "@/lib/trip/create-modes";

export default function CreatePage() {
  const [selectedMode, setSelectedMode] =
    useState<CreateModeId>("ai-assisted");

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-6 pt-3 sm:px-8 sm:pb-16 sm:pt-12">
        <nav
          aria-label="创建页返回入口"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7"
        >
          <Link
            href="/"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回到工作台
          </Link>
        </nav>

        <section className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:gap-12">
          <div className="min-w-0 max-w-xl pt-0.5 lg:pt-8">
            <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
              先决定怎么开始
            </p>

            <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-6 sm:text-6xl">
              这次想怎么做？
              <span className="mt-1 block text-[var(--clay)]">我先给你入口。</span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
              你可以先拿到一版路线，也可以等地图探索上线后再自己慢慢挑地点。现在先把最顺手的入口放在前面。
            </p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--ink-muted)]">
              不管这里怎么开始，下一页 `/plan` 才是最终确认页。预算、日期、天数和偏好都会以后面确认过的版本为准。
            </p>

            <div className="workspace-panel mt-8 hidden px-5 py-5 lg:block">
              <div className="relative z-[1] space-y-3 text-sm leading-7 text-[var(--ink-muted)]">
                <p className="workspace-kicker">THIS ROUND SUPPORTS</p>
                <p>
                  现在就能先排一版，走的还是现有的 parse-trip 到 /plan 再到 /result 的流程。
                </p>
                <p>
                  地图慢慢挑先保留成 v1.5 占位，不会把你提前带进还没准备好的功能里。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
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
                      地图探索会在 v1.5 开放
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-base sm:leading-7">
                      这个入口后面会承接“自己挑地点，再加入行程”的玩法。现在先把位置留下，避免把地图、地点探索和保存逻辑提前做重。
                    </p>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <div className="workspace-panel-soft px-3 py-3 text-sm text-[var(--ink-muted)]">
                        地图探索放到 v1.5
                      </div>
                      <div className="workspace-panel-soft px-3 py-3 text-sm text-[var(--ink-muted)]">
                        登录和保存放到 v1.6
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMode("ai-assisted")}
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                    >
                      先排一版给我看看
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
