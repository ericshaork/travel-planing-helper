"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

import { DesktopWorkspaceShell } from "./DesktopWorkspaceShell";
import { WorkspaceMain } from "./WorkspaceMain";
import {
  WorkspaceSidebar,
  type WorkspaceSidebarItemId,
} from "./WorkspaceSidebar";

const samplePrompts = [
  "从深圳去厦门玩 3 天，想看海和吃美食",
  "上海周末两日游，不想太赶",
  "成都 4 天，美食、博物馆、轻松路线",
];

const workflowSteps = [
  {
    title: "先有一版",
    description:
      "先把目的地、天数和偏好丢进来，快速拿到一版能继续推敲的路线。",
  },
  {
    title: "再慢慢改",
    description:
      "预算、日期、天数和偏好都可以在 /plan 里补全，后改的内容会覆盖初稿。",
  },
  {
    title: "最后进工作台",
    description:
      "生成之后再回到 /result 调整 Day、看路线提醒、导出方案。",
  },
];

const capabilityCards = [
  "路线顺一点",
  "天气先放旁边",
  "节奏别太赶",
  "通勤时间有数",
];

const inspirationCards = [
  {
    title: "海边放空路线",
    subtitle: "适合：厦门 / 青岛 / 三亚",
    tags: ["海边", "拍照", "慢节奏"],
    tone: "from-[rgba(223,232,216,0.75)] to-[rgba(255,253,247,0.98)]",
  },
  {
    title: "城市漫步路线",
    subtitle: "适合：上海 / 成都 / 杭州",
    tags: ["老街", "美食", "轻松"],
    tone: "from-[rgba(244,221,209,0.72)] to-[rgba(255,253,247,0.98)]",
  },
  {
    title: "低预算周末路线",
    subtitle: "适合：学生党 / 朋友结伴",
    tags: ["低预算", "小众", "两日"],
    tone: "from-[rgba(244,234,214,0.82)] to-[rgba(255,253,247,0.98)]",
  },
];

const prepTags = ["去哪里", "几天", "预算", "喜欢什么"];

