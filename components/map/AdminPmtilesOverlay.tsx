"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ExpressionSpecification,
  FilterSpecification,
  LngLatLike,
  Map as MapLibreMap,
  MapOptions,
  StyleSpecification,
} from "maplibre-gl";

import type { AMapMapInstance } from "../../lib/map/amap-types";
import type { AdminPrecision } from "../../lib/map-studio/layer-state";
import { setupMapLibreWorker } from "../../lib/map/maplibreWorker";

import {
  parseAmapMapBounds,
  parseAmapMapCenter,
  type MapBounds,
  type MapCenter,
} from "./map-utils";

const DEFAULT_ADMIN_PMTILES_URL =
  "https://wanderly-map-public.oss-cn-shenzhen.aliyuncs.com/admin-tiles/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles";
const ADMIN_PMTILES_SOURCE_ID = "admin-boundaries";
const HK_MO_SPECIAL_ADMIN_SOURCE_ID = "hk_mo_special_admin_source";
const MACAU_DATAV_DISPLAY_SUBDIVISION_SOURCE_ID =
  "macau_datav_display_subdivision_source";
const ADMIN_PMTILES_LAYER_IDS = {
  province: "admin-pmtiles-province-boundary",
  prefecture: "admin-pmtiles-prefecture-boundary",
  county: "admin-pmtiles-county-boundary",
  hkMoSpecialAdminBoundary: "hk_mo_special_admin_boundary",
  hkMoSpecialAdminLabel: "hk_mo_special_admin_label",
  macauDatavDisplaySubdivisionBoundary:
    "macau_datav_display_subdivision_boundary",
  macauDatavDisplaySubdivisionLabel:
    "macau_datav_display_subdivision_label",
  hkMoPrefectureDebug: "admin-pmtiles-hk-mo-prefecture-boundary-debug",
  hkMoCountyDebug: "admin-pmtiles-hk-mo-county-boundary-debug",
  provinceLabel: "admin-pmtiles-province-label",
  prefectureLabel: "admin-pmtiles-prefecture-label",
  countyLabel: "admin-pmtiles-county-label",
  hkMoPrefectureLabel: "admin_label_hk_mo_prefecture",
  hkMoCountyLabel: "admin_label_hk_mo_county",
} as const;
const HK_MO_PREFECTURE_LABEL_ADCODES = ["810000", "820000"] as const;
const HK_MO_COUNTY_LABEL_ADCODES = [
  "810101",
  "810102",
  "810103",
  "810104",
  "810105",
  "810106",
  "810107",
  "810108",
  "810109",
  "810110",
  "810111",
  "810112",
  "810113",
  "810114",
  "810115",
  "810116",
  "810117",
  "810118",
  "820000",
] as const;
const HK_MO_COUNTY_PARENT_ADCODES = ["810000", "820000"] as const;
// Provincial county-level units in the archived normalized hierarchy, not municipalities.
const PROVINCE_DIRECT_COUNTY_PARENTS = ["410000", "420000", "460000", "650000"] as const;
const PROVINCE_DIRECT_COUNTY_PREFIXES = ["419", "429", "469", "659"] as const;
const HK_MO_PREFECTURE_DEBUG_LINE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  6,
  1.2,
  8,
  1.7,
];
const HK_MO_COUNTY_DEBUG_LINE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  9,
  1.1,
  12,
  1.8,
];
const ADMIN_PMTILES_EVENT_NAMES = [
  "complete",
  "movestart",
  "moving",
  "moveend",
  "dragging",
  "dragend",
  "zoomstart",
  "zoomend",
  "mapmove",
  "zoomchange",
  "resize",
] as const;

type AdminPmtilesEventName = (typeof ADMIN_PMTILES_EVENT_NAMES)[number];
type AdminPmtilesCoordinateSystem = "WGS84" | "GCJ-02";
type AdminPmtilesLayerLevel = "province_boundary" | "prefecture_boundary" | "county_boundary";

interface AdminPmtilesPerformanceState {
  mapLibreOverlayLoaded: boolean;
  mapLibreOverlayIdle: boolean;
  mapLibreTilesLoaded: boolean;
  sourceCreateCount: number;
  layerCreateCount: number;
  styleCreateCount: number;
  protocolRegisterCount: number;
  protocolActiveUsers: number;
  overlaySyncCount: number;
  lastPanDurationMs: number | null;
  lastMoveEndToIdleDurationMs: number | null;
}

export interface AdminPmtilesOffsetDebugSnapshot {
  reason: string;
  currentMapCenter: MapCenter;
  currentMapZoom: number;
  amapCenter: MapCenter;
  amapZoom: number;
  amapViewportBounds: MapBounds | null;
  mapLibreCenter: MapCenter | null;
  mapLibreEffectiveZoom: number | null;
  pmtilesOverlayBounds: MapBounds | null;
  centerDelta: {
    lng: number;
    lat: number;
    approxMeters: number;
  } | null;
  sourceUrl: string;
  pmtilesCoordinateSystem: AdminPmtilesCoordinateSystem;
  usesWgs84Pmtiles: boolean;
  hasGcj02Transform: boolean;
  visiblePmtilesLayers: AdminPmtilesLayerLevel[];
  pmtilesOnly: boolean;
  legacyAdminOverlayDisabled: boolean;
  mapLibreOverlayLoaded: boolean;
  overlaySyncCount: number;
  containerSize: {
    amap: { width: number; height: number } | null;
    mapLibre: { width: number; height: number } | null;
  };
  pixelProjection: {
    center: MapCenter;
    amapPixel: { x: number; y: number } | null;
    mapLibrePixel: { x: number; y: number } | null;
    delta: { x: number; y: number; distancePx: number } | null;
  } | null;
}

export interface AdminPmtilesPerformanceDebugSnapshot
  extends AdminPmtilesPerformanceState {
  reason: string;
  currentMapZoom: number;
  visiblePmtilesLayers: AdminPmtilesLayerLevel[];
  sourceUrl: string;
  pmtilesOnly: boolean;
}

export interface AdminPmtilesRuntimeFeatureDebugSnapshot {
  reason: string;
  currentMapZoom: number;
  mapLibreBounds: MapBounds | null;
  sourceUrl: string;
  visibleStyleLayers: string[];
  sourceFeatureCounts: {
    hkMoSpecialAdminBoundary: number;
    hkMoSpecialAdminLabel: number;
    macauDatavDisplaySubdivisionBoundary: number;
    macauDatavDisplaySubdivisionLabel: number;
    hongKongCountyBoundary: number;
    macauCountyFallbackBoundary: number;
    hongKongCountyLabel: number;
    macauCountyFallbackLabel: number;
  };
  renderedFeatureCounts: {
    hkMoSpecialAdminBoundary: number;
    hkMoSpecialAdminLabel: number;
    macauDatavDisplaySubdivisionBoundary: number;
    macauDatavDisplaySubdivisionLabel: number;
    hongKongCountyBoundary: number;
    macauCountyFallbackBoundary: number;
    hongKongCountyLabel: number;
    macauCountyFallbackLabel: number;
  };
  hongKongCountyLabelAdcodes: string[];
  hongKongRenderedCountyLabelAdcodes: string[];
  placementAssessment: {
    hongKongCountyLabelsLikelyHiddenByCollision: boolean;
    macauCountyLabelLikelyHiddenByCollision: boolean;
  };
}

