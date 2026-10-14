"use client";

import { useEffect, useRef, useState } from "react";

import { loadAmapSdk } from "../../lib/map/amap-loader";
import type {
  AmapLoadErrorCode,
  AMapGlobal,
  AMapMapFeature,
  AMapMarkerInstance,
  AMapMapInstance,
  AMapPolygonInstance,
  AMapPolylineInstance,
  AMapTrafficLayerInstance,
} from "../../lib/map/amap-types";

import { MapErrorState } from "./MapErrorState";
import { MapLoading } from "./MapLoading";
import { AdminPmtilesOverlay } from "./AdminPmtilesOverlay";
import {
  clearAmapMarkerInstances,
  clearAmapPolygonInstances,
  clearAmapPolylineInstances,
  clearAmapTrafficLayer,
  createAmapAdministrativeBoundaryLayer,
  createAmapMarkerInstances,
  createAmapMapInstance,
  createAmapPolygonInstances,
  createAmapRegionLabelInstances,
  createAmapPolylineInstances,
  createAmapTrafficLayer,
  computeAdminRequiredTiles,
  createAdminLevelSwitchDebug,
  createAdminPanStabilityDebug,
  createAdminRenderLevelDebug,
  createAdminRenderDebugSnapshot,
  createAdminZoomSwitchDebug,
  createAdminLabelLifecycleDebug,
  diffAdminOverlayAdcodes,
  destroyAmapMapInstance,
  getAdminLoadedTileScopeKey,
  getAdminLoadedTileKeys,
  getAdminViewportReloadDelayMs,
  getAdminPrecisionDebugValue,
  getMapBoundsUnion,
  getAdministrativeBoundaryCacheKey,
  markAdminLoadedTiles,
  mergeAdministrativeBoundaryRegions,
  logAdminLabelLifecycle,
  hasAdministrativeBoundaryCache,
  parseAmapMapBounds,
  parseAmapMapCenter,
  resolveAdminGeometryDisplayMode,
  resolveAdminPrecisionTargetLevel,
  resolveAdminBoundaryLevel,
  resolveAdministrativeBoundaryQuery,
  resolveAdministrativeBoundaryReloadReason,
  shouldFetchAdminForViewport,
  shouldFetchAdminBounds,
  syncAmapViewport,
  syncAmapViewportForActivePoint,
  syncAmapViewportForMarkerPoints,
  type AmapAdministrativeBoundaryQuery,
  type AmapAdminPrecision,
  type AmapMarkerPoint,
  type AmapPolygonRegion,
  type AmapRegionLabel,
  type AmapPolylineRoute,
  type AmapAdministrativeBoundaryLayerHandle,
  type LoadedAdministrativeBoundaryRegion,
  type MapBounds,
  type MapCenter,
} from "./map-utils";

interface AmapBaseMapProps {
  center?: MapCenter;
  zoom?: number;
  mapStyle?: string;
  features?: AMapMapFeature[];
  showLabel?: boolean;
  className?: string;
  ariaLabel?: string;
  markerPoints?: AmapMarkerPoint[];
  polygonRegions?: AmapPolygonRegion[];
  regionLabels?: AmapRegionLabel[];
  polylineRoutes?: AmapPolylineRoute[];
  trafficLayerVisible?: boolean;
  trafficLayerOpacity?: number;
  adminBoundaryVisible?: boolean;
  adminBoundaryLabelVisible?: boolean;
  adminBoundaryFillOpacity?: number;
  adminBoundaryPrecision?: AmapAdminPrecision;
  adminBoundaryDestination?: string;
  adminPmtilesOverlayVisible?: boolean;
  enableAdminPmtilesOverlay?: boolean;
  enableHkMoSpecialRuntime?: boolean;
  adminPmtilesOnlyMode?: boolean;
  fitToMarkers?: boolean;
  markerLabel?: boolean;
  unresolvedCount?: number;
  activePointId?: string | null;
  onMarkerClick?: (pointId: string) => void;
  onPolygonClick?: (regionId: string) => void;
  onPolygonMouseEnter?: (regionId: string) => void;
  onPolygonMouseLeave?: (regionId: string) => void;
  onPolylineClick?: (routeId: string) => void;
  onZoomChange?: (zoom: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  showEmptyStateOverlay?: boolean;
  surfaceClassName?: string;
}

type MapViewState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; code: AmapLoadErrorCode };

