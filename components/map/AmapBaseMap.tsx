"use client";

import { useEffect, useRef, useState } from "react";

import { loadAmapSdk } from "../../lib/map/amap-loader";
import type {
  AmapLoadErrorCode,
  AMapGlobal,
  AMapMarkerInstance,
  AMapMapInstance,
} from "../../lib/map/amap-types";

import { MapErrorState } from "./MapErrorState";
import { MapLoading } from "./MapLoading";
import {
  clearAmapMarkerInstances,
  createAmapMarkerInstances,
  createAmapMapInstance,
  destroyAmapMapInstance,
  type AmapMarkerPoint,
  syncAmapViewport,
  syncAmapViewportForMarkerPoints,
  type MapCenter,
} from "./map-utils";

interface AmapBaseMapProps {
  center?: MapCenter;
  zoom?: number;
  className?: string;
  ariaLabel?: string;
  markerPoints?: AmapMarkerPoint[];
  fitToMarkers?: boolean;
  markerLabel?: boolean;
  unresolvedCount?: number;
  activePointId?: string | null;
  onMarkerClick?: (pointId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

type MapViewState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; code: AmapLoadErrorCode };

export function AmapBaseMap({
  center,
  zoom,
  className,
  ariaLabel = "基础地图预览",
  markerPoints = [],
  fitToMarkers = true,
  markerLabel = true,
  unresolvedCount = 0,
  activePointId = null,
  onMarkerClick,
  emptyTitle = "这一天暂时没有已确认点位",
  emptyDescription = "先看右侧点位列表和路线提醒，等地点核对清楚后再显示到地图上。",
}: AmapBaseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const amapRef = useRef<AMapGlobal | null>(null);
  const markersRef = useRef<AMapMarkerInstance[]>([]);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const [viewState, setViewState] = useState<MapViewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      setViewState({ status: "loading" });

      const result = await loadAmapSdk();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setViewState({ status: "error", code: result.error.code });
        return;
      }

      if (!containerRef.current) {
        setViewState({ status: "error", code: "amap_not_available" });
        return;
      }

      if (!mapRef.current) {
        const instance = createAmapMapInstance(result.amap, containerRef.current, {
          center: initialCenterRef.current,
          zoom: initialZoomRef.current,
        });

        if (!instance) {
          setViewState({ status: "error", code: "amap_not_available" });
          return;
        }

        mapRef.current = instance;
      }

      amapRef.current = result.amap;

      syncAmapViewport(mapRef.current, {
        center: initialCenterRef.current,
        zoom: initialZoomRef.current,
      });
      setViewState({ status: "ready" });
    }

    void initializeMap();

    return () => {
      cancelled = true;
      clearAmapMarkerInstances(markersRef.current);
      markersRef.current = [];
      destroyAmapMapInstance(mapRef.current);
      mapRef.current = null;
      amapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || viewState.status !== "ready") {
      return;
    }

    syncAmapViewport(mapRef.current, { center, zoom });
  }, [center, viewState.status, zoom]);

  useEffect(() => {
    if (!mapRef.current || !amapRef.current || viewState.status !== "ready") {
      return;
    }

    clearAmapMarkerInstances(markersRef.current);
    markersRef.current = createAmapMarkerInstances(
      amapRef.current,
      mapRef.current,
      markerPoints,
      {
        activePointId,
        markerLabel,
        onMarkerClick,
      },
    );

    return () => {
      clearAmapMarkerInstances(markersRef.current);
      markersRef.current = [];
    };
  }, [
    activePointId,
    markerLabel,
    markerPoints,
    onMarkerClick,
    viewState.status,
  ]);

  useEffect(() => {
    if (!mapRef.current || viewState.status !== "ready") {
      return;
    }

    syncAmapViewportForMarkerPoints(
      mapRef.current,
      markerPoints,
      markersRef.current,
      { center, zoom },
      fitToMarkers,
    );
  }, [center, fitToMarkers, markerPoints, viewState.status, zoom]);

  if (viewState.status === "loading") {
    return (
      <div
        className={`workspace-panel relative min-h-[280px] overflow-hidden ${className ?? ""}`.trim()}
      >
        <div
          ref={containerRef}
          aria-label={ariaLabel}
          role="img"
          className="h-full min-h-[280px] w-full opacity-0"
        />
        <div className="absolute inset-0">
          <MapLoading />
        </div>
      </div>
    );
  }

  if (viewState.status === "error") {
    return <MapErrorState code={viewState.code} className={className} />;
  }

  return (
    <div
      className={`workspace-panel relative min-h-[280px] overflow-hidden ${className ?? ""}`.trim()}
    >
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        role="img"
        className="h-full min-h-[280px] w-full"
      />
      {markerPoints.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="max-w-xs rounded-[22px] border border-[var(--line)] bg-[rgb(255_255_255_/_0.82)] px-4 py-3 shadow-[3px_3px_0_var(--sand-soft)] backdrop-blur-sm">
            <p className="text-sm font-semibold text-[var(--ink)]">{emptyTitle}</p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">
              {emptyDescription}
            </p>
          </div>
        </div>
      ) : null}
      {unresolvedCount > 0 ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[1]">
          <p className="rounded-[18px] border border-dashed border-[var(--clay)] bg-[rgb(255_246_238_/_0.94)] px-3 py-2.5 text-sm leading-6 text-[var(--clay-deep)] shadow-[2px_2px_0_var(--sand-soft)]">
            还有 {unresolvedCount} 个地点待确认，暂时没有显示在地图上。
          </p>
        </div>
      ) : null}
    </div>
  );
}
