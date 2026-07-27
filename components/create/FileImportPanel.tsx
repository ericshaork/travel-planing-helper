"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import { ProjectEntryChoiceDialog } from "@/components/projects/ProjectEntryChoiceDialog";
import {
  importStructuredTravelFile,
  type FileImportResult,
} from "@/lib/projects/file-import-client";

export function FileImportPanel() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [createdEntry, setCreatedEntry] = useState<FileImportResult | null>(null);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);

  const supportedHint = useMemo(
    () =>
      [
        "请上传符合 Wanderly 旅行字段模板的 .md 或 .txt 文件。",
        "至少需要包含：destination、days、budget、travelCompanion、interests、schedule/preferences、avoidPlaces、specialRequirements。",
      ].join(" "),
    [],
  );

  function handleBack() {
    if (isSubmitting) {
      return;
    }

    router.push("/create");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setErrorMessage(undefined);
  }

  async function handleImport() {
    if (!selectedFile || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      const result = await importStructuredTravelFile({
        file: selectedFile,
      });
      setCreatedEntry(result);
      setIsChoiceOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "导入文件暂时没有成功，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChooseWorkspace() {
    if (!createdEntry) {
      return;
    }

    setIsChoiceOpen(false);
    router.push("/workspace");
  }

  function handleChooseRevision() {
    if (!createdEntry) {
      return;
    }

    setIsChoiceOpen(false);
    router.push(createdEntry.revisionHref);
  }

  function handleCloseDialog() {
    if (isSubmitting) {
      return;
    }

    setIsChoiceOpen(false);
  }

  return (
    <>
      <section className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--clay-deep)]"
        >
          ← 返回入口选择
        </button>

        <div className="space-y-2">
          <p className="journey-kicker">导入文件</p>
          <h1 className="journey-title text-3xl leading-[1.04] tracking-[-0.05em] sm:text-4xl">
            把现成清单带进 Wanderly
            <span className="mt-1 block text-[var(--clay)]">
              先按模板读字段，再生成第一版旅行计划。
            </span>
          </h1>
          <p className="max-w-2xl journey-subtitle text-[15px] leading-6">
            {supportedHint}
          </p>
        </div>

        <div className="journey-portal px-4 py-5">
          <div className="relative z-[1] space-y-4">
            <div className="space-y-2">
              <p className="journey-kicker">上传 md / txt</p>
              <label
                htmlFor="structured-file-import"
                className="flex cursor-pointer flex-col gap-2 rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,250,241,0.55)] px-4 py-5 text-sm text-[var(--ink-muted)] transition hover:border-[var(--clay-deep)]"
              >
                <span className="font-semibold text-[var(--ink)]">
                  选择旅行模板文件
                </span>
                <span>支持 `.md`、`.txt`。读取后会先校验字段完整性。</span>
                <input
                  id="structured-file-import"
                  type="file"
                  accept=".md,.txt,text/markdown,text/plain"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="rounded-[16px] border border-[var(--line)] bg-[rgba(255,252,246,0.78)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                当前文件
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink)]">
                {selectedFile
                  ? `${selectedFile.name} · ${Math.max(
                      1,
                      Math.round(selectedFile.size / 1024),
                    )} KB`
                  : "还没有选择文件"}
              </p>
            </div>

            {errorMessage ? (
              <p className="rounded-[14px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={!selectedFile || isSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[var(--paper-soft)] disabled:text-[var(--ink-muted)] disabled:shadow-none"
              >
                {isSubmitting ? "正在导入并生成第一版..." : "导入并创建旅行版本"}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      </section>

      <ProjectEntryChoiceDialog
        open={isChoiceOpen}
        isWorking={isSubmitting}
        title="导入成功，下一步怎么继续？"
        description="这份文件已经整理成第一版旅行计划。你可以直接进入工作台，也可以先带着这版结果去 AI Revision 继续调整。"
        onChooseWorkspace={handleChooseWorkspace}
        onChooseRevision={handleChooseRevision}
        onClose={handleCloseDialog}
      />
    </>
  );
}