interface AdminPmtilesOverlayProps {
  amapMap: AMapMapInstance | null;
  fallbackCenter?: MapCenter;
  fallbackZoom?: number;
  enabled?: boolean;
  enableAdminPmtilesOverlay?: boolean;
  enableHkMoSpecialRuntime?: boolean;
  sourceUrl?: string;
  adminPrecision?: AdminPrecision;
}

type AdminPmtilesMapLike = Pick<MapLibreMap, "remove"> | null | undefined;
type AdminPmtilesMapLibreErrorLike = {
  error?: unknown;
  message?: unknown;
  type?: unknown;
};

let registeredProtocolUsers = 0;
let registeredProtocolCleanup: (() => void) | null = null;
let registeredProtocolInstallCount = 0;

export function isAdminPmtilesOverlayEnabled(
  value = process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY,
) {
  if (value === undefined || value.trim() === "") {
    return true;
  }

  return isEnabledEnvValue(value);
}

export function isHkMoSpecialAdminRuntimeEnabled(
  _value = process.env.NEXT_PUBLIC_MAP_STUDIO_HK_MO_SPECIAL_ADMIN_RUNTIME,
) {
  return false;
}

export function isMacauDatavDisplaySubdivisionEnabled(
  _value = process.env.NEXT_PUBLIC_MAP_STUDIO_MACAU_DATAV_SUBDIVISIONS,
) {
  return false;
}

export function isAdminPmtilesOnlyModeEnabled(
  value = process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY,
) {
  if (value === undefined || value.trim() === "") {
    return true;
  }

  return isEnabledEnvValue(value);
}

export function isAdminPmtilesOffsetDebugEnabled(
  value = process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OFFSET_DEBUG,
) {
  return isEnabledEnvValue(value);
}

export function isAdminPmtilesDebugLabelsEnabled(
  value = process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_DEBUG_LABELS,
) {
  return isEnabledEnvValue(value);
}

export function resolveAdminPmtilesUrl(
  value = process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL,
) {
  return value?.trim() || DEFAULT_ADMIN_PMTILES_URL;
}

export function getAdminPmtilesOverlayEventNames(): AdminPmtilesEventName[] {
  return [...ADMIN_PMTILES_EVENT_NAMES];
}

export function getVisibleAdminPmtilesLayers(
  zoom: number,
): AdminPmtilesLayerLevel[] {
  if (!Number.isFinite(zoom) || zoom < 3) {
    return [];
  }

  if (zoom < 6) {
    return ["province_boundary"];
  }

  if (zoom < 9) {
    return ["province_boundary", "prefecture_boundary", "county_boundary"];
  }

  return ["prefecture_boundary", "county_boundary"];
}

function adminBoundaryDisplayFilter(displayLevel: "province" | "prefecture" | "county"): ExpressionSpecification {
  return [
    "any",
    ["==", ["get", "displayLevel"], displayLevel],
    [
      "all",
      ["!", ["has", "displayLevel"]],
      ["==", ["get", "level"], displayLevel],
    ],
  ] as ExpressionSpecification;
}

function adminLabelDisplayFilter(
  displayLevel: "province" | "prefecture" | "county",
  excludeAdcodes: readonly string[] = [],
): FilterSpecification {
  const levelFilter: ExpressionSpecification = displayLevel === "prefecture"
    ? ["any",
      ["==", ["get", "displayLevel"], "prefecture"],
      ["all", ["==", ["get", "displayLevel"], "county"],
        ["in", ["get", "parentAdcode"], ["literal", [...PROVINCE_DIRECT_COUNTY_PARENTS]]]],
    ]
    : ["==", ["get", "displayLevel"], displayLevel];
  if (excludeAdcodes.length === 0) {
    return levelFilter as FilterSpecification;
  }

  return [
    "all",
    levelFilter,
    ["!", ["in", ["get", "adcode"], ["literal", [...excludeAdcodes]]]],
  ] as FilterSpecification;
}

function provinceDirectCountyBoundaryFilter(): ExpressionSpecification {
  return ["any", ...["adcode", "leftAdcode", "rightAdcode"].map(property =>
    ["in", ["slice", ["to-string", ["coalesce", ["get", property], ""]], 0, 3],
      ["literal", [...PROVINCE_DIRECT_COUNTY_PREFIXES]]],
  )] as ExpressionSpecification;
}

function hkMoLabelDisplayFilter(
  displayLevel: "prefecture" | "county",
  options: { includeMacauFallback?: boolean } = {},
): FilterSpecification {
  const adcodes = displayLevel === "prefecture"
    ? [...HK_MO_PREFECTURE_LABEL_ADCODES]
    : [
      ...HK_MO_COUNTY_LABEL_ADCODES.filter((adcode) =>
        options.includeMacauFallback === false ? adcode !== "820000" : true,
      ),
    ];

  return [
    "all",
    ["==", ["get", "displayLevel"], displayLevel],
    [
      "in",
      ["get", "adcode"],
      ["literal", adcodes],
    ],
  ] as FilterSpecification;
}

function hkMoBoundaryDisplayFilter(displayLevel: "prefecture" | "county"): FilterSpecification {
  return [
    "all",
    ["==", ["get", "displayLevel"], displayLevel],
    [
      "any",
      ["in", ["get", "adcode"], ["literal", [...HK_MO_PREFECTURE_LABEL_ADCODES, ...HK_MO_COUNTY_LABEL_ADCODES]]],
      ["in", ["get", "parentAdcode"], ["literal", [...HK_MO_COUNTY_PARENT_ADCODES]]],
      ["in", ["get", "leftAdcode"], ["literal", [...HK_MO_PREFECTURE_LABEL_ADCODES, ...HK_MO_COUNTY_LABEL_ADCODES]]],
      ["in", ["get", "rightAdcode"], ["literal", [...HK_MO_PREFECTURE_LABEL_ADCODES, ...HK_MO_COUNTY_LABEL_ADCODES]]],
    ],
  ] as FilterSpecification;
}

function adminLabelPaint(opacity: number) {
  return {
    "text-color": "#6f6049",
    "text-halo-color": "rgba(255, 250, 239, 0.88)",
    "text-halo-width": 1.2,
    "text-halo-blur": 0.35,
    "text-opacity": opacity,
  };
}

function hkMoLabelPaint(debugLabels: boolean) {
  return {
    "text-color": debugLabels ? "#4b1f14" : "#5b3d2e",
    "text-halo-color": debugLabels ? "#fff1ce" : "rgba(255, 250, 239, 0.94)",
    "text-halo-width": debugLabels ? 2.2 : 1.6,
    "text-halo-blur": debugLabels ? 0.2 : 0.35,
    "text-opacity": 0.96,
  };
}

function isHkCountyAdcode(value: unknown) {
  return typeof value === "string" && HK_MO_COUNTY_LABEL_ADCODES.includes(value as (typeof HK_MO_COUNTY_LABEL_ADCODES)[number]) && value.startsWith("81");
}

