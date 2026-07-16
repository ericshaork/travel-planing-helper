import type { SavedTripListItem } from "@/lib/trips/types";

import { SavedTripCard } from "./SavedTripCard";
import { TripsEmptyState } from "./TripsEmptyState";

interface SavedTripsListProps {
  trips: SavedTripListItem[];
  openingTripId?: string | null;
  deletingTripId?: string | null;
  confirmingDeleteTripId?: string | null;
  openErrorByTripId?: Record<string, string | undefined>;
  deleteErrorByTripId?: Record<string, string | undefined>;
  onOpenTrip?: (trip: SavedTripListItem) => void | Promise<void>;
  onDeleteTrip?: (trip: SavedTripListItem) => void | Promise<void>;
  onCancelDeleteTrip?: (trip: SavedTripListItem) => void;
}

export function SavedTripsList({
  trips,
  openingTripId = null,
  deletingTripId = null,
  confirmingDeleteTripId = null,
  openErrorByTripId,
  deleteErrorByTripId,
  onOpenTrip,
  onDeleteTrip,
  onCancelDeleteTrip,
}: SavedTripsListProps) {
  if (trips.length === 0) {
    return <TripsEmptyState />;
  }

  return (
    <section className="space-y-4">
      {trips.map((trip) => (
        <SavedTripCard
          key={trip.id}
          trip={trip}
          isOpening={openingTripId === trip.id}
          isDeleting={deletingTripId === trip.id}
          isConfirmingDelete={confirmingDeleteTripId === trip.id}
          openError={openErrorByTripId?.[trip.id] ?? null}
          deleteError={deleteErrorByTripId?.[trip.id] ?? null}
          onOpen={onOpenTrip}
          onDelete={onDeleteTrip}
          onCancelDelete={onCancelDeleteTrip}
        />
      ))}
    </section>
  );
}
