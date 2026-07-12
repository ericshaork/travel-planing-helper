"use client";

import Image from "next/image";
import Link from "next/link";

import { Header } from "@/components/layout/Header";

const primaryActions = [
  {
    title: "探索灵感",
    href: "/explore",
    className:
      "border-[rgba(83,107,82,0.88)] bg-[var(--sage-deep)] text-[var(--paper-bright)] shadow-[0_18px_34px_rgba(52,76,54,0.24)] hover:bg-[rgb(72_94_71)]",
  },
  {
    title: "创建计划",
    href: "/create",
    className:
      "border-[rgba(142,139,127,0.72)] bg-[rgba(255,253,247,0.9)] text-[var(--ink)] shadow-[0_14px_28px_rgba(65,58,45,0.1)] hover:bg-[var(--paper-bright)]",
  },
];

const inspirationExamples = [
  "周末想找个能慢下来、吃得舒服的海边城市",
  "还没定城市，先给我一些适合两三天放松的灵感",
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div className="absolute inset-0">
        <Image
          src="/images/landing/hero/hero-main-china-v18.png"
          alt="中国旅行档案风格的 Landing 主视觉"
          fill
          priority
          className="object-cover object-[72%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,238,223,0.995)_0%,rgba(243,238,223,0.96)_16%,rgba(243,238,223,0.84)_31%,rgba(243,238,223,0.42)_47%,rgba(243,238,223,0.12)_62%,rgba(243,238,223,0.02)_78%,rgba(243,238,223,0)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,247,0.05)_0%,rgba(255,253,247,0)_42%,rgba(37,40,35,0.06)_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[58%] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_46%)]" />
      </div>

      <Header minimal />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] flex-col px-4 pb-10 pt-24 sm:px-8 sm:pb-12 sm:pt-28 xl:px-12">
        <section className="grid flex-1 items-start pt-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:pt-10">
          <div className="max-w-[32rem] pb-6 lg:pb-0">
            <h1
              className="text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[rgb(47_60_50)] sm:text-[3rem] xl:text-[3.74rem]"
              style={{ fontFamily: "var(--font-serif-display)", fontWeight: 600 }}
            >
              <span className="block">打开你的</span>
              <span className="mt-1 block">中国旅行档案</span>
            </h1>

            <p className="mt-5 max-w-[31rem] text-base leading-8 text-[rgba(62,66,58,0.88)] sm:text-lg sm:leading-9">
              从一页灵感开始，让 AI 帮你生成可继续编辑的自由行计划。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              {primaryActions.map((entry) => (
                <Link
                  key={entry.title}
                  href={entry.href}
                  className={`inline-flex min-h-12 items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold tracking-[0.04em] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-bright)] sm:min-h-14 sm:px-7 sm:text-base ${entry.className}`}
                >
                  {entry.title}
                </Link>
              ))}
            </div>

            <section className="mt-7 max-w-[29rem]" aria-label="灵感示例">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(88,69,52,0.72)]">
                灵感示例
              </p>

              <div className="mt-3 space-y-2.5">
                {inspirationExamples.map((example) => (
                  <div
                    key={example}
                    className="flex items-start gap-3 rounded-[18px] border border-[rgba(205,193,171,0.24)] bg-[rgba(255,251,243,0.22)] px-4 py-3 text-[13px] leading-6 text-[rgba(98,102,94,0.9)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(156,140,112,0.52)]"
                    />
                    <span>{example}</span>
                  </div>
                ))}
              </div>
            </section>

            <p className="mt-6 max-w-[28rem] text-sm leading-6 text-[rgba(98,102,94,0.9)]">
              先逛灵感，再生成属于你的行程。
            </p>
          </div>

          <div aria-hidden="true" className="hidden lg:block" />
        </section>
      </main>
    </div>
  );
}