function isMacauCountyFallbackAdcode(value: unknown) {
  return value === "820000";
}

function featureProps(feature: { properties?: unknown }) {
  return (feature.properties ?? {}) as Record<string, unknown>;
}

function queryAdminPmtilesSourceFeatures(
  map: MapLibreMap,
  sourceLayer: string,
) {
  try {
    return map.querySourceFeatures(ADMIN_PMTILES_SOURCE_ID, { sourceLayer });
  } catch {
    return [];
  }
}

function queryAdminPmtilesRenderedFeatures(
  map: MapLibreMap,
  layers: string[],
) {
  try {
    return map.queryRenderedFeatures(undefined, { layers });
  } catch {
    return [];
  }
}

function queryRenderedFeaturesSafely(
  map: MapLibreMap,
  layers: string[],
) {
  try {
    return map.queryRenderedFeatures(undefined, { layers });
  } catch {
    return [];
  }
}

function querySourceFeaturesSafely(
  map: MapLibreMap,
  sourceId: string,
) {
  try {
    return map.querySourceFeatures(sourceId);
  } catch {
    return [];
  }
}

function getVisibleStyleLayerIds(map: MapLibreMap) {
  try {
    return map.getStyle().layers
      .filter((layer) => {
        try {
          return map.getLayoutProperty(layer.id, "visibility") !== "none";
        } catch {
          return false;
        }
      })
      .map((layer) => layer.id);
  } catch {
    return [];
  }
}

function countFeatures(
  features: Array<{ properties?: unknown }>,
  predicate: (props: Record<string, unknown>) => boolean,
) {
  return features.filter((feature) => predicate(featureProps(feature))).length;
}

function distinctAdcodes(
  features: Array<{ properties?: unknown }>,
  predicate: (props: Record<string, unknown>) => boolean,
) {
  return Array.from(new Set(
    features
      .map((feature) => featureProps(feature))
      .filter(predicate)
      .map((props) => String(props.adcode)),
  )).sort();
}

export function buildAdminPmtilesRuntimeFeatureDebugSnapshot(input: {
  reason: string;
  map: MapLibreMap;
  sourceUrl: string;
}): AdminPmtilesRuntimeFeatureDebugSnapshot {
  const sourceCountyBoundary = queryAdminPmtilesSourceFeatures(input.map, "county_boundary");
  const sourceLabels = queryAdminPmtilesSourceFeatures(input.map, "admin_label");
  const sourceSpecialAdmin = querySourceFeaturesSafely(input.map, HK_MO_SPECIAL_ADMIN_SOURCE_ID);
  const sourceMacauDatavSubdivisions = querySourceFeaturesSafely(
    input.map,
    MACAU_DATAV_DISPLAY_SUBDIVISION_SOURCE_ID,
  );
  const renderedCountyBoundary = queryAdminPmtilesRenderedFeatures(input.map, [
    ADMIN_PMTILES_LAYER_IDS.county,
    ADMIN_PMTILES_LAYER_IDS.hkMoCountyDebug,
  ]);
  const renderedLabels = queryAdminPmtilesRenderedFeatures(input.map, [
    ADMIN_PMTILES_LAYER_IDS.countyLabel,
    ADMIN_PMTILES_LAYER_IDS.hkMoCountyLabel,
  ]);
  const renderedSpecialAdmin = queryRenderedFeaturesSafely(input.map, [
    ADMIN_PMTILES_LAYER_IDS.hkMoSpecialAdminBoundary,
    ADMIN_PMTILES_LAYER_IDS.hkMoSpecialAdminLabel,
  ]);
  const renderedMacauDatavSubdivisions = queryRenderedFeaturesSafely(input.map, [
    ADMIN_PMTILES_LAYER_IDS.macauDatavDisplaySubdivisionBoundary,
    ADMIN_PMTILES_LAYER_IDS.macauDatavDisplaySubdivisionLabel,
  ]);
  const visibleStyleLayers = getVisibleStyleLayerIds(input.map);
  const isSpecialAdminBoundary = (props: Record<string, unknown>) =>
    props.layer === "hk_mo_special_admin_boundary";
  const isSpecialAdminLabel = (props: Record<string, unknown>) =>
    props.layer === "hk_mo_special_admin_label";
  const isMacauDatavSubdivisionBoundary = (props: Record<string, unknown>) =>
    props.layer === "macau_datav_display_subdivision_boundary";
  const isMacauDatavSubdivisionLabel = (props: Record<string, unknown>) =>
    props.layer === "macau_datav_display_subdivision_label";
  const isHkCountyBoundary = (props: Record<string, unknown>) =>
    props.displayLevel === "county" &&
    (props.parentAdcode === "810000" || isHkCountyAdcode(props.adcode) || isHkCountyAdcode(props.leftAdcode) || isHkCountyAdcode(props.rightAdcode));
  const isMacauCountyBoundary = (props: Record<string, unknown>) =>
    props.displayLevel === "county" &&
    props.fallbackRole === "selfAsCounty" &&
    (isMacauCountyFallbackAdcode(props.adcode) || isMacauCountyFallbackAdcode(props.leftAdcode) || isMacauCountyFallbackAdcode(props.rightAdcode));
  const isHkCountyLabel = (props: Record<string, unknown>) =>
    props.displayLevel === "county" && isHkCountyAdcode(props.adcode);
  const isMacauCountyLabel = (props: Record<string, unknown>) =>
    props.displayLevel === "county" &&
    props.fallbackRole === "selfAsCounty" &&
    isMacauCountyFallbackAdcode(props.adcode);
  const sourceFeatureCounts = {
    hkMoSpecialAdminBoundary: countFeatures(sourceSpecialAdmin, isSpecialAdminBoundary),
    hkMoSpecialAdminLabel: countFeatures(sourceSpecialAdmin, isSpecialAdminLabel),
    macauDatavDisplaySubdivisionBoundary: countFeatures(
      sourceMacauDatavSubdivisions,
      isMacauDatavSubdivisionBoundary,
    ),
    macauDatavDisplaySubdivisionLabel: countFeatures(
      sourceMacauDatavSubdivisions,
      isMacauDatavSubdivisionLabel,
    ),
    hongKongCountyBoundary: countFeatures(sourceCountyBoundary, isHkCountyBoundary),
    macauCountyFallbackBoundary: countFeatures(sourceCountyBoundary, isMacauCountyBoundary),
    hongKongCountyLabel: countFeatures(sourceLabels, isHkCountyLabel),
    macauCountyFallbackLabel: countFeatures(sourceLabels, isMacauCountyLabel),
  };
  const renderedFeatureCounts = {
    hkMoSpecialAdminBoundary: countFeatures(renderedSpecialAdmin, isSpecialAdminBoundary),
    hkMoSpecialAdminLabel: countFeatures(renderedSpecialAdmin, isSpecialAdminLabel),
    macauDatavDisplaySubdivisionBoundary: countFeatures(
      renderedMacauDatavSubdivisions,
      isMacauDatavSubdivisionBoundary,
    ),
    macauDatavDisplaySubdivisionLabel: countFeatures(
      renderedMacauDatavSubdivisions,
      isMacauDatavSubdivisionLabel,
    ),
    hongKongCountyBoundary: countFeatures(renderedCountyBoundary, isHkCountyBoundary),
    macauCountyFallbackBoundary: countFeatures(renderedCountyBoundary, isMacauCountyBoundary),
    hongKongCountyLabel: countFeatures(renderedLabels, isHkCountyLabel),
    macauCountyFallbackLabel: countFeatures(renderedLabels, isMacauCountyLabel),
  };

  return {
    reason: input.reason,
    currentMapZoom: input.map.getZoom(),
    mapLibreBounds: getMapLibreBounds(input.map),
    sourceUrl: input.sourceUrl,
    visibleStyleLayers,
    sourceFeatureCounts,
    renderedFeatureCounts,
    hongKongCountyLabelAdcodes: distinctAdcodes(sourceLabels, isHkCountyLabel),
    hongKongRenderedCountyLabelAdcodes: distinctAdcodes(renderedLabels, isHkCountyLabel),
    placementAssessment: {
      hongKongCountyLabelsLikelyHiddenByCollision:
        sourceFeatureCounts.hongKongCountyLabel > 0 &&
        renderedFeatureCounts.hongKongCountyBoundary > 0 &&
        renderedFeatureCounts.hongKongCountyLabel === 0,
      macauCountyLabelLikelyHiddenByCollision:
        sourceFeatureCounts.macauCountyFallbackLabel > 0 &&
        renderedFeatureCounts.macauCountyFallbackBoundary > 0 &&
        renderedFeatureCounts.macauCountyFallbackLabel === 0,
    },
  };
}

