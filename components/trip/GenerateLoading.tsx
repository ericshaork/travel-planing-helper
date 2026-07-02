import type { TripRequest } from "@/lib/trip/types";

interface GenerateLoadingProps {
  tripRequest: TripRequest;
  isGenerating: boolean;
  errorMessage?: string;
  onBack: () => void;
  onRetry: () => void;
}

export function GenerateLoading({
  tripRequest,
  isGenerating,
  errorMessage,
  onBack,
  onRetry,
}: GenerateLoadingProps) {
  const prepareSteps = [
    {
      title: "先整理你的偏好",
      detail: "城市、预算和节奏已经放到一张草稿里。",
      status: "完成",
    },
    {
      title: "再看天气",
      detail: "天气接不上也没关系，会按不含实时天气的方式继续。",
      status: isGenerating ? "处理中" : errorMessage ? "已停住" : "完成",
    },
    {
      title: "把路线排顺",
      detail: "按片区拆成每天的安排，再留出吃饭和休息时间。",
      status: isGenerating ? "处理中" : errorMessage ? "等你重试" : "完成",
    },
  ] as const;

  return (
    <section className="mx-auto max-w-2xl overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-5 shadow-[9px_10px_0_var(--sand)] sm:p-8">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
        {errorMessage ? "刚刚没排完" : "正在整理路线"}
      </p>
      <h1 className="mt-3 break-words text-3xl font-semibold tracking-[-0.035em]">
        {errorMessage
          ? "先别重填，原来的信息还在。"
          : `${tripRequest.destinationCity} 的路线，正在排。`}
      </h1>
      <p className="mt-3 break-words text-sm leading-7 text-[var(--ink-muted)]">
        {tripRequest.days} 天，预算约 {tripRequest.budget} {tripRequest.currency}
        。这一步只会请求本站生成接口。
      </p>

      <ol className="mt-8 space-y-3">
        {prepareSteps.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-3 border-b border-dashed border-[var(--line)] py-4 last:border-b-0 sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start"
          >
            <div className="flex items-start gap-3 sm:contents">
              <span className="grid size-8 shrink-0 place-items-center border border-[var(--line-strong)] bg-[var(--sand-soft)] font-mono text-xs">
                0{index + 1}
              </span>
              <div className="min-w-0 sm:pr-3">
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 break-words text-sm leading-6 text-[var(--ink-muted)]">
                  {step.detail}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit px-2 py-1 text-xs font-semibold ${
                step.status === "完成"
                  ? "bg-[var(--sage-soft)] text-[var(--sage-deep)]"
                  : errorMessage
                    ? "bg-[var(--clay-soft)] text-[var(--clay-deep)]"
                    : "bg-[var(--sand-soft)] text-[var(--ink-muted)]"
              }`}
            >
              {step.status}
            </span>
          </li>
        ))}
      </ol>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 break-words border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]"
        >
          {errorMessage}
        </p>
      ) : (
        <p className="mt-6 text-sm leading-6 text-[var(--ink-muted)]">
          先看天气，再排路线。通常不用等太久。
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {errorMessage ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 w-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:w-auto"
          >
            再试一次
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="min-h-11 border-b border-[var(--ink)] pb-1 text-left text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)] disabled:cursor-wait disabled:opacity-40"
        >
          返回继续修改
        </button>
      </div>
    </section>
  );
}