export function AmapBaseMap({
  center,
  zoom,
  mapStyle,
  features,
  showLabel,
  className,
  ariaLabel = "行程地图",
  markerPoints = [],
  polygonRegions = [],
  regionLabels = [],
  polylineRoutes = [],
  trafficLayerVisible = false,
  trafficLayerOpacity = 0.45,
  adminBoundaryVisible = false,
  adminBoundaryLabelVisible = true,
  adminBoundaryFillOpacity,
  adminBoundaryPrecision = "auto",
  adminBoundaryDestination,
  adminPmtilesOverlayVisible = false,
  enableAdminPmtilesOverlay = adminPmtilesOverlayVisible,
  enableHkMoSpecialRuntime = false,
  adminPmtilesOnlyMode = false,
  fitToMarkers = true,
  markerLabel = true,
  unresolvedCount = 0,
  activePointId = null,
  onMarkerClick,
  onPolygonClick,
  onPolygonMouseEnter,
  onPolygonMouseLeave,
  onPolylineClick,
  onZoomChange,
  emptyTitle = "还没有地点",
  emptyDescription = "添加第一站后，地图会在这里标记路线和顺序。",
  showEmptyStateOverlay = true,
  surfaceClassName,
}: AmapBaseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const amapRef = useRef<AMapGlobal | null>(null);
  const markersRef = useRef<AMapMarkerInstance[]>([]);
  const regionLabelsRef = useRef<AMapMarkerInstance[]>([]);
  const polygonsRef = useRef<AMapPolygonInstance[]>([]);
  const polylinesRef = useRef<AMapPolylineInstance[]>([]);
  const trafficLayerRef = useRef<AMapTrafficLayerInstance | null>(null);
  const adminBoundaryRef =
    useRef<AmapAdministrativeBoundaryLayerHandle | null>(null);
  const pendingAdminBoundaryRef =
    useRef<AmapAdministrativeBoundaryLayerHandle | null>(null);
  const adminBoundaryQueryRef =
    useRef<AmapAdministrativeBoundaryQuery | null>(null);
  const desiredAdminBoundaryQueryRef =
    useRef<AmapAdministrativeBoundaryQuery | null>(null);
  const pendingAdminBoundaryQueryRef =
    useRef<AmapAdministrativeBoundaryQuery | null>(null);
  const adminBoundaryLoadedBoundsRef = useRef<Map<string, MapBounds[]>>(
    new Map(),
  );
  const adminBoundaryLoadedTileKeysRef = useRef<Map<string, Set<string>>>(
    new Map(),
  );
  const adminBoundaryFeatureCacheRef = useRef<
    Map<string, Map<string, LoadedAdministrativeBoundaryRegion>>
  >(new Map());
  const adminBoundaryRenderedAdcodesRef = useRef<string[]>([]);
  const adminBoundaryDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminBoundaryDelayedClearTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const adminBoundaryRequestIdRef = useRef(0);
  const isAdminViewportChangingRef = useRef(false);
  const adminDebugProbeRef = useRef<AMapPolygonInstance | null>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const initialMapStyleRef = useRef(mapStyle);
  const initialFeaturesRef = useRef(features);
  const initialShowLabelRef = useRef(showLabel);
  const lastZoomReportedFromMapRef = useRef<number | undefined>(undefined);
  const lastAdminZoomRef = useRef<number | null>(null);
  const lastAdminDecisionLogRef = useRef<Record<string, string>>({});
  const lastAdminLayerStyleRef = useRef<string | null>(null);
  const [viewState, setViewState] = useState<MapViewState>({ status: "loading" });
  const [adminBoundaryError, setAdminBoundaryError] = useState<string | null>(
    null,
  );

  const clearAdminBoundaryLayers = () => {
    adminBoundaryRequestIdRef.current += 1;
    pendingAdminBoundaryRef.current?.cancel();
    adminBoundaryRef.current?.cancel();
    pendingAdminBoundaryRef.current = null;
    adminBoundaryRef.current = null;
    pendingAdminBoundaryQueryRef.current = null;
    desiredAdminBoundaryQueryRef.current = null;
    adminBoundaryQueryRef.current = null;
    adminBoundaryLoadedBoundsRef.current.clear();
    adminBoundaryLoadedTileKeysRef.current.clear();
    adminBoundaryFeatureCacheRef.current.clear();
    adminBoundaryRenderedAdcodesRef.current = [];
    if (adminBoundaryDebounceTimerRef.current) {
      clearTimeout(adminBoundaryDebounceTimerRef.current);
      adminBoundaryDebounceTimerRef.current = null;
    }
    for (const timer of adminBoundaryDelayedClearTimersRef.current) {
      clearTimeout(timer);
    }
    adminBoundaryDelayedClearTimersRef.current = [];
  };

  const logAdminDecision = (message: string, ...details: unknown[]) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const signature = details.map(String).join("|");
    if (lastAdminDecisionLogRef.current[message] === signature) {
      return;
    }

    lastAdminDecisionLogRef.current[message] = signature;
    console.info(`[AdminLayer] ${message}`, ...details);
  };

  const logAdminViewport = (snapshot: {
    event?: string;
    reason: string;
    zoom: number | undefined;
    boundsSpan?: { longitudeSpan: number; latitudeSpan: number };
    expandedViewportBounds?: MapBounds;
    viewportClass?: string;
    targetLevel?: string;
    parentAdcode?: string;
    parentAdcodes?: string[];
    parentNames?: string[];
    parentName?: string;
    desiredTargetLevel?: string;
    desiredParentAdcode?: string;
    renderedTargetLevel?: string;
    renderedParentAdcode?: string;
    requestId?: number;
    cacheHit?: boolean;
    renderedPolygonCount?: number;
    renderedLabelCount?: number;
    ignoredStaleRequest?: boolean;
    labelAnchor?: "center";
    labelPositionSource?: string;
    classificationReason?: string;
    confidence?: number;
    tooManyParentsFallback?: boolean;
    intersectingProvinces?: Array<{
      adcode: string;
      name: string;
      intersectionRatio: number;
      centerInside: boolean;
      included?: boolean;
    }>;
  }) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.info("[MapStudio][AdminViewport]", snapshot);
  };

  const logAdminViewportClassify = (snapshot: {
    zoom: number | undefined;
    viewportBounds?: MapBounds | null;
    expandedViewportBounds?: MapBounds;
    viewportArea?: number;
    intersectingProvinces?: Array<{
      adcode: string;
      name: string;
      intersectionRatio: number;
      centerInside: boolean;
      included?: boolean;
    }>;
    dominantProvince?: string | null;
    targetLevel?: string;
    parentAdcode?: string;
    parentAdcodes?: string[];
    parentNames?: string[];
    reason?: string;
    confidence?: number;
    tooManyParentsFallback?: boolean;
  }) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.info("[MapStudio][AdminViewportClassify]", snapshot);
  };

  const logAdminDebug = (channel: string, snapshot: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.info(`[AdminDebug:${channel}]`, snapshot);
  };

  const getAdminQueryKey = (
    query: Pick<AmapAdministrativeBoundaryQuery, "adcode" | "targetLevel" | "parentAdcodes"> | null,
  ) => (query ? getAdministrativeBoundaryCacheKey(query) : null);

  const getCurrentAdminViewportSnapshot = () => {
    const map = mapRef.current;

    if (!map) {
      return null;
    }

    const currentZoom = map.getZoom?.() ?? zoom ?? initialZoomRef.current ?? 4;
    const currentCenter = parseAmapMapCenter(map.getCenter?.()) ?? center;
    const currentBounds = parseAmapMapBounds(map.getBounds?.());
    const previousQuery = adminBoundaryQueryRef.current;
    const levelResolution = resolveAdminBoundaryLevel(
      currentZoom,
      { bounds: currentBounds, center: currentCenter },
      undefined,
      previousQuery?.targetLevel ?? null,
    );
    const nextQuery = resolveAdministrativeBoundaryQuery({
      zoom: currentZoom,
      center: currentCenter,
      bounds: currentBounds,
      previousLevel: previousQuery?.targetLevel ?? null,
      adminPrecision: adminBoundaryPrecision,
    });
    const resolvedTargetLevel = resolveAdminPrecisionTargetLevel(
      adminBoundaryPrecision,
      levelResolution.targetLevel,
    );

    return {
      currentZoom,
      currentCenter,
      currentBounds,
      previousQuery,
      levelResolution: {
        ...levelResolution,
        targetLevel: resolvedTargetLevel,
      },
      nextQuery,
      cacheHit: hasAdministrativeBoundaryCache(nextQuery),
    };
  };

  const classifyAdminViewport = (input: { event: string }) => {
    const snapshot = getCurrentAdminViewportSnapshot();

    if (!snapshot) {
      return null;
    }

    const previousDesiredKey = getAdminQueryKey(desiredAdminBoundaryQueryRef.current);
    const nextDesiredKey = getAdminQueryKey(snapshot.nextQuery);
    const previousDesiredQuery = desiredAdminBoundaryQueryRef.current;
    desiredAdminBoundaryQueryRef.current = snapshot.nextQuery;

    if (previousDesiredKey && previousDesiredKey !== nextDesiredKey) {
      adminBoundaryRequestIdRef.current += 1;
      pendingAdminBoundaryRef.current?.cancel();
      pendingAdminBoundaryRef.current = null;
      pendingAdminBoundaryQueryRef.current = null;
      logAdminDebug("LevelSwitch", createAdminLevelSwitchDebug({
        previousLevel: previousDesiredQuery?.targetLevel ?? null,
        nextLevel: snapshot.nextQuery.targetLevel,
        switchReason:
          previousDesiredQuery?.targetLevel !== snapshot.nextQuery.targetLevel
            ? "target_level_changed"
            : "scope_changed",
        pendingRequestCancelled: true,
      }));
    } else {
      logAdminDebug("LevelSwitch", createAdminLevelSwitchDebug({
        previousLevel: previousDesiredQuery?.targetLevel ?? null,
        nextLevel: snapshot.nextQuery.targetLevel,
        switchReason: previousDesiredKey ? "same_scope" : "initial_scope",
        pendingRequestCancelled: false,
      }));
    }

    logAdminViewport({
      event: input.event,
      reason: input.event,
      zoom: snapshot.currentZoom,
      boundsSpan: snapshot.levelResolution.boundsSpan,
      expandedViewportBounds: snapshot.levelResolution.expandedViewportBounds,
      viewportClass: snapshot.levelResolution.viewportClass,
      targetLevel: snapshot.nextQuery.targetLevel,
      parentAdcode: snapshot.nextQuery.adcode,
      parentAdcodes: snapshot.nextQuery.parentAdcodes ?? [snapshot.nextQuery.adcode],
      parentNames: snapshot.nextQuery.parentNames ?? [snapshot.nextQuery.keyword],
      parentName: snapshot.nextQuery.keyword,
      desiredTargetLevel: snapshot.nextQuery.targetLevel,
      desiredParentAdcode: snapshot.nextQuery.adcode,
      cacheHit: snapshot.cacheHit,
      ignoredStaleRequest: false,
      classificationReason: snapshot.levelResolution.classificationReason,
      confidence: snapshot.levelResolution.confidence,
      tooManyParentsFallback: snapshot.levelResolution.tooManyParentsFallback,
      intersectingProvinces: snapshot.levelResolution.intersectingProvinces,
    });
    logAdminViewportClassify({
      zoom: snapshot.currentZoom,
      viewportBounds: snapshot.currentBounds,
      expandedViewportBounds: snapshot.levelResolution.expandedViewportBounds,
      viewportArea: snapshot.currentBounds
        ? (snapshot.currentBounds.maxLat - snapshot.currentBounds.minLat) *
          (snapshot.currentBounds.maxLng - snapshot.currentBounds.minLng)
        : undefined,
      intersectingProvinces: snapshot.levelResolution.intersectingProvinces,
      dominantProvince:
        snapshot.nextQuery.targetLevel === "city" &&
        (snapshot.nextQuery.parentAdcodes?.length ?? 1) === 1
          ? snapshot.nextQuery.adcode
          : null,
      targetLevel: snapshot.nextQuery.targetLevel,
      parentAdcode: snapshot.nextQuery.adcode,
      parentAdcodes: snapshot.nextQuery.parentAdcodes ?? [snapshot.nextQuery.adcode],
      parentNames: snapshot.nextQuery.parentNames ?? [snapshot.nextQuery.keyword],
      reason: snapshot.levelResolution.classificationReason,
      confidence: snapshot.levelResolution.confidence,
      tooManyParentsFallback: snapshot.levelResolution.tooManyParentsFallback,
    });
    logAdminDebug("LevelResolve", {
      zoom: snapshot.currentZoom,
      adminPrecision: getAdminPrecisionDebugValue(adminBoundaryPrecision),
      autoTargetLevel: resolveAdminBoundaryLevel(
        snapshot.currentZoom,
        { bounds: snapshot.currentBounds, center: snapshot.currentCenter },
        undefined,
        snapshot.previousQuery?.targetLevel ?? null,
      ).targetLevel,
      resolvedTargetLevel: snapshot.nextQuery.targetLevel,
      reason:
        adminBoundaryPrecision && adminBoundaryPrecision !== "auto"
          ? "manual_precision"
          : snapshot.levelResolution.classificationReason ?? "auto",
    });
    logAdminDebug("ZoomSwitch", createAdminZoomSwitchDebug({
      previousLevel: previousDesiredQuery?.targetLevel ?? null,
      nextLevel: snapshot.nextQuery.targetLevel,
      cacheHit: snapshot.cacheHit,
      pendingRequestCancelled:
        previousDesiredKey !== null && previousDesiredKey !== nextDesiredKey,
    }));
    logAdminDebug("Viewport", {
      zoom: snapshot.currentZoom,
      targetLevel: snapshot.nextQuery.targetLevel,
      adminPrecision: getAdminPrecisionDebugValue(adminBoundaryPrecision),
      viewportBbox: snapshot.currentBounds ?? null,
      expandedBbox:
        snapshot.nextQuery.viewportBounds ??
        snapshot.levelResolution.expandedViewportBounds ??
        null,
    });

    return snapshot;
  };

  const requestAdminBoundaryLayer = (input?: {
    manualRefresh?: boolean;
    reason?: string;
  }) => {
    const map = mapRef.current;
    const amap = amapRef.current;

    if (!map || !amap || viewState.status !== "ready") {
      return;
    }

    if (!adminBoundaryVisible || adminPmtilesOnlyMode) {
      let staleLabelCleanupCount =
        adminBoundaryRef.current?.clearLabels() ?? 0;
      staleLabelCleanupCount += pendingAdminBoundaryRef.current?.clearLabels() ?? 0;
      clearAdminBoundaryLayers();
      setAdminBoundaryError(null);
      if (adminPmtilesOnlyMode) {
        logAdminLabelLifecycle(createAdminLabelLifecycleDebug({
          renderPassId: adminBoundaryRequestIdRef.current,
          targetLevel: adminBoundaryQueryRef.current?.targetLevel ?? null,
          labelCreatedCount: 0,
          labelRemovedCount: staleLabelCleanupCount,
          pmtilesOnly: true,
          skippedByPmtilesOnly: true,
          staleLabelCleanupCount,
        }));
      }
      return;
    }

    const snapshot = classifyAdminViewport({
      event: input?.reason ?? "request",
    });

    if (!snapshot) {
      return;
    }

    const {
      currentZoom,
      currentCenter,
      currentBounds,
      previousQuery,
      levelResolution,
      nextQuery,
      cacheHit,
    } = snapshot;
    const nextCacheKey = getAdministrativeBoundaryCacheKey(nextQuery);
    const coverageViewport = nextQuery.viewportBounds ?? currentBounds;
    const displayMode = resolveAdminGeometryDisplayMode();
    const adminPrecision = getAdminPrecisionDebugValue(adminBoundaryPrecision);
    const adminTileScope = {
      targetLevel: nextQuery.targetLevel,
      displayMode,
      adminPrecision,
    };
    const adminTileScopeKey = getAdminLoadedTileScopeKey(adminTileScope);
    const scopedLoadedBounds =
      adminBoundaryLoadedBoundsRef.current.get(adminTileScopeKey) ?? [];
    const loadedBoundsUnion = getMapBoundsUnion(scopedLoadedBounds);
    const shouldFetchViewport = shouldFetchAdminBounds(
      coverageViewport,
      scopedLoadedBounds,
      nextQuery.targetLevel,
      { bufferRatio: 0 },
    );
    const pendingCacheKey = pendingAdminBoundaryQueryRef.current
      ? getAdministrativeBoundaryCacheKey(pendingAdminBoundaryQueryRef.current)
      : null;
    const baseReloadReason = resolveAdministrativeBoundaryReloadReason({
      previousQuery,
      nextQuery,
      manualRefresh: input?.manualRefresh,
    });
    const requiredTileKeys = computeAdminRequiredTiles({
      bounds: coverageViewport,
      level: nextQuery.targetLevel,
    });
    const cachedTileKeys = getAdminLoadedTileKeys(
      adminBoundaryLoadedTileKeysRef.current,
      adminTileScope,
    );
    const fetchDebug = shouldFetchAdminForViewport({
      currentViewport: coverageViewport,
      loadedBounds: scopedLoadedBounds,
      targetLevel: nextQuery.targetLevel,
      requiredTileKeys,
      cachedTileKeys,
      reloadReason: baseReloadReason,
    });
    const fetchReason = fetchDebug.fetchReason;
    const shouldFetchAdmin = fetchDebug.shouldFetch;

    if (
      typeof currentZoom === "number" &&
      Number.isFinite(currentZoom) &&
      lastAdminZoomRef.current !== currentZoom
    ) {
      if (process.env.NODE_ENV !== "production" && lastAdminZoomRef.current !== null) {
        console.info(
          "[AdminLayer] zoom changed:",
          lastAdminZoomRef.current,
          "->",
          currentZoom,
        );
      }
      lastAdminZoomRef.current = currentZoom;
    }

    logAdminDecision("destination:", adminBoundaryDestination ?? ariaLabel);
    logAdminDecision("zoom", currentZoom);
    if (levelResolution.boundsSpan) {
      logAdminDecision(
        "bounds span",
        `${levelResolution.boundsSpan.longitudeSpan.toFixed(3)}x${levelResolution.boundsSpan.latitudeSpan.toFixed(3)}`,
      );
    }
    logAdminDecision("center admin guess", levelResolution.centerAdminGuess ?? "unknown");
    logAdminDecision("resolved level:", nextQuery.targetLevel);
    logAdminDecision(
      "parent scope:",
      (nextQuery.parentAdcodes ?? [nextQuery.adcode]).join(","),
    );
    if (levelResolution.downgradeReason) {
      logAdminDecision("downgrade reason:", levelResolution.downgradeReason);
    }
    if (process.env.NODE_ENV !== "production") {
      console.info("[AdminCoverage]", {
        targetLevel: nextQuery.targetLevel,
        viewport: currentBounds,
        expandedViewport: coverageViewport,
        loadedBoundsUnion,
        loadedBoundsCount: scopedLoadedBounds.length,
        missingCoverage: shouldFetchViewport,
        shouldFetch: shouldFetchAdmin,
        fetchReason: fetchReason ?? "covered",
        denseProtectionReason: null,
      });
    }
    logAdminDebug("Tiles", {
      level: nextQuery.targetLevel,
      displayMode,
      adminPrecision,
      tileScopeKey: adminTileScopeKey,
      requiredTileKeys: fetchDebug.requiredTileKeys,
      cachedTileKeys: fetchDebug.cachedTileKeys,
      missingTileKeys: fetchDebug.missingTileKeys,
      coverageDecision: fetchDebug.coverageDecision,
      legacyViewportTileKey: nextQuery.viewportTileKey ?? null,
    });
    logAdminDebug("Fetch", {
      shouldFetch: shouldFetchAdmin,
      helperShouldFetch: fetchDebug.shouldFetch,
      fetchReason,
      helperFetchReason: fetchDebug.fetchReason,
      skippedReason: shouldFetchAdmin ? null : fetchDebug.skippedReason,
      requestId: null,
      targetLevel: nextQuery.targetLevel,
      requestLevel: nextQuery.targetLevel,
      requestBbox: coverageViewport ?? null,
      tileScopeKey: adminTileScopeKey,
      requiredTileKeys: fetchDebug.requiredTileKeys,
      loadedTileKeys: fetchDebug.cachedTileKeys,
      missingTileKeys: fetchDebug.missingTileKeys,
      responseCount: null,
    });
    logAdminDebug("PanStability", createAdminPanStabilityDebug({
      targetLevel: nextQuery.targetLevel,
      requiredTileKeys: fetchDebug.requiredTileKeys,
      cachedTileKeys: fetchDebug.cachedTileKeys,
      missingTileKeys: fetchDebug.missingTileKeys,
      shouldFetch: shouldFetchAdmin,
      fetchReason,
      skippedReason: shouldFetchAdmin ? null : fetchDebug.skippedReason,
    }));

    if (!shouldFetchAdmin) {
      logAdminViewport({
        reason: input?.reason ?? "unchanged",
        zoom: currentZoom,
        boundsSpan: levelResolution.boundsSpan,
        viewportClass: levelResolution.viewportClass,
        targetLevel: nextQuery.targetLevel,
        parentAdcode: nextQuery.adcode,
        parentAdcodes: nextQuery.parentAdcodes ?? [nextQuery.adcode],
        parentNames: nextQuery.parentNames ?? [nextQuery.keyword],
        parentName: nextQuery.keyword,
        cacheHit,
        ignoredStaleRequest: false,
      });
      logAdminDecision("skipped reload: same level and same parent", nextCacheKey);
      logAdminDebug("Fetch", {
        shouldFetch: false,
        helperShouldFetch: fetchDebug.shouldFetch,
        fetchReason: null,
        helperFetchReason: fetchDebug.fetchReason,
        skippedReason: fetchDebug.skippedReason ?? "covered",
        requestId: null,
        targetLevel: nextQuery.targetLevel,
        requestLevel: nextQuery.targetLevel,
        requestBbox: coverageViewport ?? null,
        tileScopeKey: adminTileScopeKey,
        requiredTileKeys: fetchDebug.requiredTileKeys,
        loadedTileKeys: fetchDebug.cachedTileKeys,
        missingTileKeys: fetchDebug.missingTileKeys,
        responseCount: null,
      });
      return;
    }

    if (
      pendingCacheKey === nextCacheKey &&
      fetchDebug.missingTileKeys.length === 0
    ) {
      logAdminViewport({
        reason: input?.reason ?? "pending-same-scope",
        zoom: currentZoom,
        boundsSpan: levelResolution.boundsSpan,
        viewportClass: levelResolution.viewportClass,
        targetLevel: nextQuery.targetLevel,
        parentAdcode: nextQuery.adcode,
        parentAdcodes: nextQuery.parentAdcodes ?? [nextQuery.adcode],
        parentNames: nextQuery.parentNames ?? [nextQuery.keyword],
        parentName: nextQuery.keyword,
        cacheHit,
        ignoredStaleRequest: false,
      });
      logAdminDecision("skipped reload: same level and same parent", nextCacheKey);
      logAdminDebug("Fetch", {
        shouldFetch: false,
        helperShouldFetch: fetchDebug.shouldFetch,
        fetchReason: null,
        helperFetchReason: fetchDebug.fetchReason,
        skippedReason: "pending_same_scope",
        requestId: null,
        targetLevel: nextQuery.targetLevel,
        requestLevel: nextQuery.targetLevel,
        requestBbox: coverageViewport ?? null,
        tileScopeKey: adminTileScopeKey,
        requiredTileKeys: fetchDebug.requiredTileKeys,
        loadedTileKeys: fetchDebug.cachedTileKeys,
        missingTileKeys: fetchDebug.missingTileKeys,
        responseCount: null,
      });
      return;
    }

    const requestId = adminBoundaryRequestIdRef.current + 1;
    adminBoundaryRequestIdRef.current = requestId;
    isAdminViewportChangingRef.current = false;
    pendingAdminBoundaryRef.current?.cancel();
    pendingAdminBoundaryRef.current = null;
    pendingAdminBoundaryQueryRef.current = nextQuery;
    setAdminBoundaryError(null);

    if (process.env.NODE_ENV !== "production") {
      console.info("[AdminLayer] reload reason:", fetchReason);
    }
    logAdminViewport({
      reason: input?.reason ?? fetchReason ?? "viewport_changed",
      zoom: currentZoom,
      boundsSpan: levelResolution.boundsSpan,
      viewportClass: levelResolution.viewportClass,
      targetLevel: nextQuery.targetLevel,
      parentAdcode: nextQuery.adcode,
      parentAdcodes: nextQuery.parentAdcodes ?? [nextQuery.adcode],
      parentNames: nextQuery.parentNames ?? [nextQuery.keyword],
      parentName: nextQuery.keyword,
      requestId,
      cacheHit,
      ignoredStaleRequest: false,
    });
    logAdminDebug("Fetch", {
      shouldFetch: true,
      helperShouldFetch: fetchDebug.shouldFetch,
      fetchReason,
      helperFetchReason: fetchDebug.fetchReason,
      skippedReason: null,
      requestId,
      targetLevel: nextQuery.targetLevel,
      requestLevel: nextQuery.targetLevel,
      requestBbox: coverageViewport ?? null,
      tileScopeKey: adminTileScopeKey,
      requiredTileKeys: fetchDebug.requiredTileKeys,
      loadedTileKeys: fetchDebug.cachedTileKeys,
      missingTileKeys: fetchDebug.missingTileKeys,
      responseCount: null,
    });

    let nextLayer: AmapAdministrativeBoundaryLayerHandle | null = null;
    nextLayer = createAmapAdministrativeBoundaryLayer(amap, map, {
      requestId,
      query: nextQuery,
      center: currentCenter,
      bounds: currentBounds,
      zoom: currentZoom,
      mergeRegions: Array.from(
        adminBoundaryFeatureCacheRef.current.get(adminTileScopeKey)?.values() ?? [],
      ),
      adminGeometryDisplayMode: displayMode,
      adminPrecision,
      fillOpacity: adminBoundaryFillOpacity,
      labelVisible: adminBoundaryLabelVisible,
      isStale: () =>
        requestId !== adminBoundaryRequestIdRef.current ||
        isAdminViewportChangingRef.current ||
        getAdminQueryKey(desiredAdminBoundaryQueryRef.current) !== nextCacheKey,
      onStale: (staleRequestId) => {
        if (pendingAdminBoundaryRef.current === nextLayer) {
          pendingAdminBoundaryRef.current = null;
          pendingAdminBoundaryQueryRef.current = null;
        }
        logAdminViewport({
          reason: input?.reason ?? fetchReason ?? "stale",
          zoom: currentZoom,
          boundsSpan: levelResolution.boundsSpan,
          viewportClass: levelResolution.viewportClass,
          targetLevel: nextQuery.targetLevel,
          parentAdcode: nextQuery.adcode,
          parentAdcodes: nextQuery.parentAdcodes ?? [nextQuery.adcode],
          parentNames: nextQuery.parentNames ?? [nextQuery.keyword],
          parentName: nextQuery.keyword,
          requestId: staleRequestId,
          cacheHit,
          ignoredStaleRequest: true,
        });
        logAdminDebug("Render", createAdminRenderDebugSnapshot({
          requestId: staleRequestId,
          currentRequestId: adminBoundaryRequestIdRef.current,
          stale: true,
          rawFeatureCount: 0,
          visibleFeatureCount: 0,
          polygonOverlayCount: 0,
          labelCount: 0,
        }));
        logAdminDebug("ZoomSwitch", createAdminZoomSwitchDebug({
          previousLevel: adminBoundaryQueryRef.current?.targetLevel ?? null,
          nextLevel: desiredAdminBoundaryQueryRef.current?.targetLevel ?? nextQuery.targetLevel,
          requestId: staleRequestId,
          currentRequestId: adminBoundaryRequestIdRef.current,
          requestLevel: nextQuery.targetLevel,
          desiredLevel: desiredAdminBoundaryQueryRef.current?.targetLevel,
          requestScopeKey: nextCacheKey,
          desiredScopeKey: getAdminQueryKey(desiredAdminBoundaryQueryRef.current),
          pendingRequestCancelled: true,
        }));
      },
      onError: (message) => {
        if (requestId !== adminBoundaryRequestIdRef.current) {
          return;
        }

        if (pendingAdminBoundaryRef.current !== nextLayer) {
          return;
        }

        pendingAdminBoundaryRef.current = null;
        pendingAdminBoundaryQueryRef.current = null;
        setAdminBoundaryError(message);
      },
      onLoaded: (result, meta) => {
        if (requestId !== adminBoundaryRequestIdRef.current) {
          return;
        }

        if (getAdminQueryKey(desiredAdminBoundaryQueryRef.current) !== nextCacheKey) {
          logAdminViewport({
            event: "render-stale-desired-mismatch",
            reason: input?.reason ?? fetchReason ?? "stale",
            zoom: currentZoom,
            boundsSpan: levelResolution.boundsSpan,
            viewportClass: levelResolution.viewportClass,
            targetLevel: nextQuery.targetLevel,
            parentAdcode: nextQuery.adcode,
            parentAdcodes: nextQuery.parentAdcodes ?? [nextQuery.adcode],
            parentNames: nextQuery.parentNames ?? [nextQuery.keyword],
            parentName: nextQuery.keyword,
            requestId,
            cacheHit,
            ignoredStaleRequest: true,
          });
          logAdminDebug("Render", createAdminRenderDebugSnapshot({
            requestId,
            currentRequestId: adminBoundaryRequestIdRef.current,
            stale: true,
            rawFeatureCount: 0,
            visibleFeatureCount: 0,
            polygonOverlayCount: 0,
            labelCount: 0,
          }));
          logAdminDebug("ZoomSwitch", createAdminZoomSwitchDebug({
            previousLevel: adminBoundaryQueryRef.current?.targetLevel ?? null,
            nextLevel: desiredAdminBoundaryQueryRef.current?.targetLevel ?? nextQuery.targetLevel,
            requestId,
            currentRequestId: adminBoundaryRequestIdRef.current,
            requestLevel: nextQuery.targetLevel,
            desiredLevel: desiredAdminBoundaryQueryRef.current?.targetLevel,
            requestScopeKey: nextCacheKey,
            desiredScopeKey: getAdminQueryKey(desiredAdminBoundaryQueryRef.current),
            pendingRequestCancelled: true,
          }));
          return;
        }

        if (pendingAdminBoundaryRef.current !== nextLayer) {
          return;
        }

        const previousLayer = adminBoundaryRef.current;
        adminBoundaryRef.current = nextLayer;
        adminBoundaryQueryRef.current = result.query;
        const loadedBounds = result.query.viewportBounds ?? currentBounds ?? null;
        if (loadedBounds) {
          adminBoundaryLoadedBoundsRef.current.set(adminTileScopeKey, [
            ...scopedLoadedBounds,
            loadedBounds,
          ].slice(-8));
        }
        const loadedTileKeys = markAdminLoadedTiles(
          adminBoundaryLoadedTileKeysRef.current,
          adminTileScope,
          requiredTileKeys,
        );
        const scopedFeatureCache =
          adminBoundaryFeatureCacheRef.current.get(adminTileScopeKey) ??
          new Map<string, LoadedAdministrativeBoundaryRegion>();
        for (const region of mergeAdministrativeBoundaryRegions(
          scopedFeatureCache.values(),
          result.regions,
        )) {
          scopedFeatureCache.set(region.adcode ?? region.id, region);
        }
        adminBoundaryFeatureCacheRef.current.set(
          adminTileScopeKey,
          scopedFeatureCache,
        );
        pendingAdminBoundaryRef.current = null;
        pendingAdminBoundaryQueryRef.current = null;
        setAdminBoundaryError(null);
        const overlayDiff = diffAdminOverlayAdcodes(
          adminBoundaryRenderedAdcodesRef.current,
          meta?.renderedAdcodes ?? [],
        );
        adminBoundaryRenderedAdcodesRef.current = meta?.renderedAdcodes ?? [];
        if (previousLayer && previousLayer !== nextLayer) {
          const levelSwitch = previousQuery?.targetLevel !== result.query.targetLevel;
          const previousCounts = previousLayer.getOverlayCounts();
          const removedOldLabelCount = previousLayer.clearLabels();
          const delayMs =
            createAdminZoomSwitchDebug({
              previousLevel: previousQuery?.targetLevel ?? null,
              nextLevel: result.query.targetLevel,
            }).oldOverlayRetentionMs;
          logAdminLabelLifecycle(createAdminLabelLifecycleDebug({
            renderPassId: requestId,
            targetLevel: result.query.targetLevel,
            labelCreatedCount: meta?.labelCount ?? 0,
            labelRemovedCount: removedOldLabelCount,
            labelRetainedCount: 0,
            staleLabelCleanupCount: removedOldLabelCount,
          }));
          if (process.env.NODE_ENV !== "production") {
            console.info("[AdminRenderOverlayAudit]", {
              event: "old-overlay-retention",
              requestId,
              targetLevel: result.query.targetLevel,
              previousLevel: previousQuery?.targetLevel ?? null,
              retainedOldOverlayCount: 1,
              retainedOldLayerCount: 1,
              retainedOldPolygonCount: previousCounts.polygons,
              retainedOldBoundaryLineCount: previousCounts.boundaryLines,
              retainedOldLabelCount: 0,
              removedOldLabelCount,
              cleanupScheduled: true,
              cleanupExecuted: false,
              cleanupDelayMs: delayMs,
              levelSwitch,
            });
          }
          const timer = setTimeout(() => {
            previousLayer.clear();
            adminBoundaryDelayedClearTimersRef.current =
              adminBoundaryDelayedClearTimersRef.current.filter((item) => item !== timer);
            if (process.env.NODE_ENV !== "production") {
              console.info("[AdminRenderOverlayAudit]", {
                event: "old-overlay-cleanup",
                requestId,
                targetLevel: result.query.targetLevel,
                previousLevel: previousQuery?.targetLevel ?? null,
                retainedOldOverlayCount: 0,
                retainedOldLayerCount: 0,
                retainedOldLabelCount: 0,
                cleanupScheduled: true,
                cleanupExecuted: true,
                cleanupDelayMs: delayMs,
                levelSwitch,
              });
            }
          }, delayMs);
          adminBoundaryDelayedClearTimersRef.current.push(timer);
        }
        if (process.env.NODE_ENV !== "production") {
          console.info("[AdminPerf]", {
            targetLevel: result.query.targetLevel,
            viewportTileKey: result.query.viewportTileKey,
            loadedBounds: getMapBoundsUnion(
              adminBoundaryLoadedBoundsRef.current.get(adminTileScopeKey) ?? [],
            ),
            loadedTileKeys,
            shouldFetch: shouldFetchAdmin,
            keptOverlayCount: overlayDiff.keep.length,
            addedOverlayCount: overlayDiff.add.length,
            removedOverlayCount: overlayDiff.remove.length,
            staleRequestIgnored: false,
          });
        }
        logAdminViewport({
          event: "rendered",
          reason: input?.reason ?? fetchReason ?? "viewport_changed",
          zoom: currentZoom,
          boundsSpan: levelResolution.boundsSpan,
          viewportClass: levelResolution.viewportClass,
          targetLevel: nextQuery.targetLevel,
          parentAdcode: nextQuery.adcode,
          parentAdcodes: nextQuery.parentAdcodes ?? [nextQuery.adcode],
          parentNames: nextQuery.parentNames ?? [nextQuery.keyword],
          parentName: result.query.keyword,
          desiredTargetLevel: desiredAdminBoundaryQueryRef.current?.targetLevel,
          desiredParentAdcode: desiredAdminBoundaryQueryRef.current?.adcode,
          renderedTargetLevel: result.query.targetLevel,
          renderedParentAdcode: result.query.adcode,
          requestId: meta?.requestId ?? requestId,
          cacheHit,
          renderedPolygonCount: meta?.polygonCount,
          renderedLabelCount: meta?.labelCount,
          ignoredStaleRequest: false,
          labelAnchor: "center",
          labelPositionSource:
            result.regions.find((region) => region.labelPositionSource)
              ?.labelPositionSource ?? "fallback",
        });
        logAdminDebug("Fetch", {
          shouldFetch: true,
          helperShouldFetch: fetchDebug.shouldFetch,
          fetchReason,
          helperFetchReason: fetchDebug.fetchReason,
          skippedReason: null,
          requestId: meta?.requestId ?? requestId,
          targetLevel: result.query.targetLevel,
          requestLevel: result.query.targetLevel,
          requestBbox: result.query.viewportBounds ?? currentBounds ?? null,
          tileScopeKey: adminTileScopeKey,
          requiredTileKeys: fetchDebug.requiredTileKeys,
          loadedTileKeys,
          missingTileKeys: fetchDebug.missingTileKeys,
          responseCount: result.regions.length,
        });
        logAdminDebug("Render", createAdminRenderDebugSnapshot({
          requestId: meta?.requestId ?? requestId,
          currentRequestId: adminBoundaryRequestIdRef.current,
          ...createAdminRenderLevelDebug({
            targetLevel: result.query.targetLevel,
            regions: result.regions,
          }),
          rawFeatureCount: result.regions.length,
          visibleFeatureCount: meta?.visibleFeatureCount ?? meta?.renderedAdcodes?.length ?? 0,
          polygonOverlayCount: meta?.polygonOverlayCount ?? meta?.polygonCount ?? 0,
          labelCount: meta?.labelCount ?? 0,
          denseProtectionTriggered: meta?.denseProtectionTriggered,
          denseProtectionReason: meta?.denseProtectionReason,
        }));
      },
    });
    pendingAdminBoundaryRef.current = nextLayer;
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[AdminRuntime] MapStudio mounted");
    }
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" ||
      viewState.status !== "ready" ||
      !mapRef.current
    ) {
      return;
    }

    const debugWindow = window as Window & {
      __wanderlyAmapMap?: AMapMapInstance;
    };
    debugWindow.__wanderlyAmapMap = mapRef.current;

    return () => {
      if (debugWindow.__wanderlyAmapMap === mapRef.current) {
        delete debugWindow.__wanderlyAmapMap;
      }
    };
  }, [viewState.status]);

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
          mapStyle: initialMapStyleRef.current,
          features: initialFeaturesRef.current,
          showLabel: initialShowLabelRef.current,
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
      if (initialMapStyleRef.current) {
        mapRef.current.setMapStyle?.(initialMapStyleRef.current);
      }
      setViewState({ status: "ready" });
    }

    void initializeMap();

    return () => {
      cancelled = true;
      clearAmapMarkerInstances(markersRef.current);
      clearAmapMarkerInstances(regionLabelsRef.current);
      clearAmapPolygonInstances(polygonsRef.current);
      clearAmapPolylineInstances(polylinesRef.current);
      clearAmapTrafficLayer(trafficLayerRef.current);
      clearAdminBoundaryLayers();
      clearAmapPolygonInstances(
        adminDebugProbeRef.current ? [adminDebugProbeRef.current] : [],
      );
      markersRef.current = [];
      regionLabelsRef.current = [];
      polygonsRef.current = [];
      polylinesRef.current = [];
      trafficLayerRef.current = null;
      adminDebugProbeRef.current = null;
      destroyAmapMapInstance(mapRef.current);
      mapRef.current = null;
      amapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || viewState.status !== "ready") {
      return;
    }

    if (
      typeof zoom === "number" &&
      lastZoomReportedFromMapRef.current === zoom
    ) {
      lastZoomReportedFromMapRef.current = undefined;
      return;
    }

    syncAmapViewport(mapRef.current, { center, zoom });
  }, [center, viewState.status, zoom]);

  useEffect(() => {
    if (
      !mapRef.current ||
      viewState.status !== "ready" ||
      (!onZoomChange && !adminBoundaryVisible)
    ) {
      return;
    }

    const map = mapRef.current;
    const handleZoomChanged = () => {
      classifyAdminViewport({ event: "zoomchange" });
    };
    const handleViewChanging = () => {
      isAdminViewportChangingRef.current = true;
      adminBoundaryRequestIdRef.current += 1;
      pendingAdminBoundaryRef.current?.cancel();
      pendingAdminBoundaryRef.current = null;
      pendingAdminBoundaryQueryRef.current = null;
    };
    const handleViewChanged = () => {
      isAdminViewportChangingRef.current = false;
      const nextZoom = map.getZoom?.();

      if (typeof nextZoom === "number" && Number.isFinite(nextZoom)) {
        lastZoomReportedFromMapRef.current = nextZoom;
        onZoomChange?.(nextZoom);
      }
      if (adminBoundaryDebounceTimerRef.current) {
        clearTimeout(adminBoundaryDebounceTimerRef.current);
      }
      const snapshot = adminBoundaryVisible
        ? getCurrentAdminViewportSnapshot()
        : null;
      const requiredTileKeys = snapshot
        ? computeAdminRequiredTiles({
            bounds: snapshot.nextQuery.viewportBounds ?? snapshot.currentBounds,
            level: snapshot.nextQuery.targetLevel,
          })
        : [];
      const displayMode = resolveAdminGeometryDisplayMode();
      const adminPrecision = getAdminPrecisionDebugValue(adminBoundaryPrecision);
      const cachedTileKeys = snapshot
        ? getAdminLoadedTileKeys(adminBoundaryLoadedTileKeysRef.current, {
            targetLevel: snapshot.nextQuery.targetLevel,
            displayMode,
            adminPrecision,
          })
        : [];
      const missingTileKeys = requiredTileKeys.filter(
        (tileKey) => !cachedTileKeys.includes(tileKey),
      );
      const levelChanged = Boolean(
        snapshot?.previousQuery &&
        snapshot.previousQuery.targetLevel !== snapshot.nextQuery.targetLevel,
      );
      const reloadDelayMs = getAdminViewportReloadDelayMs({
        levelChanged,
        cacheHit: snapshot?.cacheHit,
        missingTileCount: missingTileKeys.length,
      });
      if (snapshot) {
        logAdminDebug("ZoomSwitch", createAdminZoomSwitchDebug({
          previousLevel: snapshot.previousQuery?.targetLevel ?? null,
          nextLevel: snapshot.nextQuery.targetLevel,
          cacheHit: snapshot.cacheHit,
          pendingRequestCancelled: levelChanged,
        }));
        logAdminDebug("PanStability", createAdminPanStabilityDebug({
          targetLevel: snapshot.nextQuery.targetLevel,
          requiredTileKeys,
          cachedTileKeys,
          missingTileKeys,
          shouldFetch: missingTileKeys.length > 0 || levelChanged,
          fetchReason:
            missingTileKeys.length > 0
              ? "missing_tile"
              : levelChanged
                ? "level_changed"
                : null,
          skippedReason: missingTileKeys.length > 0 || levelChanged ? null : "covered",
        }));
      }
      adminBoundaryDebounceTimerRef.current = setTimeout(() => {
        adminBoundaryDebounceTimerRef.current = null;
        requestAdminBoundaryLayer({ reason: "viewport-end" });
      }, reloadDelayMs);
    };

    map.on?.("zoomchange", handleZoomChanged);
    map.on?.("zoomstart", handleViewChanging);
    map.on?.("movestart", handleViewChanging);
    map.on?.("zoomend", handleViewChanged);
    map.on?.("moveend", handleViewChanged);

    return () => {
      if (adminBoundaryDebounceTimerRef.current) {
        clearTimeout(adminBoundaryDebounceTimerRef.current);
        adminBoundaryDebounceTimerRef.current = null;
      }
      map.off?.("zoomchange", handleZoomChanged);
      map.off?.("zoomstart", handleViewChanging);
      map.off?.("movestart", handleViewChanging);
      map.off?.("zoomend", handleViewChanged);
      map.off?.("moveend", handleViewChanged);
    };
  }, [
    adminBoundaryFillOpacity,
    adminBoundaryLabelVisible,
    adminBoundaryPrecision,
    adminBoundaryVisible,
    adminPmtilesOnlyMode,
    center,
    onZoomChange,
    viewState.status,
    zoom,
  ]);

  useEffect(() => {
    const styleSignature = JSON.stringify({
      fillOpacity: adminBoundaryFillOpacity ?? null,
      precision: adminBoundaryPrecision,
      labelVisible: adminBoundaryLabelVisible,
    });
    const manualRefresh =
      adminBoundaryVisible &&
      lastAdminLayerStyleRef.current !== null &&
      lastAdminLayerStyleRef.current !== styleSignature;

    lastAdminLayerStyleRef.current = styleSignature;
    requestAdminBoundaryLayer(
      manualRefresh
        ? { manualRefresh: true, reason: "manual-refresh" }
        : { reason: "map-mode-changed" },
    );
  }, [
    adminBoundaryFillOpacity,
    adminBoundaryLabelVisible,
    adminBoundaryPrecision,
    adminBoundaryVisible,
    adminPmtilesOnlyMode,
    center,
    viewState.status,
    zoom,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !amapRef.current ||
      viewState.status !== "ready" ||
      !adminBoundaryVisible ||
      process.env.NODE_ENV === "production"
    ) {
      clearAmapPolygonInstances(
        adminDebugProbeRef.current ? [adminDebugProbeRef.current] : [],
      );
      adminDebugProbeRef.current = null;
      return;
    }

    clearAmapPolygonInstances(
      adminDebugProbeRef.current ? [adminDebugProbeRef.current] : [],
    );
    adminDebugProbeRef.current = null;

    if (process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_DEBUG_POLYGON !== "on") {
      return;
    }

    const probeCenter =
      parseAmapMapCenter(mapRef.current.getCenter?.()) ?? center;

    if (!probeCenter || typeof amapRef.current.Polygon !== "function") {
      return;
    }

    const latRadius = 1.2;
    const lngRadius = 1.8;
    const path = [
      [probeCenter.lng - lngRadius, probeCenter.lat + latRadius],
      [probeCenter.lng + lngRadius, probeCenter.lat + latRadius],
      [probeCenter.lng + lngRadius, probeCenter.lat - latRadius],
      [probeCenter.lng - lngRadius, probeCenter.lat - latRadius],
    ] as Array<[number, number]>;
    const polygon = new amapRef.current.Polygon({
      path,
      fillColor: "#ffe066",
      fillOpacity: 0.5,
      strokeColor: "#e03131",
      strokeOpacity: 1,
      strokeWeight: 3,
      zIndex: 9999,
      extData: {
        id: "admin-runtime-debug-probe",
        overlayType: "admin-runtime-debug-probe",
      },
    });
    polygon.setMap(mapRef.current);
    adminDebugProbeRef.current = polygon;
    console.info("[AdminRuntime] debug probe polygon attached:", true);

    return () => {
      clearAmapPolygonInstances(
        adminDebugProbeRef.current ? [adminDebugProbeRef.current] : [],
      );
      adminDebugProbeRef.current = null;
    };
  }, [adminBoundaryVisible, center, viewState.status, zoom]);

  useEffect(() => {
    if (!mapRef.current || !amapRef.current || viewState.status !== "ready") {
      return;
    }

    clearAmapTrafficLayer(trafficLayerRef.current);
    trafficLayerRef.current = trafficLayerVisible
      ? createAmapTrafficLayer(
          amapRef.current,
          mapRef.current,
          trafficLayerOpacity,
        )
      : null;

    return () => {
      clearAmapTrafficLayer(trafficLayerRef.current);
      trafficLayerRef.current = null;
    };
  }, [trafficLayerOpacity, trafficLayerVisible, viewState.status]);

  useEffect(() => {
    if (!mapRef.current || !amapRef.current || viewState.status !== "ready") {
      return;
    }

    clearAmapPolygonInstances(polygonsRef.current);
    polygonsRef.current = createAmapPolygonInstances(
      amapRef.current,
      mapRef.current,
      polygonRegions,
      {
        onPolygonClick,
        onPolygonMouseEnter,
        onPolygonMouseLeave,
      },
    );

    return () => {
      clearAmapPolygonInstances(polygonsRef.current);
      polygonsRef.current = [];
    };
  }, [
    onPolygonClick,
    onPolygonMouseEnter,
    onPolygonMouseLeave,
    polygonRegions,
    viewState.status,
  ]);

  useEffect(() => {
    if (!mapRef.current || !amapRef.current || viewState.status !== "ready") {
      return;
    }

    clearAmapMarkerInstances(regionLabelsRef.current);
    regionLabelsRef.current = createAmapRegionLabelInstances(
      amapRef.current,
      mapRef.current,
      regionLabels,
    );

    return () => {
      clearAmapMarkerInstances(regionLabelsRef.current);
      regionLabelsRef.current = [];
    };
  }, [regionLabels, viewState.status]);

  useEffect(() => {
    if (!mapRef.current || !amapRef.current || viewState.status !== "ready") {
      return;
    }

    clearAmapPolylineInstances(polylinesRef.current);
    polylinesRef.current = createAmapPolylineInstances(
      amapRef.current,
      mapRef.current,
      polylineRoutes,
      {
        onPolylineClick,
      },
    );

    return () => {
      clearAmapPolylineInstances(polylinesRef.current);
      polylinesRef.current = [];
    };
  }, [onPolylineClick, polylineRoutes, viewState.status]);

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
  }, [activePointId, markerLabel, markerPoints, onMarkerClick, viewState.status]);

  useEffect(() => {
    if (!mapRef.current || viewState.status !== "ready") {
      return;
    }

    syncAmapViewportForActivePoint(mapRef.current, markerPoints, activePointId);
  }, [activePointId, markerPoints, viewState.status]);

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

  const surfaceClass = `${surfaceClassName ?? "workspace-panel"} relative overflow-hidden ${className ?? ""}`.trim();
  const surfaceStyle = { height: "100%", minHeight: 0 };

  if (viewState.status === "loading") {
    return (
      <div className={surfaceClass} style={surfaceStyle}>
        <div
          ref={containerRef}
          aria-label={ariaLabel}
          role="img"
          className="h-full min-h-0 w-full opacity-0"
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
    <div className={surfaceClass} style={surfaceStyle}>
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        role="img"
        className="h-full min-h-0 w-full"
      />
      <AdminPmtilesOverlay
        amapMap={mapRef.current}
        fallbackCenter={center}
        fallbackZoom={zoom}
        enabled={adminPmtilesOverlayVisible}
        enableAdminPmtilesOverlay={enableAdminPmtilesOverlay}
        enableHkMoSpecialRuntime={enableHkMoSpecialRuntime}
        adminPrecision={adminBoundaryPrecision}
      />
      {showEmptyStateOverlay && markerPoints.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[1] sm:inset-x-auto sm:right-4 sm:max-w-sm">
          <div className="map-desk-overlay px-3.5 py-2.5">
            <p className="text-sm font-semibold text-[var(--ink)]">{emptyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              {emptyDescription}
            </p>
          </div>
        </div>
      ) : null}
      {unresolvedCount > 0 && markerPoints.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[1]">
          <p className="map-desk-overlay px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
            还有 {unresolvedCount} 个地点待确认，暂时还没有显示在地图上。
          </p>
        </div>
      ) : null}
      {adminBoundaryVisible && adminBoundaryError ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[2] max-w-xs rounded-[6px] border border-[rgba(122,63,49,0.32)] bg-[rgba(255,253,247,0.94)] px-3 py-2 text-sm font-semibold text-[#7a3f31] shadow-[0_10px_24px_rgba(61,49,39,0.14)]">
          行政区划加载失败
        </div>
      ) : null}
    </div>
  );
}
