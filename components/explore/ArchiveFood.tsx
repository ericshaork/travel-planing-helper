import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveFoodProps {
  item: ExploreTripContent;
}

export function ArchiveFood({ item }: ArchiveFoodProps) {
  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Food</h2>
        <div className="space-y-3">
          {item.food.map((food) => (
            <div
              key={food.id}
              className="rounded-[18px] border border-[var(--line)] px-4 py-4"
            >
              <h3 className="text-base font-semibold text-[var(--ink)]">
                {food.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {food.reason}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