export function createAdminPmtilesStyle(
  sourceUrl = DEFAULT_ADMIN_PMTILES_URL,
  options: {
    adminPmtilesOverlay?: boolean;
    debugLabels?: boolean;
    hkMoSpecialRuntime?: boolean;
    macauDatavSubdivisions?: boolean;
  } = {},
): StyleSpecification {
  const pmtilesUrl = sourceUrl.startsWith("pmtiles://")
    ? sourceUrl
    : `pmtiles://${sourceUrl}`;
  const adminPmtilesOverlay = options.adminPmtilesOverlay ?? true;
  const debugLabels = options.debugLabels ?? isAdminPmtilesDebugLabelsEnabled();
  const sources: StyleSpecification["sources"] = {};
  const layers: StyleSpecification["layers"] = [];

  if (adminPmtilesOverlay) {
    sources[ADMIN_PMTILES_SOURCE_ID] = {
      type: "vector",
      url: pmtilesUrl,
      minzoom: 3,
      maxzoom: 12,
    };
  }

  if (adminPmtilesOverlay) {
    layers.push(
      {
        id: ADMIN_PMTILES_LAYER_IDS.province,
        type: "line",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "province_boundary",
        filter: adminBoundaryDisplayFilter("province"),
        minzoom: 3,
        maxzoom: 9,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#5f4d36",
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.66,
            5,
            0.72,
            8,
            0.46,
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.86,
            5,
            1.18,
            8,
            0.82,
          ],
        },
      },
      {
        id: ADMIN_PMTILES_LAYER_IDS.prefecture,
        type: "line",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "prefecture_boundary",
        filter: adminBoundaryDisplayFilter("prefecture"),
        minzoom: 6,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#745f43",
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.38,
            8,
            0.58,
            10.5,
            0.56,
            12,
            0.6,
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.46,
            8,
            0.88,
            10,
            0.94,
            12,
            1.12,
          ],
        },
      },
      {
        id: ADMIN_PMTILES_LAYER_IDS.county,
        type: "line",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "county_boundary",
        filter: ["all", adminBoundaryDisplayFilter("county"),
          ["step", ["zoom"], provinceDirectCountyBoundaryFilter(), 9, true]],
        minzoom: 6,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#6f6049",
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            0.38,
            10,
            0.52,
            11,
            0.64,
            12,
            0.7,
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            0.48,
            10,
            0.66,
            11,
            0.82,
            12,
            0.96,
          ],
        },
      },
    );
  }

  if (adminPmtilesOverlay) {
    layers.push({
      id: ADMIN_PMTILES_LAYER_IDS.provinceLabel,
      type: "symbol",
      source: ADMIN_PMTILES_SOURCE_ID,
      "source-layer": "admin_label",
      filter: adminLabelDisplayFilter("province"),
      minzoom: 3,
      maxzoom: 6,
      layout: {
        "text-field": ["coalesce", ["get", "labelText"], ["get", "name"]],
        "text-font": ["Open Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          10,
          5,
          12,
        ],
        "text-padding": 8,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-sort-key": ["get", "labelRank"],
      },
      paint: adminLabelPaint(0.78),
    });
  }

  if (adminPmtilesOverlay) {
    layers.push(
      {
        id: ADMIN_PMTILES_LAYER_IDS.prefectureLabel,
        type: "symbol",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "admin_label",
        filter: adminLabelDisplayFilter("prefecture", HK_MO_PREFECTURE_LABEL_ADCODES),
        minzoom: 6,
        maxzoom: 9,
        layout: {
          "text-field": ["coalesce", ["get", "labelText"], ["get", "name"]],
          "text-font": ["Open Sans Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            10,
            8,
            12,
          ],
          "text-padding": 3,
          "text-max-width": 7,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "symbol-sort-key": ["get", "labelRank"],
        },
        paint: adminLabelPaint(0.82),
      },
      {
        id: ADMIN_PMTILES_LAYER_IDS.countyLabel,
        type: "symbol",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "admin_label",
        filter: adminLabelDisplayFilter("county", HK_MO_COUNTY_LABEL_ADCODES),
        minzoom: 9,
        layout: {
          "text-field": ["coalesce", ["get", "labelText"], ["get", "name"]],
          "text-font": ["Open Sans Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            9,
            12,
            10.5,
          ],
          "text-padding": 6,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "symbol-sort-key": ["get", "labelRank"],
        },
        paint: adminLabelPaint(0.76),
      },
    );
  }

  if (adminPmtilesOverlay && debugLabels) {
    layers.push(
      {
        id: ADMIN_PMTILES_LAYER_IDS.hkMoPrefectureDebug,
        type: "line",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "prefecture_boundary",
        filter: hkMoBoundaryDisplayFilter("prefecture"),
        minzoom: 6,
        maxzoom: 9,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#b84b2a",
          "line-opacity": 0.92,
          "line-width": HK_MO_PREFECTURE_DEBUG_LINE_WIDTH,
        },
      },
      {
        id: ADMIN_PMTILES_LAYER_IDS.hkMoCountyDebug,
        type: "line",
        source: ADMIN_PMTILES_SOURCE_ID,
        "source-layer": "county_boundary",
        filter: hkMoBoundaryDisplayFilter("county"),
        minzoom: 9,
        maxzoom: 12,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#b84b2a",
          "line-opacity": 0.95,
          "line-width": HK_MO_COUNTY_DEBUG_LINE_WIDTH,
        },
      },
    );
  }

  if (adminPmtilesOverlay) {
    layers.push({
      id: ADMIN_PMTILES_LAYER_IDS.hkMoCountyLabel,
      type: "symbol",
      source: ADMIN_PMTILES_SOURCE_ID,
      "source-layer": "admin_label",
      filter: hkMoLabelDisplayFilter("county", {
        includeMacauFallback: true,
      }),
      minzoom: 9,
      layout: {
        "text-field": ["coalesce", ["get", "labelText"], ["get", "name"]],
        "text-font": ["Open Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          debugLabels ? 11 : 9.5,
          12,
          debugLabels ? 13 : 11,
        ],
        "text-anchor": "center",
        "text-padding": 2,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-sort-key": 0,
      },
      paint: hkMoLabelPaint(debugLabels),
    });
  }

  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources,
    layers,
  };
}

