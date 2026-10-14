"use client";

interface DossierField {
  label: string;
  value: string | null;
}

function extractField(
  messages: { role: string; content: string }[],
  patterns: RegExp[],
): string | null {
  const allText = messages.map((m) => m.content).join(" ");
  for (const pattern of patterns) {
    const match = allText.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function resolveDossierFields(
  messages: { role: string; content: string }[],
): DossierField[] {
  const destination = extractField(messages, [
    /去([一-龥A-Za-z\s]{2,20}?)(?:玩|旅行|旅游|逛|，|。|\s)/,
    /目的地[：:]\s*(.{2,20}?)(?:[，,。.；;]|$)/,
  ]);
  const days = extractField(messages, [
    /(\d+)\s*(?:天|day|days)/i,
    /玩\s*(\d+)\s*天/,
  ]);
  const budget = extractField(messages, [
    /预算\s*(\d[\d,.]*\s*(?:元|块|k|K|万)?)/i,
    /(\d[\d,.]*\s*(?:元|块))\s*(?:左右|以内|预算)/i,
  ]);
  const pace = extractField(messages, [
    /(轻松|慢节奏|紧凑|不赶|不累|休闲|充实|不早起)/,
  ]);
  const interests = extractField(messages, [
    /(风景|美食|拍照|文化|散步|海边|城市漫步|本地小吃|历史|自然)/,
  ]);

  return [
    { label: "目的地", value: destination },
    { label: "天数", value: days ? `${days} 天` : null },
    { label: "预算", value: budget },
    { label: "节奏", value: pace },
    { label: "兴趣", value: interests },
  ];
}

function resolveDossierStatus(
  messages: { role: string; content: string }[],
  interviewComplete: boolean,
): {
  statusLine: string;
  nextStepLine: string;
} {
  if (messages.length === 0) {
    return {
      statusLine: "正在等待你的第一段旅行想法。",
      nextStepLine: "你可以只写一句，也可以写得很散。",
    };
  }
  if (interviewComplete) {
    return {
      statusLine: "五问线索已收齐，正在整理方向。",
      nextStepLine: "接下来会生成第一版旅行方案。",
    };
  }
  return {
    statusLine: "正在记录你的旅行线索。",
    nextStepLine: "回答后，我会继续确认目的地、天数和旅行节奏。",
  };
}

export function TripDossier({
  messages,
  interviewComplete,
}: {
  messages: { role: string; content: string }[];
  interviewComplete: boolean;
}) {
  const fields = resolveDossierFields(messages);
  const { statusLine, nextStepLine } = resolveDossierStatus(
    messages,
    interviewComplete,
  );
  const filledCount = fields.filter((f) => f.value !== null).length;

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start flex h-full min-h-0 flex-col overflow-y-auto border-t border-[var(--line)]/50 bg-[var(--paper)]/30 px-3 py-5 md:col-span-2 md:border-l md:border-t-0 lg:col-span-1 lg:h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-6rem)] lg:px-4">
      <header className="px-1 pb-4">
        <p className="font-serif text-[17px] font-semibold tracking-[0.02em] text-[var(--ink)]">
          旅行档案
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          TRIP DOSSIER
        </p>
      </header>

      <section className="border-b border-dashed border-[var(--line)]/60 pb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
          当前记录
        </p>
        <dl className="space-y-1.5">
          {fields.map((field) => (
            <div key={field.label} className="flex items-baseline gap-2">
              <dt className="w-12 shrink-0 text-[11px] text-[var(--ink-faint)]">
                {field.label}
              </dt>
              <dd
                className={`flex-1 text-[12px] leading-5 ${
                  field.value
                    ? "font-semibold text-[var(--ink)]"
                    : "text-[var(--ink-faint)] italic"
                }`}
              >
                {field.value ?? "未确定"}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--line)]/50">
            <div
              className="h-full rounded-full bg-[var(--clay)]/70 transition-all duration-500"
              style={{ width: `${(filledCount / fields.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-[var(--ink-faint)]">
            {filledCount}/{fields.length}
          </span>
        </div>
      </section>

      <section className="border-b border-dashed border-[var(--line)]/60 py-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
          AI 整理中
        </p>
        <p className="text-[12px] leading-5 text-[var(--ink-muted)]">
          {statusLine}
        </p>
      </section>

      <section className="py-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
          下一步
        </p>
        <p className="text-[12px] leading-5 text-[var(--ink-muted)]">
          {nextStepLine}
        </p>
      </section>

      <div className="mt-auto px-1">
        <div
          aria-hidden="true"
          className="border-t border-dashed border-[var(--line)]/50 pt-3"
        >
          <p className="text-center text-[9px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            — 实时摘要 —
          </p>
        </div>
      </div>
    </aside>
  );
}
