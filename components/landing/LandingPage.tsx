"use client";

import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

const examplePrompts = [
  "7 月从深圳去厦门玩 3 天，想吃海鲜，也想留时间拍照。",
  "想找个周末能慢慢走的城市，不想太赶，也别太商业化。",
  "先帮我看看最近适合去哪里，再决定要不要立刻做计划。",
];

const heroEntries = [
  {
    title: "探索灵感",
    href: "/explore",
    className:
      "border-[rgba(205,221,198,0.94)] bg-[rgba(233,242,228,0.88)] text-[var(--sage-deep)]",
  },
  {
    title: "创建计划",
    href: "/create",
    className:
      "border-[rgba(244,221,209,0.96)] bg-[rgba(247,228,216,0.9)] text-[var(--clay-deep)]",
  },
  {
    title: "我的旅程",
    href: "/workspace",
    className:
      "border-[rgba(225,220,234,0.96)] bg-[rgba(232,229,238,0.88)] text-[#5f5b70]",
  },
];

const deferredNotes = [
  "先帮你抓重点，不用一上来填长表单。",
  "能先逛灵感，也能直接开始做自己的版本。",
  "生成后还能继续改，不是一段文本丢给你就结束。",
];

export function LandingPage() {
  return (
    <div className="relative h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div className="absolute inset-0">
        <Image
          src="/images/landing/hero/hero-main.png"
          alt="旅行封面主视觉"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(21,24,20,0.08)_0%,rgba(21,24,20,0.06)_34%,rgba(21,24,20,0.18)_72%,rgba(21,24,20,0.3)_100%)]" />
      </div>

      <Header minimal />

      <main className="relative z-10 flex h-full flex-col">
        <section className="relative flex flex-1 items-end justify-center px-4 pb-14 pt-28 sm:px-8 sm:pb-16 sm:pt-32 lg:pb-18">
          <div className="flex w-full max-w-4xl flex-wrap items-center justify-center gap-3 sm:gap-4">
            {heroEntries.map((entry) => (
              <Link
                key={entry.title}
                href={entry.href}
                className={`inline-flex min-h-12 items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold tracking-[0.06em] shadow-[0_14px_32px_rgba(65,58,45,0.12)] backdrop-blur-[8px] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-bright)] sm:min-h-14 sm:px-7 sm:text-base ${entry.className}`}
              >
                {entry.title}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <section aria-hidden="true" className="hidden">
        <section className="workspace-panel-soft px-5 py-5 sm:px-6">
          <p className="workspace-kicker">你可以这样开头</p>
          <div className="mt-3 space-y-2.5">
            {examplePrompts.map((prompt) => (
              <p
                key={prompt}
                className="rounded-[18px] bg-[rgba(255,253,247,0.9)] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]"
              >
                {prompt}
              </p>
            ))}
          </div>
        </section>

        <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
          <div className="relative z-[1] grid gap-3">
            <div>
              <p className="workspace-kicker">WHY THIS HOME EXISTS</p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-[2rem]">
                第一次进来，也该知道下一步去哪。
              </h2>
            </div>

            {deferredNotes.map((note, index) => (
              <div
                key={note}
                className="rounded-[20px] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-4"
              >
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                  0{index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {note}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <div className="hidden">
        <Footer />
      </div>
    </div>
  );
}
