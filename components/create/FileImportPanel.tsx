"use client";

import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import {
  importStructuredTravelFile,
  type FileImportResult,
} from "@/lib/projects/file-import-client";

interface ParsedSummary {
  destination: string | null;
  days: number | null;
  placesCount: number;
  transportCount: number;
  accommodationCount: number;
  missingFields: string[];
}

export function FileImportPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [createdEntry, setCreatedEntry] = useState<FileImportResult | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(null);

  const templateFields = [
    "目的地",
    "日期",
    "每日安排",
    "地点",
    "交通",
    "酒店",
    "预算",
    "备注",
  ];

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

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const nextFile = event.dataTransfer.files?.[0] ?? null;
    if (!nextFile) {
      return;
    }

    setSelectedFile(nextFile);
    setErrorMessage(undefined);
  }

  function handleRemoveFile() {
    if (isSubmitting) {
      return;
    }

    setSelectedFile(null);
    setErrorMessage(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!selectedFile || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    setParsedSummary(null);

    try {
      const result = await importStructuredTravelFile({
        file: selectedFile,
      });
      setCreatedEntry(result);

      // 模拟解析摘要（实际应从 result.tripRequest 提取）
      setParsedSummary({
        destination: result.tripRequest.destinationCity || null,
        days: result.tripRequest.days || null,
        placesCount: result.tripPlan.dailyItinerary.reduce(
          (sum, day) => sum + day.morning.length + day.afternoon.length + day.evening.length,
          0,
        ),
        transportCount: 2, // 占位数据
        accommodationCount: 1, // 占位数据
        missingFields: [],
      });
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

    router.push("/workspace");
  }

  function handleChooseRevision() {
    if (!createdEntry) {
      return;
    }

    router.push(createdEntry.revisionHref);
  }

  function handleResetImport() {
    if (isSubmitting) {
      return;
    }

    setCreatedEntry(null);
    setErrorMessage(undefined);
  }

  const selectedFileSize = selectedFile
    ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`
    : null;

  const selectedFileType = selectedFile?.type.includes("markdown")
    ? "Markdown"
    : selectedFile?.type.includes("plain") || selectedFile?.name.endsWith(".txt")
      ? "纯文本"
      : null;

  return (
    <section className="w-full space-y-3 pt-2">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--clay-deep)]"
      >
        <span aria-hidden="true">←</span>
        <span>返回入口选择</span>
      </button>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr] lg:items-start">
        {/* 左侧流程区域 */}
        <aside className="space-y-4 px-1 py-1">
          <div className="space-y-1.5">
            <p className="journey-kicker">Wanderly · 旅行档案导入台</p>
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">
              导入流程
            </h2>
            <p className="text-[13px] leading-5 text-[var(--ink-muted)]">
              把已有旅行想法整理成可执行行程。
            </p>
          </div>

          <ol className="space-y-3">
            {[
              ["01", "上传草稿"],
              ["02", "识别旅行信息"],
              ["03", "生成可编辑行程"],
            ].map(([step, title]) => (
              <li
                key={step}
                className="grid grid-cols-[2rem_1fr] gap-2.5 text-[13px] leading-5"
              >
                <span className="mt-0.5 grid size-7 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] text-[11px] font-bold text-[var(--clay-deep)] shadow-[2px_2px_0_rgba(201,170,120,0.16)]">
                  {step}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ink)]">{title}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-[var(--line)] pt-3">
            <p className="mb-2 text-[13px] font-semibold text-[var(--ink-muted)]">
              Wanderly 会尝试识别
            </p>
            <div className="flex flex-wrap gap-1.5">
              {templateFields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* 右侧主工作区 */}
        <div className="rounded-[16px] border border-[var(--line)] bg-[rgba(255,253,247,0.92)] px-5 py-4 shadow-[3px_4px_0_rgba(201,170,120,0.12)]">
          {!createdEntry ? (
            <div className="space-y-4">
              {/* 标题区 */}
              <div className="space-y-1.5">
                <p className="journey-kicker">支持 md / txt</p>
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-[var(--ink)]">
                  导入旅行草稿
                </h1>
                <p className="text-[13px] leading-5 text-[var(--ink-muted)]">
                  支持 .md / .txt 文件。导入后会先生成识别摘要，再由你决定继续 AI 补全或进入工作台。
                </p>
              </div>

              {/* 两列布局：上传区 + 预览区 */}
              <div className="grid gap-4 lg:grid-cols-[58%_42%]">
                {/* 左列：上传区 + 文件条 + 按钮 */}
                <div className="space-y-3">
                  {/* 上传区 */}
                  <label
                    htmlFor="structured-file-import"
                    onDragEnter={() => setIsDragActive(true)}
                    onDragLeave={() => setIsDragActive(false)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDrop={handleDrop}
                    className={[
                      "flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border border-dashed px-5 py-5 text-center transition",
                      isDragActive
                        ? "border-[var(--clay-deep)] bg-[rgba(177,91,69,0.06)]"
                        : "border-[var(--line)] bg-[rgba(255,250,241,0.4)] hover:border-[var(--clay-deep)] hover:bg-[rgba(255,247,234,0.6)]",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-12 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] text-xl text-[var(--clay-deep)] shadow-[2px_2px_0_rgba(201,170,120,0.16)]"
                    >
                      ↑
                    </span>
                    <span className="space-y-0.5">
                      <span className="block text-[15px] font-semibold text-[var(--ink)]">
                        把旅行草稿拖到这里
                      </span>
                      <span className="block text-[13px] leading-5 text-[var(--ink-muted)]">
                        或点击选择文件
                      </span>
                    </span>
                    <span className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3.5 py-1 text-[13px] font-semibold text-[var(--paper-bright)] shadow-[2px_2px_0_var(--clay)]">
                      选择旅行草稿
                    </span>
                    <span className="text-[11px] leading-4 text-[var(--ink-faint)]">
                      例如：深圳三日游.md、杭州周末计划.txt
                    </span>
                    <input
                      ref={fileInputRef}
                      id="structured-file-import"
                      type="file"
                      accept=".md,.txt,text/markdown,text/plain"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>

                  {/* 紧凑文件条 */}
                  <div className="rounded-[10px] border border-[var(--line)] bg-[rgba(255,252,246,0.5)] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                          当前文件
                        </p>
                        <p className="mt-0.5 truncate text-[13px] leading-5 text-[var(--ink)]">
                          {selectedFile ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-medium">{selectedFile.name}</span>
                              {selectedFileSize && (
                                <span className="text-[var(--ink-muted)]">· {selectedFileSize}</span>
                              )}
                              {selectedFileType && (
                                <span className="rounded border border-[var(--line)] bg-[var(--paper-bright)] px-1.5 py-px text-[10px] font-medium text-[var(--ink-muted)]">
                                  {selectedFileType}
                                </span>
                              )}
                            </span>
                          ) : (
                            "尚未选择"
                          )}
                        </p>
                      </div>
                      {selectedFile ? (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          disabled={isSubmitting}
                          className="inline-flex h-7 items-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.78)] px-2.5 text-[11px] font-semibold text-[var(--ink-muted)] transition hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          移除
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* 解析中状态 */}
                  {isSubmitting && (
                    <div className="rounded-[10px] border border-[var(--sand)] bg-[rgba(244,234,214,0.3)] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-4 w-4">
                          <div className="absolute inset-0 animate-ping rounded-full bg-[var(--clay-deep)] opacity-20"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-[var(--clay-deep)] border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-[13px] font-medium text-[var(--ink)]">
                          正在识别目的地、日期、地点和每日安排…
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 错误信息 */}
                  {errorMessage && !isSubmitting ? (
                    <div className="rounded-[10px] border border-[var(--clay)] bg-[rgb(196_104_89_/_0.06)] px-3 py-2.5">
                      <p className="text-[13px] leading-5 text-[var(--clay-deep)]">
                        {errorMessage}
                      </p>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="mt-1.5 text-[12px] font-semibold text-[var(--clay-deep)] underline decoration-dotted underline-offset-2 hover:text-[var(--ink)]"
                      >
                        重新选择文件
                      </button>
                    </div>
                  ) : null}

                  {/* 底部操作按钮 */}
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => void handleImport()}
                      disabled={!selectedFile || isSubmitting}
                      className="inline-flex h-10 min-w-36 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-[13px] font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--clay)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[var(--paper-soft)] disabled:text-[var(--ink-faint)] disabled:shadow-none"
                    >
                      {isSubmitting ? "正在整理..." : "开始整理行程"}
                    </button>
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[13px] font-semibold text-[var(--ink-muted)] transition hover:text-[var(--clay-deep)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      稍后再说
                    </button>
                  </div>
                </div>

                {/* 右列：识别结果预览 */}
                <div className="rounded-[12px] border border-[var(--line)] bg-[rgba(255,252,246,0.5)] px-3.5 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                    识别结果预览
                  </p>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[var(--ink-muted)]">目的地</span>
                      <span className="font-medium text-[var(--ink)]">
                        {parsedSummary?.destination || "待识别"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[var(--ink-muted)]">天数</span>
                      <span className="font-medium text-[var(--ink)]">
                        {parsedSummary?.days ? `${parsedSummary.days} 天` : "待识别"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[var(--ink-muted)]">地点</span>
                      <span className="font-medium text-[var(--ink)]">
                        {parsedSummary ? `${parsedSummary.placesCount} 个` : "0 个"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[var(--ink-muted)]">交通</span>
                      <span className="font-medium text-[var(--ink)]">
                        {parsedSummary ? `${parsedSummary.transportCount} 段` : "0 段"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[var(--ink-muted)]">住宿</span>
                      <span className="font-medium text-[var(--ink)]">
                        {parsedSummary ? `${parsedSummary.accommodationCount} 项` : "0 项"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[var(--ink-muted)]">缺失信息</span>
                      <span className="font-medium text-[var(--clay-deep)]">
                        {parsedSummary?.missingFields.length
                          ? parsedSummary.missingFields.join("、")
                          : "上传后检查"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 border-t border-[var(--line)] pt-2 text-[11px] leading-4 text-[var(--ink-faint)]">
                    上传后先展示识别摘要，再由你决定 AI 补全或进入工作台。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 解析成功标题 */}
              <div className="space-y-1.5">
                <p className="journey-kicker">导入完成</p>
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-[var(--ink)]">
                  下一步怎么继续？
                </h1>
                <p className="text-[13px] leading-5 text-[var(--ink-muted)]">
                  这份计划已经整理成第一版。你可以让 AI 继续修改，也可以直接用这版进入工作台。
                </p>
              </div>

              {/* 两列布局：识别摘要 + 操作 */}
              <div className="grid gap-4 lg:grid-cols-[58%_42%]">
                {/* 左列：识别摘要 */}
                {parsedSummary && (
                  <div className="rounded-[12px] border border-[var(--line)] bg-[rgba(255,252,246,0.5)] px-3.5 py-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      识别结果预览
                    </p>
                    <div className="space-y-1.5 text-[13px]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[var(--ink-muted)]">目的地</span>
                        <span className="font-medium text-[var(--ink)]">
                          {parsedSummary.destination || "待识别"}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[var(--ink-muted)]">天数</span>
                        <span className="font-medium text-[var(--ink)]">
                          {parsedSummary.days ? `${parsedSummary.days} 天` : "待识别"}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[var(--ink-muted)]">地点</span>
                        <span className="font-medium text-[var(--ink)]">
                          {parsedSummary.placesCount} 个
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[var(--ink-muted)]">交通</span>
                        <span className="font-medium text-[var(--ink)]">
                          {parsedSummary.transportCount} 段
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[var(--ink-muted)]">住宿</span>
                        <span className="font-medium text-[var(--ink)]">
                          {parsedSummary.accommodationCount} 项
                        </span>
                      </div>
                      {parsedSummary.missingFields.length > 0 && (
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[var(--ink-muted)]">缺失信息</span>
                          <span className="font-medium text-[var(--clay-deep)]">
                            {parsedSummary.missingFields.join("、")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 右列：操作按钮 */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleChooseRevision}
                    disabled={isSubmitting}
                    className="journey-entry-card flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="journey-kicker">AI 补全</span>
                    <span className="block text-[14px] font-semibold text-[var(--ink)]">
                      进入 AI 补全
                    </span>
                    <span className="block text-[12px] leading-4 text-[var(--ink-muted)]">
                      让 AI 继续完善缺失信息。
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleChooseWorkspace}
                    disabled={isSubmitting}
                    className="journey-entry-card journey-entry-card--active flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="journey-kicker">工作台</span>
                    <span className="block text-[14px] font-semibold text-[var(--ink)]">
                      直接进入工作台
                    </span>
                    <span className="block text-[12px] leading-4 text-[var(--ink-muted)]">
                      使用当前版本开始编辑。
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetImport}
                    disabled={isSubmitting}
                    className="text-[12px] font-semibold text-[var(--ink-muted)] transition hover:text-[var(--clay-deep)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    重新选择文件
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