export function createAdminPmtilesMapOptions(input: {
  container: HTMLElement | string;
  style: StyleSpecification;
  center: MapCenter;
  zoom: number;
}): MapOptions {
  return {
    container: input.container,
    style: adaptAdminPmtilesStyleZoom(input.style),
    center: toMapLibreCenter(input.center),
    zoom: toMapLibreZoom(input.zoom),
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    maxTileCacheSize: 768,
    maxTileCacheZoomLevels: 8,
    refreshExpiredTiles: false,
    renderWorldCopies: false,
    trackResize: false,
  };
}

export function resolveAdminPmtilesSyncedViewport(input: {
  center: MapCenter;
  zoom: number;
}) {
  return {
    center: toMapLibreCenter(input.center),
    zoom: toMapLibreZoom(input.zoom),
    bearing: 0,
    pitch: 0,
  };
}

// AMap's zoom-zero world is 256px; MapLibre's is 512px.
function toMapLibreZoom(amapZoom: number) {
  return amapZoom + Math.log2(256 / 512);
}

export function adaptAdminPmtilesStyleZoom(style: StyleSpecification): StyleSpecification {
  function adaptExpression(value: unknown): unknown {
    if (!Array.isArray(value)) return value;
    const result = value.map(adaptExpression);
    const inputIndex = value[0] === "interpolate" ? 2 : value[0] === "step" ? 1 : -1;
    if (inputIndex >= 0 && Array.isArray(value[inputIndex]) && value[inputIndex][0] === "zoom") {
      for (let index = inputIndex + 1 + (value[0] === "step" ? 1 : 0); index < result.length; index += 2) {
        const stop = result[index];
        if (typeof stop === "number") result[index] = toMapLibreZoom(stop);
      }
    }
    return result;
  }

  return {
    ...style,
    layers: style.layers.map(layer => ({
      ...layer,
      ...(layer.minzoom === undefined ? {} : { minzoom: toMapLibreZoom(layer.minzoom) }),
      ...(layer.maxzoom === undefined ? {} : { maxzoom: toMapLibreZoom(layer.maxzoom) }),
      ...(layer.paint ? { paint: Object.fromEntries(Object.entries(layer.paint).map(([key, value]) => [key, adaptExpression(value)])) } : {}),
      ...(layer.layout ? { layout: Object.fromEntries(Object.entries(layer.layout).map(([key, value]) => [key, adaptExpression(value)])) } : {}),
      ...("filter" in layer && layer.filter ? { filter: adaptExpression(layer.filter) } : {}),
    })) as StyleSpecification["layers"],
  };
}

export function applyAdminPmtilesPrecision(
  map: Pick<MapLibreMap, "getLayer" | "setLayerZoomRange" | "setLayoutProperty" | "setFilter">,
  style: StyleSpecification,
  precision: AdminPrecision,
) {
  for (const layer of style.layers) {
    if (!map.getLayer(layer.id)) continue;
    const level = layer.id.includes("province") ? "province"
      : layer.id.includes("prefecture") ? "prefecture"
      : layer.id.includes("county") ? "county" : null;
    if (!level) continue;
    const directCountyInCityView = layer.id === ADMIN_PMTILES_LAYER_IDS.county && precision === "prefecture";
    if (layer.id === ADMIN_PMTILES_LAYER_IDS.county) {
      map.setFilter(layer.id, precision === "prefecture"
        ? ["all", adminBoundaryDisplayFilter("county"), provinceDirectCountyBoundaryFilter()]
        : precision === "county" ? adminBoundaryDisplayFilter("county")
        : "filter" in layer ? layer.filter : undefined);
    }
    map.setLayerZoomRange(layer.id, precision === "auto" ? layer.minzoom ?? 0 : 0,
      precision === "auto" ? layer.maxzoom ?? 24 : 24);
    map.setLayoutProperty(layer.id, "visibility", precision === "auto" || precision === level || directCountyInCityView ? "visible" : "none");
  }
}

export function cleanupAdminPmtilesOverlayMap(map: AdminPmtilesMapLike) {
  map?.remove();
}

export function resolveAdminPmtilesCoordinateState(sourceUrl: string) {
  const usesGcj02Pmtiles = /gcj[-_]?02/i.test(sourceUrl);
  const pmtilesCoordinateSystem: AdminPmtilesCoordinateSystem = usesGcj02Pmtiles
    ? "GCJ-02"
    : "WGS84";

  return {
    pmtilesCoordinateSystem,
    usesWgs84Pmtiles: pmtilesCoordinateSystem === "WGS84",
    hasGcj02Transform: false,
  };
}

export function getAdminPmtilesProtocolDebugState() {
  return {
    activeUsers: registeredProtocolUsers,
    installCount: registeredProtocolInstallCount,
    registered: Boolean(registeredProtocolCleanup),
  };
}

export function isAdminPmtilesFatalMapLibreError(
  eventOrError: AdminPmtilesMapLibreErrorLike | unknown,
) {
  const error =
    eventOrError &&
    typeof eventOrError === "object" &&
    "error" in eventOrError
      ? (eventOrError as AdminPmtilesMapLibreErrorLike).error
      : eventOrError;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : eventOrError &&
            typeof eventOrError === "object" &&
            "message" in eventOrError &&
            typeof (eventOrError as AdminPmtilesMapLibreErrorLike).message ===
              "string"
          ? String((eventOrError as AdminPmtilesMapLibreErrorLike).message)
          : "";

  return /worker failed to load|worker url|failed to construct.*worker|cannot load worker/i.test(
    message,
  );
}

export function warnAdminPmtilesOverlayDisabled(
  reason: string,
  details?: unknown,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.warn("[AdminPmtilesOverlay] disabled MapLibre overlay", {
    reason,
    details,
  });
}

export function buildAdminPmtilesPerfDebugSnapshot(input: {
  reason: string;
  sourceUrl: string;
  zoom: number;
  pmtilesOnly?: boolean;
  state: AdminPmtilesPerformanceState;
}): AdminPmtilesPerformanceDebugSnapshot {
  return {
    reason: input.reason,
    currentMapZoom: input.zoom,
    visiblePmtilesLayers: getVisibleAdminPmtilesLayers(input.zoom),
    sourceUrl: input.sourceUrl,
    pmtilesOnly: input.pmtilesOnly ?? false,
    ...input.state,
  };
}

