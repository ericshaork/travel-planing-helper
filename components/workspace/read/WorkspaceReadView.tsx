import { WorkspaceMain } from "../WorkspaceMain";
import type { ItineraryBlockView } from "@/lib/trip/itinerary-view";
import type {
  WorkspaceReadPlace,
  WorkspaceReadViewModel,
} from "@/lib/workspace/read-model";

import { WorkspaceReadDay } from "./WorkspaceReadDay";

interface WorkspaceReadViewProps {
  viewModel: WorkspaceReadViewModel;
  activeDayNumber: number;
  activeBlockId?: string | null;
  onSelectDay: (dayNumber: number) => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
}

export function WorkspaceReadView({
  viewModel,
  activeDayNumber,
  activeBlockId = null,
  onSelectDay,
  onBlockSelect,
}: WorkspaceReadViewProps) {
  const activeDay =
    viewModel.daysList.find((day) => day.dayNumber === activeDayNumber) ??
    viewModel.daysList[0];
  const activePlace = activeDay?.places.find((place) => place.id === activeBlockId);

  function handlePlaceSelect(place: WorkspaceReadPlace) {
    onBlockSelect?.(place.sourceBlock);
  }

  return (
    <WorkspaceMain>
      <section
        className="journal-sheet px-5 py-5 sm:px-6 sm:py-6"
        data-testid="workspace-read-view"
      >
        <div className="relative z-[1]">
          <header className="pb-4">
            <p className="read-kicker">旅行手帐</p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 max-w-3xl">
                <h1 className="read-title text-2xl sm:text-3xl">
                  {viewModel.title}
                </h1>
                <p className="mt-2 read-subtitle">
                  {viewModel.summary}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="journal-chip">{viewModel.destination}</span>
                <span className="read-count-chip">{`${viewModel.days} 天`}</span>
              </div>
            </div>
            {viewModel.highlights.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {viewModel.highlights.map((highlight) => (
                  <span key={highlight} className="journal-chip">
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}
            <hr className="read-divider mt-4" />
          </header>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="日期导航">
            {viewModel.daysList.map((day) => {
              const active = day.dayNumber === activeDayNumber;

              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => onSelectDay(day.dayNumber)}
                  className={`journal-tab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                    active
                      ? "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]"
                      : ""
                  }`}
                >
                  {`第 ${day.dayNumber} 天`}
                </button>
              );
            })}
          </nav>

          {activeDay ? (
            <div className="mt-5">
              <WorkspaceReadDay
                day={activeDay}
                activePlaceId={activePlace?.id ?? null}
                onPlaceSelect={handlePlaceSelect}
              />
            </div>
          ) : null}
        </div>
      </section>
    </WorkspaceMain>
  );
}
