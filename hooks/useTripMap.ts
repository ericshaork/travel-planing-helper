import { useMemo, useState } from "react";

import type { ItineraryBlockView } from "@/lib/trip/itinerary-view";
import {
  findMatchingMapPoint,
  getItineraryBlockId,
  getMapPointBlockId,
} from "@/lib/trip/map-point-match";
import type { DayRouteInsight } from "@/lib/trip/route-insight";

interface UseTripMapOptions {
  activeCabinet?: {
    slots: Array<{
      items: ItineraryBlockView[];
    }>;
  };
  insight?: DayRouteInsight;
}

interface UseTripMapResult {
  activeMapPointId: string | null;
  activeItineraryBlockId: string | null;
  unmatchedBlockPlaceName: string | null;
  resolvedActiveMapPointId: string | null;
  resolvedActiveItineraryBlockId: string | null;
  clearMapSelection: () => void;
  selectMapPoint: (pointId: string) => void;
  selectItineraryBlock: (block: ItineraryBlockView) => void;
}

export function useTripMap({
  activeCabinet,
  insight,
}: UseTripMapOptions): UseTripMapResult {
  const [activeMapPointId, setActiveMapPointId] = useState<string | null>(null);
  const [activeItineraryBlockId, setActiveItineraryBlockId] = useState<string | null>(
    null,
  );
  const [unmatchedBlockPlaceName, setUnmatchedBlockPlaceName] = useState<
    string | null
  >(null);

  const resolvedActiveMapPointId =
    activeMapPointId &&
    insight?.mapPoints.some((point) => point.id === activeMapPointId)
      ? activeMapPointId
      : null;

  const resolvedActiveItineraryBlockId = useMemo(() => {
    if (
      activeItineraryBlockId &&
      activeCabinet?.slots.some((slot) =>
        slot.items.some(
          (block) => getItineraryBlockId(block) === activeItineraryBlockId,
        ),
      )
    ) {
      return activeItineraryBlockId;
    }

    if (!resolvedActiveMapPointId || !insight) {
      return null;
    }

    const activePoint = insight.mapPoints.find(
      (point) => point.id === resolvedActiveMapPointId,
    );

    return activePoint ? getMapPointBlockId(activePoint) : null;
  }, [
    activeCabinet,
    activeItineraryBlockId,
    insight,
    resolvedActiveMapPointId,
  ]);

  function clearMapSelection() {
    setActiveMapPointId(null);
    setActiveItineraryBlockId(null);
    setUnmatchedBlockPlaceName(null);
  }

  function selectMapPoint(pointId: string) {
    const selectedPoint = insight?.mapPoints.find((point) => point.id === pointId);

    setActiveMapPointId(pointId);
    setActiveItineraryBlockId(selectedPoint ? getMapPointBlockId(selectedPoint) : null);
    setUnmatchedBlockPlaceName(null);
  }

  function selectItineraryBlock(block: ItineraryBlockView) {
    const nextBlockId = getItineraryBlockId(block);
    const matchedPoint = insight
      ? findMatchingMapPoint(block, insight.mapPoints)
      : null;

    setActiveItineraryBlockId(nextBlockId);

    if (matchedPoint) {
      setActiveMapPointId(matchedPoint.id);
      setUnmatchedBlockPlaceName(null);
      return;
    }

    setActiveMapPointId(null);
    setUnmatchedBlockPlaceName(block.item.placeName);
  }

  return {
    activeMapPointId,
    activeItineraryBlockId,
    unmatchedBlockPlaceName,
    resolvedActiveMapPointId,
    resolvedActiveItineraryBlockId,
    clearMapSelection,
    selectMapPoint,
    selectItineraryBlock,
  };
}