export function buildAdminPmtilesOffsetDebugSnapshot(input: {
  reason: string;
  sourceUrl: string;
  overlaySyncCount: number;
  amapCenter: MapCenter;
  amapZoom: number;
  amapViewportBounds: MapBounds | null;
  mapLibreCenter: MapCenter | null;
  mapLibreEffectiveZoom: number | null;
  pmtilesOverlayBounds: MapBounds | null;
  pmtilesOnly?: boolean;
  legacyAdminOverlayDisabled?: boolean;
  mapLibreOverlayLoaded?: boolean;
  containerSize?: AdminPmtilesOffsetDebugSnapshot["containerSize"];
  pixelProjection?: AdminPmtilesOffsetDebugSnapshot["pixelProjection"];
}): AdminPmtilesOffsetDebugSnapshot {
  const coordinateState = resolveAdminPmtilesCoordinateState(input.sourceUrl);
  const centerDelta = input.mapLibreCenter
    ? {
        lng: input.mapLibreCenter.lng - input.amapCenter.lng,
        lat: input.mapLibreCenter.lat - input.amapCenter.lat,
        approxMeters: estimateCenterDeltaMeters(
          input.amapCenter,
          input.mapLibreCenter,
        ),
      }
    : null;

  return {
    reason: input.reason,
    currentMapCenter: input.amapCenter,
    currentMapZoom: input.amapZoom,
    amapCenter: input.amapCenter,
    amapZoom: input.amapZoom,
    amapViewportBounds: input.amapViewportBounds,
    mapLibreCenter: input.mapLibreCenter,
    mapLibreEffectiveZoom: input.mapLibreEffectiveZoom,
    pmtilesOverlayBounds: input.pmtilesOverlayBounds,
    centerDelta,
    sourceUrl: input.sourceUrl,
    ...coordinateState,
    visiblePmtilesLayers: getVisibleAdminPmtilesLayers(input.amapZoom),
    pmtilesOnly: input.pmtilesOnly ?? false,
    legacyAdminOverlayDisabled:
      input.legacyAdminOverlayDisabled ?? input.pmtilesOnly ?? false,
    mapLibreOverlayLoaded: input.mapLibreOverlayLoaded ?? false,
    overlaySyncCount: input.overlaySyncCount,
    containerSize: input.containerSize ?? {
      amap: null,
      mapLibre: null,
    },
    pixelProjection: input.pixelProjection ?? null,
  };
}

