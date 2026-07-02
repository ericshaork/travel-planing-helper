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
        text: "整份行程已经复制，可以直接贴到备忘录或聊天里。",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "这次没复制上。手机上如果下载不稳，优先用复制完整方案。",
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
        text: "Markdown 已经开始下载，中文会按 UTF-8 保存。",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "文件刚刚没下下来，先用复制完整方案更稳一点。",
      });
    }
  }

  return (
    <section aria-labelledby="export-title">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
        带走这份行程
      </p>
      <h2 id="export-title" className="mt-2 text-2xl font-semibold">
        复制或保存
      </h2>
      <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
        两个按钮用的是同一份内容，不会出现页面一套、文件另一套。
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
        手机上优先推荐复制完整方案。下载 Markdown 保留着，但放在次要位置。
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={copyMarkdown}
          className="min-h-11 w-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] sm:w-auto"
        >
          复制完整方案
        </button>
        <button
          type="button"
          onClick={downloadMarkdown}
          className="min-h-11 w-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-5 py-2.5 text-sm font-semibold shadow-[4px_4px_0_var(--sand)] transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 sm:w-auto"
        >
          下载 Markdown
        </button>
      </div>

      {message ? (
        <p
          role="status"
          className={`mt-4 break-words border-l-2 px-3 py-2 text-sm leading-6 ${
            message.tone === "success"
              ? "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]"
              : "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