export function WorkspaceLanding() {
  const router = useRouter();
  const [activeItem, setActiveItem] =
    useState<WorkspaceSidebarItemId>("new-trip");
  const [sidebarNotice, setSidebarNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);

  function handleCreateTrip() {
    setActiveItem("new-trip");
    setSidebarNotice(null);
    router.push("/create");
  }

  function handlePlaceholder(item: WorkspaceSidebarItemId) {
    setActiveItem(item);
    setSidebarNotice({
      title: "后续开放",
      message: "该功能将在后续版本开放。",
    });
  }

  function handleLandingWorkspaceAction(item: WorkspaceSidebarItemId) {
    setActiveItem(item);
    setSidebarNotice({
      title: "生成后可用",
      message:
        "先创建计划，生成结果后就可以在工作台里使用这个入口。",
    });
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-[1520px] flex-1 flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <section className="space-y-4 lg:hidden">
          <div className="workspace-panel px-5 py-5">
            <div className="relative z-[1]">
              <p className="workspace-kicker">WELCOME</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                开始规划一次旅行
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                先把旅行想法整理成一版顺手的路线。不用一上来就填满表单，而是先有个能继续改的版本。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/create"
                  className="inline-flex min-h-12 min-w-40 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)]"
                >
                  创建新计划
                </Link>
              </div>
            </div>
          </div>

          <section className="grid gap-3">
            {inspirationCards.map((card) => (
              <article
                key={card.title}
                className={`workspace-panel-soft bg-gradient-to-br ${card.tone} px-4 py-4`}
              >
                <p className="workspace-kicker">灵感卡</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  {card.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {card.subtitle}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <span key={tag} className="workspace-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </section>

        <DesktopWorkspaceShell
          sidebar={
            <WorkspaceSidebar
              activeItem={activeItem}
              noticeTitle={sidebarNotice?.title}
              noticeMessage={sidebarNotice?.message}
              onNewTrip={handleCreateTrip}
              onFocusRoute={() => handleLandingWorkspaceAction("route")}
              onFocusEdit={() => handleLandingWorkspaceAction("edit")}
              onFocusExport={() => handleLandingWorkspaceAction("export")}
              onPlaceholder={handlePlaceholder}
            />
          }
          topBar={
            <section className="workspace-panel px-6 py-6">
              <div className="relative z-[1] flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                  <p className="workspace-kicker">CREATOR HUB</p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)] xl:text-5xl">
                    把旅行想法变成
                    <span className="block text-[var(--clay)]">
                      一版可继续修改的行程
                    </span>
                  </h1>
                  <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-muted)]">
                    不用一开始就查到很晚。先把路线、天气和节奏摆到一边，看清一版，再决定哪些地方值得慢慢打磨。
                  </p>
                </div>

                <Link
                  href="/create"
                  className="inline-flex min-h-12 min-w-44 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-6 py-3 text-base font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5"
                >
                  创建新计划
                </Link>
              </div>
            </section>
          }
          main={
            <WorkspaceMain>
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <article className="workspace-panel px-6 py-6">
                  <div className="relative z-[1]">
                    <p className="workspace-kicker">START HERE</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                      先从一个简单想法开始
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)] sm:text-base sm:leading-7">
                      先说去哪里、玩几天、预算大概多少，后面再去补细节。不是写作文，也不用一次把所有决定都做完。
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {prepTags.map((tag) => (
                        <span key={tag} className="workspace-chip">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
                      先写一句话就可以。后面到 <code>/plan</code>{" "}
                      再慢慢补。
                    </p>
                  </div>
                </article>

                <article className="workspace-panel-soft bg-[linear-gradient(180deg,rgba(255,253,247,0.98)_0%,rgba(244,237,223,0.92)_100%)] px-5 py-5">
                  <p className="workspace-kicker">HOW IT WORKS</p>
                  <div className="mt-3 space-y-3">
                    {workflowSteps.map((step, index) => (
                      <div
                        key={step.title}
                        className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-4 py-3"
                      >
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                          0{index + 1}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                {samplePrompts.map((prompt, index) => (
                  <article
                    key={prompt}
                    className="workspace-panel-soft bg-[linear-gradient(180deg,rgba(255,253,247,0.98)_0%,rgba(243,238,223,0.98)_100%)] px-5 py-5"
                  >
                    <p className="workspace-kicker">示例 Prompt {index + 1}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink)]">
                      {prompt}
                    </p>
                  </article>
                ))}
              </section>
            </WorkspaceMain>
          }
          inspector={
            <div className="space-y-4 xl:space-y-5">
              <section className="workspace-panel px-5 py-5">
                <div className="relative z-[1]">
                  <p className="workspace-kicker">INSPIRATION BOARD</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    先挑一个你更想去的旅行气氛
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                    这里先放几张静态灵感卡，帮你更快进入状态。真正的地点、路线和 Day 工作区，会在生成计划后出现在
                    /result。
                  </p>

                  <div className="mt-5 grid gap-3">
                    {inspirationCards.slice(0, 2).map((card) => (
                      <article
                        key={card.title}
                        className={`workspace-panel-soft bg-gradient-to-br ${card.tone} px-4 py-4`}
                      >
                        <p className="workspace-kicker">TRAVEL MOOD</p>
                        <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--ink-muted)]">
                          {card.subtitle}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.tags.map((tag) => (
                            <span key={tag} className="workspace-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-[var(--ink-muted)]">
                    灵感卡会在 v1.7 以后再接内容库。当前先用静态卡帮欢迎页脱离空白占位感。
                  </p>
                </div>
              </section>

              <section className="workspace-panel px-5 py-5">
                <div className="relative z-[1]">
                  <p className="workspace-kicker">AFTER GENERATION</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    生成之后，你会先看到这些
                  </h2>
                  <div className="mt-4 grid gap-2">
                    {capabilityCards.map((item) => (
                      <div
                        key={item}
                        className="workspace-panel-soft px-3 py-3 text-sm text-[var(--ink-muted)]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          }
        />
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
