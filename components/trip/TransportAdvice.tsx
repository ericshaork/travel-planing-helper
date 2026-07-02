import type { TransportAdvice as TransportAdviceType } from "@/lib/trip/types";

interface TransportAdviceProps {
  advice: TransportAdviceType;
}

const TRANSPORT_MODE_LABELS: Record<
  TransportAdviceType["options"][number]["mode"],
  string
> = {
  flight: "飞机",
  train: "火车",
  high_speed_rail: "高铁",
  bus: "大巴",
  ship: "轮船",
  other: "其他方式",
};

export function TransportAdvice({ advice }: TransportAdviceProps) {
  return (
    <section
      aria-labelledby="transport-title"
      className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 sm:p-6"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
        往返和市内移动
      </p>
      <h2 id="transport-title" className="mt-2 text-2xl font-semibold">
        交通建议
      </h2>
      <p className="mt-4 break-words text-sm leading-7 text-[var(--ink-muted)]">
        {advice.summary}
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {advice.options.map((option, index) => (
          <article
            key={`${option.mode}-${index}`}
            className="overflow-hidden border border-[var(--line)] bg-[var(--sand-soft)] p-4"
          >
            <h3 className="font-semibold">{TRANSPORT_MODE_LABELS[option.mode]}</h3>
            <div className="mt-3 grid gap-3 text-sm leading-6 md:grid-cols-2">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--sage-deep)]">适合的地方</p>
                <ul className="mt-1 text-[var(--ink-muted)]">
                  {option.pros.map((item) => (
                    <li key={item} className="break-words">
                      - {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--clay-deep)]">要留意</p>
                <ul className="mt-1 text-[var(--ink-muted)]">
                  {option.cons.map((item) => (
                    <li key={item} className="break-words">
                      - {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 break-words border-t border-dashed border-[var(--line)] pt-3 text-sm leading-6">
              {option.recommendation}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-5 break-words bg-[var(--clay-soft)] px-3 py-2 text-xs leading-5 text-[var(--clay-deep)]">
        {advice.note} 这里不提供实时票价、余票或班次承诺，请以官方平台为准。
      </p>
      {advice.suggestedPlatforms.length > 0 ? (
        <p className="mt-3 break-words text-xs text-[var(--ink-muted)]">
          可查询：{advice.suggestedPlatforms.join("、")}
        </p>
      ) : null}
    </section>
  );
}
