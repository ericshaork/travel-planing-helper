import type { HotelAreaAdvice as HotelAreaAdviceType } from "@/lib/trip/types";

interface HotelAreaAdviceProps {
  advice: HotelAreaAdviceType[];
}

export function HotelAreaAdvice({ advice }: HotelAreaAdviceProps) {
  return (
    <section aria-labelledby="hotel-title">
      <div className="mb-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
          住哪一片更省事
        </p>
        <h2 id="hotel-title" className="mt-2 text-2xl font-semibold">
          住宿区域建议
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {advice.map((item) => (
          <article
            key={item.area}
            className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 shadow-[5px_6px_0_var(--sage-soft)]"
          >
            <h3 className="break-words text-xl font-semibold">{item.area}</h3>
            <p className="mt-3 break-words text-sm leading-6 text-[var(--ink-muted)]">
              {item.reason}
            </p>
            <dl className="mt-4 space-y-2 border-t border-dashed border-[var(--line)] pt-4 text-sm leading-6">
              <div>
                <dt className="font-semibold">适合</dt>
                <dd className="break-words text-[var(--ink-muted)]">
                  {item.suitableFor}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">交通</dt>
                <dd className="break-words text-[var(--ink-muted)]">
                  {item.transportationConvenience}
                </dd>
              </div>
              {item.possibleDownside ? (
                <div>
                  <dt className="font-semibold">要留意</dt>
                  <dd className="break-words text-[var(--ink-muted)]">
                    {item.possibleDownside}
                  </dd>
                </div>
              ) : null}
            </dl>
            {item.suggestedPlatforms.length > 0 ? (
              <p className="mt-4 break-words text-xs leading-5 text-[var(--ink-muted)]">
                可去 {item.suggestedPlatforms.join("、")} 查询。平台信息仅供比较，
                不代表实时价格或库存。
              </p>
            ) : (
              <p className="mt-4 break-words text-xs leading-5 text-[var(--ink-muted)]">
                区域建议不代表实时酒店价格或库存。
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
