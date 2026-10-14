"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CreateEntryPageDecor } from "@/components/create/CreateEntryDecor";
import { CreateEntryHeader } from "@/components/create/CreateEntryHeader";
import { CreateEntryHub } from "@/components/create/CreateEntryHub";
import { FileImportPanel } from "@/components/create/FileImportPanel";
import { CreateFlowRouter } from "@/components/create/CreateFlowRouter";
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

function CreatePageInner() {
  const searchParams = useSearchParams();
  const rawSource = searchParams.get("source");
  const source: CreateSource = isCreateSource(rawSource) ? rawSource : null;

  if (source === "ai" || source === "explore_archive" || source === "revision") {
    const entry = resolveCreateEntry(searchParams);

    return (
      <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto flex w-full flex-1 flex-col px-4 pb-4 pt-0 sm:px-6 sm:pb-5 sm:pt-1 lg:max-w-[1480px]">
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
        <main className="mx-auto flex w-full flex-1 flex-col px-4 pb-4 pt-0 sm:px-6 sm:pb-5 sm:pt-1 lg:max-w-[1120px]">
          <FileImportPanel />
        </main>
      </div>
    );
  }

  return (
    <div className="paper-texture relative flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <CreateEntryHeader />
      <CreateEntryPageDecor />

      <main className="relative z-[1] mx-auto flex w-full flex-1 flex-col px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6 lg:max-w-[1240px] lg:px-8">
        <CreateEntryHub />
      </main>
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
