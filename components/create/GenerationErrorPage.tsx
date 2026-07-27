"use client";

interface GenerationErrorPageProps {
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function GenerationErrorPage({
  message,
  onRetry,
  onBack,
}: GenerationErrorPageProps) {
  const displayMessage =
    message?.trim() ?? "刚才那一下没接上，可以稍后再试一次，或者先回到对话。";

  return (
    <section
      data-testid="create-generation-error"
      className="flex min-h-[560px] flex-col items-center justify-center gap-5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-bright)]/90 px-4 py-8 text-center sm:px-8"
    >
      <p className="journey-kicker">Wanderly · 整理被打断了</p>
      <h2 className="font-serif text-xl font-semibold text-[var(--ink)] sm:text-2xl">
        这一版还没整理出来
      </h2>
      <p
        role="alert"
        className="max-w-md border-l-2 border-[var(--clay)] bg-[var(--clay-soft)]/35 px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]"
      >
        {displayMessage}
      </p>
      <p className="max-w-md text-sm leading-7 text-[var(--ink-muted)]">
        可以直接再试一次，或者先回到对话，把刚才那句话再说一遍，看看会不会有不同的结果。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            data-testid="create-generation-error-retry"
            className="inline-flex min-h-9 items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] hover:bg-[var(--clay-deep)]"
          >
            再试一次
          </button>
        ) : null}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            data-testid="create-generation-error-back"
            className="inline-flex min-h-9 items-center justify-center border-b border-[var(--ink)] pb-1 text-sm font-semibold text-[var(--ink)] hover:border-[var(--clay)] hover:text-[var(--clay-deep)]"
          >
            回到对话
          </button>
        ) : null}
      </div>
    </section>
  );
}
