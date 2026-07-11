import Image from "next/image";

import {
  getWorkspaceTransportImage,
  getWorkspaceTransportScene,
} from "@/lib/trip/workspace-asset-resolver";
import type { TransportAdvice as TransportAdviceType } from "@/lib/trip/types";

interface TransportAdviceProps {
  advice: TransportAdviceType;
}

const TRANSPORT_MODE_LABELS: Record<
  TransportAdviceType["options"][number]["mode"],
  string
> = {
  flight: "Flight",
  train: "Train",
  high_speed_rail: "High-speed rail",
  bus: "Bus",
  ship: "Ship",
  other: "Other",
};

export function TransportAdvice({ advice }: TransportAdviceProps) {
  const primaryMode = advice.options[0]?.mode;

  return (
    <section
      aria-labelledby="transport-title"
      className="relative overflow-hidden rounded-[28px] border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-20">
        <Image
          src={getWorkspaceTransportScene(primaryMode)}
          alt=""
          fill
          aria-hidden
          sizes="900px"
          className="object-cover object-top"
        />
      </div>

      <div className="relative z-[1]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="workspace-kicker">TRANSPORT NOTE</p>
            <h2 id="transport-title" className="mt-2 text-2xl font-semibold">
              Travel transport
            </h2>
            <p className="mt-4 break-words text-sm leading-7 text-[var(--ink-muted)]">
              {advice.summary}
            </p>
          </div>

          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.7)] sm:h-24 sm:w-24">
            <Image
              src={getWorkspaceTransportImage(primaryMode)}
              alt=""
              fill
              aria-hidden
              sizes="96px"
              className="object-contain p-2"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {advice.options.map((option, index) => (
            <article
              key={`${option.mode}-${index}`}
              className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(251,248,240,0.96)_0%,rgba(255,253,247,0.98)_100%)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {TRANSPORT_MODE_LABELS[option.mode]}
                  </h3>
                  <p className="mt-1 text-xs tracking-[0.12em] text-[var(--ink-muted)]">
                    travel option
                  </p>
                </div>
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.7)]">
                  <Image
                    src={getWorkspaceTransportImage(option.mode)}
                    alt=""
                    fill
                    aria-hidden
                    sizes="40px"
                    className="object-contain p-1.5"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 text-sm leading-6 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--sage-deep)]">Works well for</p>
                  <ul className="mt-1 text-[var(--ink-muted)]">
                    {option.pros.map((item) => (
                      <li key={item} className="break-words">
                        - {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--clay-deep)]">Watch out for</p>
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

        <p className="mt-5 break-words rounded-[20px] bg-[var(--clay-soft)] px-3 py-2 text-xs leading-5 text-[var(--clay-deep)]">
          {advice.note} Real-time prices, seat inventory, and departures still need to be confirmed on official platforms.
        </p>
        {advice.suggestedPlatforms.length > 0 ? (
          <p className="mt-3 break-words text-xs text-[var(--ink-muted)]">
            Check: {advice.suggestedPlatforms.join(", ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