export function AdminPmtilesOverlay({
  amapMap,
  fallbackCenter,
  fallbackZoom,
  enabled,
  enableAdminPmtilesOverlay = isAdminPmtilesOverlayEnabled(),
  enableHkMoSpecialRuntime: _enableHkMoSpecialRuntime = isHkMoSpecialAdminRuntimeEnabled(),
  sourceUrl = resolveAdminPmtilesUrl(),
  adminPrecision = "auto",
}: AdminPmtilesOverlayProps) {
  void _enableHkMoSpecialRuntime;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const adminPrecisionRef = useRef(adminPrecision);
  const fallbackCenterRef = useRef(fallbackCenter);
  const fallbackZoomRef = useRef(fallbackZoom);
  const [overlayDisabled, setOverlayDisabled] = useState(false);
  const overlayEnabled =
    enabled ?? enableAdminPmtilesOverlay;

  useEffect(() => {
    adminPrecisionRef.current = adminPrecision;
    const currentMap = mapInstanceRef.current;
    if (currentMap?.isStyleLoaded()) {
      applyAdminPmtilesPrecision(currentMap, adaptAdminPmtilesStyleZoom(createAdminPmtilesStyle(sourceUrl)), adminPrecision);
    }
  }, [adminPrecision, sourceUrl]);

  useEffect(() => {
    if (overlayEnabled) {
      setOverlayDisabled(false);
    }
  }, [overlayEnabled, sourceUrl]);

  useEffect(() => {
    fallbackCenterRef.current = fallbackCenter;
    fallbackZoomRef.current = fallbackZoom;
  }, [fallbackCenter?.lng, fallbackCenter?.lat, fallbackZoom]);

  useEffect(() => {
    if (!overlayEnabled || overlayDisabled || !amapMap || !overlayRef.current) {
      return;
    }

    const amap = amapMap;
    let disposed = false;
    let map: MapLibreMap | null = null;
    let detachProtocol: (() => void) | null = null;
    let syncCount = 0;
    let mapLibreOverlayLoaded = false;
    let mapLibreOverlayIdle = false;
    let lastPanStartAt: number | null = null;
    let lastMoveEndAt: number | null = null;
    let lastPanDurationMs: number | null = null;
    let lastMoveEndToIdleDurationMs: number | null = null;
    let sourceCreateCount = 0;
    let layerCreateCount = 0;
    let styleCreateCount = 0;

    async function mountOverlay() {
      const [maplibregl, { Protocol }] = await Promise.all([
        import("maplibre-gl"),
        import("pmtiles"),
      ]);

      if (disposed || !overlayRef.current) {
        return;
      }

      const workerSetup = setupMapLibreWorker(maplibregl);
      maplibregl.prewarm();
      detachProtocol = registerPmtilesProtocol(maplibregl, Protocol);
      const initialViewport = getAmapViewport(
        amap,
        fallbackCenterRef.current,
        fallbackZoomRef.current,
      );
      const style = createAdminPmtilesStyle(sourceUrl, {
        adminPmtilesOverlay: enableAdminPmtilesOverlay,
      });
      styleCreateCount += 1;
      sourceCreateCount += Object.keys(style.sources).length;
      layerCreateCount += style.layers.length;
      const overlayMap = new maplibregl.Map(
        createAdminPmtilesMapOptions({
          container: overlayRef.current,
          style,
          center: initialViewport.center,
          zoom: initialViewport.zoom,
        }),
      );
      map = overlayMap;
      mapInstanceRef.current = overlayMap;
      const handleMapLibreError = (event: AdminPmtilesMapLibreErrorLike) => {
        if (!isAdminPmtilesFatalMapLibreError(event)) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[AdminPmtilesOverlay] MapLibre error", event);
          }
          return;
        }

        warnAdminPmtilesOverlayDisabled("maplibre-worker-error", event);
        disposed = true;
        if (mapInstanceRef.current === overlayMap) mapInstanceRef.current = null;
        cleanupAdminPmtilesOverlayMap(overlayMap);
        detachProtocol?.();
        detachProtocol = null;
        map = null;
        setOverlayDisabled(true);
      };
      overlayMap.on("error", handleMapLibreError);
      if (process.env.NODE_ENV !== "production") {
        const debugWindow = window as Window & {
          __wanderlyAdminPmtilesMap?: MapLibreMap;
        };
        debugWindow.__wanderlyAdminPmtilesMap = overlayMap;
      }

      const sync = (reason = "manual-sync") => {
        const now = getNowMs();
        if (isAdminPmtilesPanStartReason(reason) && lastPanStartAt === null) {
          lastPanStartAt = now;
        }

        if (isAdminPmtilesMoveEndReason(reason)) {
          lastMoveEndAt = now;
        }

        const viewport = getAmapViewport(
          amap,
          fallbackCenterRef.current,
          fallbackZoomRef.current,
        );
        syncCount += 1;
        mapLibreOverlayIdle = false;
        overlayMap.resize();
        overlayMap.jumpTo(resolveAdminPmtilesSyncedViewport(viewport));
        logOffsetDebugSnapshot({
          amap,
          overlayMap,
          sourceUrl,
          syncCount,
          reason,
          fallbackCenter: fallbackCenterRef.current,
          fallbackZoom: fallbackZoomRef.current,
          pmtilesOnly: isAdminPmtilesOnlyModeEnabled(),
          mapLibreOverlayLoaded,
        });
        logPerformanceDebugSnapshot({
          sourceUrl,
          reason,
          zoom: viewport.zoom,
          pmtilesOnly: isAdminPmtilesOnlyModeEnabled(),
          state: {
            mapLibreOverlayLoaded,
            mapLibreOverlayIdle,
            mapLibreTilesLoaded: getMapLibreTilesLoaded(overlayMap),
            sourceCreateCount,
            layerCreateCount,
            styleCreateCount,
            protocolRegisterCount: registeredProtocolInstallCount,
            protocolActiveUsers: registeredProtocolUsers,
            overlaySyncCount: syncCount,
            lastPanDurationMs,
            lastMoveEndToIdleDurationMs,
          },
        });
        logRuntimeFeatureDebugSnapshot({
          overlayMap,
          sourceUrl,
          reason,
        });
      };

      const eventHandlers = ADMIN_PMTILES_EVENT_NAMES.map((eventName) => {
        const handler = () => sync(`amap:${eventName}`);
        amap.on?.(eventName, handler);
        return { eventName, handler };
      });

      overlayMap.once("load", () => {
        if (disposed) return;
        applyAdminPmtilesPrecision(overlayMap, adaptAdminPmtilesStyleZoom(style), adminPrecisionRef.current);
        mapLibreOverlayLoaded = true;
        sync("maplibre:load");
      });
      const handleIdle = () => {
        const now = getNowMs();
        mapLibreOverlayIdle = true;

        if (lastPanStartAt !== null) {
          lastPanDurationMs = roundDebugDuration(now - lastPanStartAt);
          lastPanStartAt = null;
        }

        if (lastMoveEndAt !== null) {
          lastMoveEndToIdleDurationMs = roundDebugDuration(now - lastMoveEndAt);
          lastMoveEndAt = null;
        }

        const viewport = getAmapViewport(
          amap,
          fallbackCenterRef.current,
          fallbackZoomRef.current,
        );
        logPerformanceDebugSnapshot({
          sourceUrl,
          reason: "maplibre:idle",
          zoom: viewport.zoom,
          pmtilesOnly: isAdminPmtilesOnlyModeEnabled(),
          state: {
            mapLibreOverlayLoaded,
            mapLibreOverlayIdle,
            mapLibreTilesLoaded: getMapLibreTilesLoaded(overlayMap),
            sourceCreateCount,
            layerCreateCount,
            styleCreateCount,
            protocolRegisterCount: registeredProtocolInstallCount,
            protocolActiveUsers: registeredProtocolUsers,
            overlaySyncCount: syncCount,
            lastPanDurationMs,
            lastMoveEndToIdleDurationMs,
          },
        });
        logRuntimeFeatureDebugSnapshot({
          overlayMap,
          sourceUrl,
          reason: "maplibre:idle",
        });
      };
      overlayMap.on("idle", handleIdle);

      const resizeObserver = typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
          sync("overlay:resize-observer");
        });
      resizeObserver?.observe(overlayRef.current);

      if (process.env.NODE_ENV !== "production") {
        console.info("[AdminPmtilesOverlay] mounted", {
          sourceUrl,
          enableAdminPmtilesOverlay,
          enableHkMoSpecialRuntime: false,
          eventNames: ADMIN_PMTILES_EVENT_NAMES,
          center: initialViewport.center,
          zoom: initialViewport.zoom,
          visiblePmtilesLayers: getVisibleAdminPmtilesLayers(initialViewport.zoom),
          pmtilesOnly: isAdminPmtilesOnlyModeEnabled(),
          legacyAdminOverlayDisabled: isAdminPmtilesOnlyModeEnabled(),
          mapLibreOverlayLoaded,
          mapLibreOverlayIdle,
          mapLibreOptions: {
            fadeDuration: 0,
            maxTileCacheSize: 768,
            maxTileCacheZoomLevels: 8,
          },
          workerSetup,
          coordinateMode: resolveAdminPmtilesCoordinateState(sourceUrl).pmtilesCoordinateSystem,
        });
      }

      return () => {
        if (process.env.NODE_ENV !== "production") {
          const debugWindow = window as Window & {
            __wanderlyAdminPmtilesMap?: MapLibreMap;
          };
          if (debugWindow.__wanderlyAdminPmtilesMap === overlayMap) {
            delete debugWindow.__wanderlyAdminPmtilesMap;
          }
        }
        overlayMap.off("error", handleMapLibreError);
        resizeObserver?.disconnect();
        overlayMap.off("idle", handleIdle);
        for (const { eventName, handler } of eventHandlers) {
          amap.off?.(eventName, handler);
        }
      };
    }

    let cleanupListeners: (() => void) | undefined;
    mountOverlay().then((cleanup) => {
      if (disposed) cleanup?.();
      else cleanupListeners = cleanup;
    }).catch((error) => {
      if (!disposed) {
        warnAdminPmtilesOverlayDisabled("mount-failed", error);
        setOverlayDisabled(true);
      }
    });

    return () => {
      disposed = true;
      if (mapInstanceRef.current === map) mapInstanceRef.current = null;
      cleanupListeners?.();
      cleanupAdminPmtilesOverlayMap(map);
      detachProtocol?.();
      map = null;
    };
  }, [
    amapMap,
    enableAdminPmtilesOverlay,
    overlayDisabled,
    overlayEnabled,
    sourceUrl,
  ]);

  if (!overlayEnabled || overlayDisabled) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      data-testid="admin-pmtiles-overlay"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] bg-transparent"
    />
  );
}

