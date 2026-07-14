"use client";

import { useState } from "react";

interface GenerateTripButtonProps {
  label: string;
  payload?: unknown;
  helperText?: string;
  disabled?: boolean;
  onGenerate?: () => void | Promise<void>;
}

export function GenerateTripButton({
  label,
  payload,
  helperText,
  disabled = false,
  onGenerate,
}: GenerateTripButtonProps) {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    if (!onGenerate) {
      setOpen((current) => !current);
      return;
    }

    setIsRunning(true);

    try {
      await onGenerate();
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || isRunning}
        onClick={() => void handleClick()}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--ink-muted)]"
      >
        {isRunning ? "正在准备…" : label}
      </button>

      {helperText ? (
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{helperText}</p>
      ) : null}

      {payload ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="text-xs font-semibold text-[var(--ink-muted)] underline-offset-4 hover:underline"
        >
          {open ? "收起创建参数" : "查看创建参数"}
        </button>
      ) : null}

      {open && payload ? (
        <pre className="overflow-x-auto rounded-[18px] border border-[var(--line)] px-4 py-4 text-xs leading-6 text-[var(--ink-muted)]">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
