"use client";

import Image from "next/image";
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
        text: "The full trip journal is copied and ready to paste anywhere.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Copy did not complete this time. If download is unstable on mobile, try copy first.",
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
        text: "Markdown download has started and will be saved in UTF-8.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Download did not start this time. Copying the full plan is the safer fallback.",
      });
    }
  }

  return (
    <section aria-labelledby="export-title" className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-16 w-20 opacity-25">
        <Image
          src="/images/ui/button/button-accent-soft.png"
          alt=""
          fill
          aria-hidden
          sizes="80px"
          className="object-cover object-top"
        />
      </div>

      <div className="relative z-[1]">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
          FINISH THIS JOURNAL
        </p>
        <h2 id="export-title" className="mt-2 text-2xl font-semibold">
          Export or keep this trip
        </h2>
        <p className="mt-2 break-words text-sm leading-6 text-[var(--ink-muted)]">
          Copy and download use the same source, so what you read in Workspace stays aligned with what you take away.
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
          Copy is usually the easiest completion action on mobile. Markdown download remains available as a secondary finish step.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={copyMarkdown}
            className="min-h-11 w-full rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] sm:w-auto"
          >
            Copy full journal
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="min-h-11 w-full rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-5 py-2.5 text-sm font-semibold shadow-[4px_4px_0_var(--sand)] transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 sm:w-auto"
          >
            Download Markdown
          </button>
          <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)]">
            Saved in Workspace
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