function isEnabledEnvValue(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function toMapLibreCenter(center: MapCenter): LngLatLike {
  return [center.lng, center.lat];
}

function getAmapViewport(
  amapMap: AMapMapInstance,
  fallbackCenter?: MapCenter,
  fallbackZoom?: number,
) {
  const center = parseAmapMapCenter(amapMap.getCenter?.()) ?? fallbackCenter ?? {
    lat: 23.1291,
    lng: 113.2644,
  };
  const zoom = Number(amapMap.getZoom?.() ?? fallbackZoom ?? 7);

  return {
    center,
    zoom: Number.isFinite(zoom) ? zoom : 7,
  };
}

function getAmapBounds(amapMap: AMapMapInstance) {
  return parseAmapMapBounds(amapMap.getBounds?.());
}

function getMapLibreCenter(map: MapLibreMap): MapCenter | null {
  const center = map.getCenter();
  const parsed = {
    lng: Number(center.lng),
    lat: Number(center.lat),
  };

  return Number.isFinite(parsed.lng) && Number.isFinite(parsed.lat)
    ? parsed
    : null;
}

function getMapLibreBounds(map: MapLibreMap): MapBounds | null {
  const bounds = map.getBounds();
  const parsed = {
    minLng: Number(bounds.getWest()),
    maxLng: Number(bounds.getEast()),
    minLat: Number(bounds.getSouth()),
    maxLat: Number(bounds.getNorth()),
  };

  if (
    !Number.isFinite(parsed.minLng) ||
    !Number.isFinite(parsed.maxLng) ||
    !Number.isFinite(parsed.minLat) ||
    !Number.isFinite(parsed.maxLat)
  ) {
    return null;
  }

  return parsed;
}

function parsePixel(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as {
    x?: unknown;
    y?: unknown;
    getX?: unknown;
    getY?: unknown;
  };
  const x = typeof record.getX === "function"
    ? Number(record.getX())
    : Number(record.x);
  const y = typeof record.getY === "function"
    ? Number(record.getY())
    : Number(record.y);

  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function getElementSize(element: Element | null | undefined) {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10,
  };
}

function getAmapContainerSize(amapMap: AMapMapInstance) {
  return getElementSize(amapMap.getContainer?.() ?? null);
}

function getMapLibreContainerSize(map: MapLibreMap) {
  return getElementSize(map.getContainer());
}

function getPixelProjectionDebug(
  amapMap: AMapMapInstance,
  overlayMap: MapLibreMap,
  center: MapCenter,
): AdminPmtilesOffsetDebugSnapshot["pixelProjection"] {
  const amapPixel = parsePixel(
    amapMap.lngLatToContainer?.([center.lng, center.lat]),
  );
  const projected = overlayMap.project([center.lng, center.lat]);
  const mapLibrePixel = {
    x: Number(projected.x),
    y: Number(projected.y),
  };
  const hasMapLibrePixel =
    Number.isFinite(mapLibrePixel.x) && Number.isFinite(mapLibrePixel.y);
  const validMapLibrePixel = hasMapLibrePixel ? mapLibrePixel : null;
  const delta = amapPixel && validMapLibrePixel
    ? {
      x: validMapLibrePixel.x - amapPixel.x,
      y: validMapLibrePixel.y - amapPixel.y,
      distancePx: Math.hypot(
        validMapLibrePixel.x - amapPixel.x,
        validMapLibrePixel.y - amapPixel.y,
      ),
    }
    : null;

  return {
    center,
    amapPixel,
    mapLibrePixel: validMapLibrePixel,
    delta,
  };
}

function estimateCenterDeltaMeters(left: MapCenter, right: MapCenter) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusMeters = 6371008.8;
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isAdminPmtilesPanStartReason(reason: string) {
  return [
    "amap:movestart",
    "amap:moving",
    "amap:dragging",
    "amap:mapmove",
    "amap:zoomstart",
  ].includes(reason);
}

function isAdminPmtilesMoveEndReason(reason: string) {
  return [
    "amap:moveend",
    "amap:dragend",
    "amap:zoomend",
    "amap:complete",
  ].includes(reason);
}

function getMapLibreTilesLoaded(map: MapLibreMap) {
  return typeof map.areTilesLoaded === "function"
    ? map.areTilesLoaded()
    : false;
}

function getNowMs() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function roundDebugDuration(value: number) {
  return Math.round(value * 10) / 10;
}

function logOffsetDebugSnapshot(input: {
  amap: AMapMapInstance;
  overlayMap: MapLibreMap;
  sourceUrl: string;
  syncCount: number;
  reason: string;
  fallbackCenter?: MapCenter;
  fallbackZoom?: number;
  pmtilesOnly?: boolean;
  mapLibreOverlayLoaded?: boolean;
}) {
  if (
    process.env.NODE_ENV === "production" ||
    !isAdminPmtilesOffsetDebugEnabled()
  ) {
    return;
  }

  const viewport = getAmapViewport(
    input.amap,
    input.fallbackCenter,
    input.fallbackZoom,
  );
  const snapshot = buildAdminPmtilesOffsetDebugSnapshot({
    reason: input.reason,
    sourceUrl: input.sourceUrl,
    overlaySyncCount: input.syncCount,
    amapCenter: viewport.center,
    amapZoom: viewport.zoom,
    amapViewportBounds: getAmapBounds(input.amap),
    mapLibreCenter: getMapLibreCenter(input.overlayMap),
    mapLibreEffectiveZoom: input.overlayMap.getZoom(),
    pmtilesOverlayBounds: getMapLibreBounds(input.overlayMap),
    pmtilesOnly: input.pmtilesOnly,
    legacyAdminOverlayDisabled: input.pmtilesOnly,
    mapLibreOverlayLoaded: input.mapLibreOverlayLoaded,
    containerSize: {
      amap: getAmapContainerSize(input.amap),
      mapLibre: getMapLibreContainerSize(input.overlayMap),
    },
    pixelProjection: getPixelProjectionDebug(
      input.amap,
      input.overlayMap,
      viewport.center,
    ),
  });

  const debugWindow = window as Window & {
    __wanderlyAdminPmtilesOffsetDebug?: AdminPmtilesOffsetDebugSnapshot;
  };
  debugWindow.__wanderlyAdminPmtilesOffsetDebug = snapshot;
  console.info("[AdminPmtilesOffsetDebug]", snapshot);
}

function logPerformanceDebugSnapshot(input: {
  sourceUrl: string;
  reason: string;
  zoom: number;
  pmtilesOnly?: boolean;
  state: AdminPmtilesPerformanceState;
}) {
  if (
    process.env.NODE_ENV === "production" ||
    !isAdminPmtilesOffsetDebugEnabled()
  ) {
    return;
  }

  const snapshot = buildAdminPmtilesPerfDebugSnapshot(input);
  const debugWindow = window as Window & {
    __wanderlyAdminPmtilesPerfDebug?: AdminPmtilesPerformanceDebugSnapshot;
  };
  debugWindow.__wanderlyAdminPmtilesPerfDebug = snapshot;
  console.info("[AdminPmtilesPerf]", snapshot);
}

function logRuntimeFeatureDebugSnapshot(input: {
  overlayMap: MapLibreMap;
  sourceUrl: string;
  reason: string;
}) {
  if (
    process.env.NODE_ENV === "production" ||
    (!isAdminPmtilesOffsetDebugEnabled() && !isAdminPmtilesDebugLabelsEnabled())
  ) {
    return;
  }

  const snapshot = buildAdminPmtilesRuntimeFeatureDebugSnapshot({
    map: input.overlayMap,
    sourceUrl: input.sourceUrl,
    reason: input.reason,
  });
  const debugWindow = window as Window & {
    __wanderlyAdminPmtilesRuntimeDebug?: AdminPmtilesRuntimeFeatureDebugSnapshot;
  };
  debugWindow.__wanderlyAdminPmtilesRuntimeDebug = snapshot;
  console.info("[AdminPmtilesRuntimeDebug]", snapshot);
}

export function registerPmtilesProtocol(
  maplibregl: typeof import("maplibre-gl"),
  Protocol: typeof import("pmtiles").Protocol,
) {
  if (!registeredProtocolCleanup) {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    registeredProtocolInstallCount += 1;
    registeredProtocolCleanup = () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }

  registeredProtocolUsers += 1;

  return () => {
    registeredProtocolUsers = Math.max(0, registeredProtocolUsers - 1);

    if (registeredProtocolUsers === 0) {
      registeredProtocolCleanup?.();
      registeredProtocolCleanup = null;
    }
  };
}
