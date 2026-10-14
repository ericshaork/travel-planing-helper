"use client";

const JOURNEY_STEPS = [
  { id: 0, label: "初始需求", hint: "等待你描述旅行想法" },
  { id: 1, label: "目的地与天数", hint: "还未填写" },
  { id: 2, label: "预算与节奏", hint: "还未填写" },
  { id: 3, label: "兴趣偏好", hint: "还未填写" },
  { id: 4, label: "确认方案", hint: "还未开始" },
] as const;

function resolveStepStatus(
  stepId: number,
  currentStep: number,
  interviewComplete: boolean,
): "done" | "current" | "upcoming" {
  if (interviewComplete && stepId < 4) return "done";
  if (stepId === 0 && currentStep === 1 && !interviewComplete) return "current";
  if (stepId > 0 && stepId < 4 && stepId < currentStep) return "done";
  if (stepId > 0 && stepId < 4 && stepId === currentStep) return "current";
  if (stepId === 4 && interviewComplete) return "current";
  return "upcoming";
}

function resolveFilledHint(stepId: number): string {
  const hints: Record<number, string> = {
    1: "已记录",
    2: "已记录",
    3: "已记录",
  };
  return hints[stepId] ?? "还未填写";
}

export function JourneyDirectory({
  currentStep,
  interviewComplete,
}: {
  currentStep: number;
  interviewComplete: boolean;
}) {
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start hidden h-full min-h-0 flex-col overflow-y-auto border-r border-[var(--line)]/50 bg-[var(--paper)]/40 px-3 py-5 md:flex lg:h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-6rem)] lg:px-4">
      <header className="px-1 pb-5">
        <p className="font-serif text-[17px] font-semibold tracking-[0.02em] text-[var(--ink)]">
          旅行手札
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-muted)]">
          每一版，都是我们一起整理出的方向。
        </p>
      </header>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5">
        {JOURNEY_STEPS.map((step) => {
          const status = resolveStepStatus(step.id, currentStep, interviewComplete);
          const isCurrent = status === "current";
          const isDone = status === "done";
          const displayHint =
            isDone && step.id > 0 && step.id < 4
              ? resolveFilledHint(step.id)
              : step.hint;

          return (
            <div
              key={step.id}
              className={`relative rounded-sm border-l-2 px-2.5 py-2.5 transition-colors ${
                isCurrent
                  ? "border-[var(--clay)] bg-[var(--clay-soft)]/30"
                  : isDone
                    ? "border-[var(--sage-deep)]/50 bg-transparent"
                    : "border-[var(--line)]/60 bg-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    isCurrent
                      ? "bg-[var(--clay)] text-[var(--paper-bright)]"
                      : isDone
                        ? "bg-[var(--sage-deep)]/60 text-[var(--paper-bright)]"
                        : "border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-faint)]"
                  }`}
                >
                  {isDone ? "✓" : step.id}
                </span>
                <span
                  className={`text-[12px] font-semibold tracking-[0.04em] ${
                    isCurrent
                      ? "text-[var(--ink)]"
                      : isDone
                        ? "text-[var(--ink-muted)]"
                        : "text-[var(--ink-faint)]"
                  }`}
                >
                  第 {step.id} 步 · {step.label}
                </span>
              </div>
              <p
                className={`mt-1 pl-6 text-[11px] leading-4 ${
                  isCurrent
                    ? "text-[var(--ink-muted)]"
                    : "text-[var(--ink-faint)]"
                }`}
              >
                {displayHint}
              </p>
              {isCurrent ? (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-[0.1em] text-[var(--clay)]">
                  当前
                </span>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-dashed border-[var(--line)]/60 pt-4">
        <div className="flex items-center gap-2 px-1">
          <span className="h-px flex-1 bg-[var(--line)]/40" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Wanderly
          </span>
          <span className="h-px flex-1 bg-[var(--line)]/40" />
        </div>
        <p className="mt-2 text-center text-[10px] leading-4 text-[var(--ink-faint)]">
          五问之后，生成第一版方案
        </p>
      </div>
    </aside>
  );
}
