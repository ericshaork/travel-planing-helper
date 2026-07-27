"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { FileImportPanel } from "@/components/create/FileImportPanel";
import { CreateFlowRouter } from "@/components/create/CreateFlowRouter";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { resolveCreateEntry } from "@/lib/projects/create-entry";

type CreateSource = "ai" | "explore_archive" | "revision" | "file" | null;

function isCreateSource(value: string | null): value is Exclude<CreateSource, null> {
  return (
    value === "ai" ||
    value === "explore_archive" ||
    value === "revision" ||
    value === "file"
  );
}

interface EntryCardProps {
  href: string;
  kicker: string;
  title: string;
  description: string;
  helper: string;
}

function EntryCard({
  href,
  kicker,
  title,
  description,
  helper,
}: EntryCardProps) {
  return (
    <Link
      href={href}
      className="journey-entry-card group flex h-full flex-col justify-between gap-3 px-4 py-4 text-left transition"
    >
      <div className="space-y-1.5">
        <p className="journey-kicker">{kicker}</p>
        <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {helper}
      </p>
    </Link>
  );
}

function CreateEntryHub() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="journey-kicker">开始一次旅行</p>
        <h1 className="journey-title text-3xl leading-[1.04] tracking-[-0.05em] sm:text-4xl">
          选一种方式，把旅行想法带进来
          <span className="mt-1 block text-[var(--clay)]">
            让 AI 陪你聊清楚，或者先把已有清单丢进来。
          </span>
        </h1>
        <p className="max-w-2xl journey-subtitle text-[15px] leading-6">
          现在有两个入口：一种是直接和 AI 对话，把需求慢慢讲清楚；另一种是导入你已经整理过的旅行模板，让 Wanderly 接着往下做。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <EntryCard
          href="/create?source=ai"
          kicker="AI 旅行顾问"
          title="AI 创建"
          description="先说一句你想怎么玩，Wanderly 会通过对话帮你把旅行需求慢慢整理成方案。"
          helper="进入对话式创建"
        />
        <EntryCard
          href="/create?source=file"
          kicker="导入文件"
          title="结构化导入"
          description="上传符合 Wanderly 模板的 md / txt 文件，先整理字段，再生成第一版计划。"
          helper="导入模板文件"
        />
      </div>
    </section>
  );
}

function CreatePageInner() {
  const searchParams = useSearchParams();
  const rawSource = searchParams.get("source");
  const source: CreateSource = isCreateSource(rawSource) ? rawSource : null;

  if (source === "ai" || source === "explore_archive" || source === "revision") {
    const entry = resolveCreateEntry(searchParams);

    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto flex w-full flex-1 flex-col px-4 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-3 lg:max-w-7xl">
          <nav className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
            <Link
              href="/create"
              className="border-b border-transparent pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
            >
              ← 返回入口选择
            </Link>
          </nav>
          <CreateFlowRouter
            entrySource={entry.entrySource}
            archiveSlug={entry.archiveSlug}
            projectId={entry.projectId}
            versionId={entry.versionId}
            mode={entry.mode}
            continueSession={entry.continueSession}
          />
        </main>
      </div>
    );
  }

  if (source === "file") {
    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto flex w-full flex-1 flex-col px-4 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-3 lg:max-w-4xl">
          <FileImportPanel />
        </main>
      </div>
    );
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full flex-1 flex-col px-4 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-3 lg:max-w-5xl">
        <nav className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
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
            探索灵感
          </Link>
        </nav>

        <CreateEntryHub />
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}

function CreatePageFallback() {
  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />
      <main className="mx-auto flex w-full flex-1 flex-col px-4 py-4">
        <p className="py-8 text-center text-sm font-semibold text-[var(--ink-muted)]">
          正在准备创建工作台...
        </p>
      </main>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<CreatePageFallback />}>
      <CreatePageInner />
    </Suspense>
  );
}
