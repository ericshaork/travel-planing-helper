"use client";

import type { FormEvent } from "react";

import type { TravelProjectMessage } from "@/lib/projects/types";

const CLARIFYING_QUICK_OPTIONS = [
  "预算大概 6000，想玩 5 天。",
  "想看风景、吃本地小店，也留一点自由时间。",
  "不想早起，整体节奏轻松一点。",
] as const;

export function resolveClarifyingQuickOptions() {
  return CLARIFYING_QUICK_OPTIONS;
}

interface CreateChatViewProps {
  messages: TravelProjectMessage[];
  inputValue: string;
  isSending: boolean;
  errorMessage?: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickOption: (value: string) => void;
}

export function CreateChatView({
  messages,
  inputValue,
  isSending,
  errorMessage,
  onInputChange,
  onSubmit,
  onQuickOption,
}: CreateChatViewProps) {
  const quickOptions = resolveClarifyingQuickOptions();

  return (
    <section
      data-testid="create-chat-view"
      className="paper-card relative overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-3 sm:p-4"
    >
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-10 w-24 rotate-3 bg-[var(--tape)] opacity-80"
      />

      <div className="relative space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-[var(--line)] pb-3">
          <div>
            <p className="journey-kicker">Travel consultation notes</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">
              一次只确认一个关键问题
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
              Wanderly 会根据你已经说过的内容继续追问，不需要一次填完所有信息。
            </p>
          </div>
          <span className="journal-chip">正在补充旅行偏好</span>
        </header>

        <div
          aria-live="polite"
          className="max-h-[390px] space-y-3 overflow-y-auto rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] p-3"
        >
          {messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <article
                key={message.id}
                className={`max-w-[92%] rounded-[18px] px-3 py-2.5 text-sm leading-6 shadow-[2px_2px_0_var(--sand)] ${
                  isUser
                    ? "ml-auto border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                    : "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
                  {isUser ? "Your note" : "Wanderly · AI 旅行顾问"}
                </p>
                <p>{message.content}</p>
              </article>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-[rgb(255_251_243/0.76)] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            可以直接回答，也可以选一句
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option}
                type="button"
                disabled={isSending}
                onClick={() => onQuickOption(option)}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-left text-xs font-semibold leading-5 text-[var(--ink-muted)] transition-colors hover:border-[var(--clay)] hover:text-[var(--ink)] disabled:opacity-60"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            aria-label="继续回答 AI 旅行顾问"
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            rows={3}
            maxLength={2000}
            disabled={isSending}
            placeholder="比如：预算 6000，5 天，不想早起，希望多安排本地小店。"
            className="min-h-24 w-full resize-y rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2.5 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sage-deep)]"
          />

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-[14px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-dashed border-[var(--line)] pt-2">
            <p className="text-[11px] leading-5 text-[var(--ink-muted)]">
              AI 会记住上面的回答，并继续确认下一项。
            </p>
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="min-h-9 shrink-0 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] disabled:cursor-wait disabled:opacity-60"
            >
              {isSending ? "正在记录..." : "继续回答"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
