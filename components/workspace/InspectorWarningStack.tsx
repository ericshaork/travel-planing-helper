import Image from "next/image";

import { PaceWarningList } from "@/components/trip/PaceWarningList";
import { WeatherImpactList } from "@/components/trip/WeatherImpactList";
import type { DayRouteInsight } from "@/lib/trip/route-insight";

interface InspectorWarningStackProps {
  insight?: DayRouteInsight;
}

export function InspectorWarningStack({
  insight,
}: InspectorWarningStackProps) {
  return (
    <section className="workspace-panel relative overflow-hidden px-4 py-4">
      <div className="pointer-events-none absolute left-4 top-3 h-10 w-16 opacity-65">
        <Image
          src="/images/archive/decoration/archive-tape-corner.png"
          alt=""
          fill
          aria-hidden
          sizes="64px"
          className="object-contain"
        />
      </div>
      <div className="relative z-[1] space-y-4">
        <div>
          <p className="workspace-kicker">旅行备注</p>
          <h3 className="mt-1 text-base font-semibold">节奏与天气备注</h3>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
            节奏提醒
          </p>
          <PaceWarningList warnings={insight?.routeSummary?.warnings ?? []} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
            天气影响
          </p>
          <WeatherImpactList impacts={insight?.weatherImpacts ?? []} />
        </div>
      </div>
    </section>
  );
}
