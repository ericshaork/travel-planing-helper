"use client";

import { useState } from "react";

import {
  toTripMarkdown,
  tripPlanMarkdownFilename,
} from "@/lib/trip/markdown";
import type { TripPlan } from "@/lib/trip/types";

interface ExportActionsProps {
  tripPlan: TripPlan;
}

type ActionMessage = {
  tone: "success" | "error";
  text: string;
};

export function ExportActions({ tripPlan }: ExportActionsProps) {
  const [message, setMessage] = useState<ActionMessage>();

  async function copyMarkdown() {
    setMessage(undefined);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(toTripMarkdown(tripPlan));
      setMessage({
        tone: "success",
        text: "完整行程已经复制好了，可以直接粘贴到别处。",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "这次复制没成功，可以再试一次，或改用下载 Markdown。",
      });
    }
  }

  function downloadMarkdown() {
    setMessage(undefined);

    try {
      const blob = new Blob([toTripMarkdown(tripPlan)], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = tripPlanMarkdownFilename(tripPlan);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({
        tone: "success",
        text: "Markdown 已开始下载。",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "这次下载没启动，先用复制会更稳一点。",
      });
    }
  }

  return (
    <section aria-labelledby="export-title" className="relative overflow-hidden">
      <div className="relative z-[1]">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
          导出与保存
        </p>
        <h3 id="export-title" className="mt-2 text-2xl font-semibold">
          把这份行程带走
        </h3>
        <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
          复制和下载都基于当前 Workspace 里的同一份行程内容。
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={copyMarkdown}
            className="min-h-11 w-full rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] sm:w-auto"
          >
            复制完整行程
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="min-h-11 w-full rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-5 py-2.5 text-sm font-semibold shadow-[4px_4px_0_var(--sand)] transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 sm:w-auto"
          >
            下载 Markdown
          </button>
          <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)]">
            已保存在 Workspace
          </span>
        </div>

        {message ? (
          <p
            role="status"
            className={`mt-4 break-words rounded-[18px] border-l-2 px-3 py-2 text-sm leading-6 ${
              message.tone === "success"
                ? "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]"
                : "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
