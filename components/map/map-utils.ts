import type {
  AMapGlobal,
  AMapLngLatTuple,
  AMapMarkerInstance,
  AMapMarkerOptions,
  AMapMapInstance,
  AMapMapOptions,
} from "../../lib/map/amap-types";
import type { AmapLoadErrorCode } from "../../lib/map/amap-types";
import type { MapPoint } from "../../lib/trip/enrichment-types";

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface AmapBaseMapConfig {
  center?: MapCenter;
  zoom?: number;
}

export interface MapErrorCopy {
  title: string;
  description: string;
}

export interface AmapMarkerPoint {
  id: string;
  name: string;
  coordinates: MapCenter;
  order: number;
  status: "confirmed" | "unresolved";
}

export interface AmapMarkerLayerResult {
  markerPoints: AmapMarkerPoint[];
  unresolvedCount: number;
}

export interface CreateAmapMarkerLayerOptions {
  activePointId?: string | null;
  markerLabel?: boolean;
  onMarkerClick?: (pointId: string) => void;
}

export const DEFAULT_AMAP_CENTER: MapCenter = {
  lat: 35.8617,
  lng: 104.1954,
};

export const DEFAULT_AMAP_ZOOM = 4;
export const SINGLE_POINT_ZOOM = 13;
const DEFAULT_MARKER_Z_INDEX = 110;
const ACTIVE_MARKER_Z_INDEX = 160;

function isFiniteCoordinate(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidMapCenter(center: Partial<MapCenter> | undefined): center is MapCenter {
  return Boolean(
    center &&
      isFiniteCoordinate(center.lat) &&
      isFiniteCoordinate(center.lng) &&
      Math.abs(center.lat) <= 90 &&
      Math.abs(center.lng) <= 180,
  );
}

export function toAmapLngLatTuple(
  center: MapCenter = DEFAULT_AMAP_CENTER,
): AMapLngLatTuple {
  return [center.lng, center.lat];
}

export function buildAmapMapOptions(
  config: AmapBaseMapConfig = {},
): AMapMapOptions {
  return {
    center: toAmapLngLatTuple(
      isValidMapCenter(config.center) ? config.center : DEFAULT_AMAP_CENTER,
    ),
    zoom: config.zoom ?? DEFAULT_AMAP_ZOOM,
  };
}

export function buildAmapMarkerLayer(
  points: MapPoint[],
): AmapMarkerLayerResult {
  let unresolvedCount = 0;
  const markerPoints: AmapMarkerPoint[] = [];

  points.forEach((point, index) => {
    const coordinates = point.coordinates;
    const resolvedCoordinates = isValidMapCenter(coordinates)
      ? coordinates
      : undefined;

    if (!point.resolved || !resolvedCoordinates) {
      unresolvedCount += 1;
      return;
    }

    markerPoints.push({
      id: point.id,
      name: point.name,
      coordinates: resolvedCoordinates,
      order: index + 1,
      status: "confirmed",
    });
  });

  return {
    markerPoints,
    unresolvedCount,
  };
}

export function buildAmapMarkerOptions(
  point: AmapMarkerPoint,
  markerLabel = true,
  active = false,
): AMapMarkerOptions {
  return {
    position: toAmapLngLatTuple(point.coordinates),
    title: `${point.order}. ${point.name}`,
    zIndex: active ? ACTIVE_MARKER_Z_INDEX : DEFAULT_MARKER_Z_INDEX,
    ...(markerLabel
      ? {
          label: {
            content: buildAmapMarkerLabelContent(point.order, active),
            direction: "top",
          },
        }
      : {}),
  };
}

export function buildAmapMarkerLabelContent(order: number, active: boolean): string {
  const background = active ? "#2F3E34" : "#FFFDF7";
  const color = active ? "#FFFDF7" : "#7A3F31";
  const border = active ? "#2F3E34" : "#C9B6A7";
  const shadow = active ? "#D9C8BA" : "#EDE2D7";

  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;border:1px solid ${border};background:${background};color:${color};font-size:12px;font-weight:700;box-shadow:2px 2px 0 ${shadow};">${order}</span>`;
}

export function createAmapMapInstance(
  amap: AMapGlobal,
  container: HTMLElement,
  config: AmapBaseMapConfig = {},
): AMapMapInstance | null {
  if (typeof amap.Map !== "function") {
    return null;
  }

  return new amap.Map(container, buildAmapMapOptions(config));
}

export function createAmapMarkerInstances(
  amap: AMapGlobal,
  map: AMapMapInstance,
  points: AmapMarkerPoint[],
  options: CreateAmapMarkerLayerOptions = {},
): AMapMarkerInstance[] {
  if (typeof amap.Marker !== "function") {
    return [];
  }

  const markers: AMapMarkerInstance[] = [];
  const markerLabel = options.markerLabel ?? true;

  for (const point of points) {
    try {
      const active = options.activePointId === point.id;
      const marker = new amap.Marker(
        buildAmapMarkerOptions(point, markerLabel, active),
      );
      marker.setMap(map);
      marker.setzIndex?.(active ? ACTIVE_MARKER_Z_INDEX : DEFAULT_MARKER_Z_INDEX);
      marker.on?.("click", () => {
        options.onMarkerClick?.(point.id);
      });
      markers.push(marker);
    } catch {
      continue;
    }
  }

  return markers;
}

export function clearAmapMarkerInstances(markers: AMapMarkerInstance[]) {
  for (const marker of markers) {
    try {
      marker.setMap(null);
    } catch {
      continue;
    }
  }
}

export function isResolvedMapPoint(point: MapPoint): boolean {
  return point.resolved && isValidMapCenter(point.coordinates);
}

export function getMarkerViewportCenter(points: AmapMarkerPoint[]): MapCenter | null {
  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (accumulator, point) => {
      accumulator.lat += point.coordinates.lat;
      accumulator.lng += point.coordinates.lng;
      return accumulator;
    },
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

export function syncAmapViewport(
  map: AMapMapInstance,
  config: AmapBaseMapConfig = {},
) {
  const center = toAmapLngLatTuple(config.center ?? DEFAULT_AMAP_CENTER);
  const zoom = config.zoom ?? DEFAULT_AMAP_ZOOM;

  if (typeof map.setZoomAndCenter === "function") {
    map.setZoomAndCenter(zoom, center);
    return;
  }

  if (typeof map.setCenter === "function") {
    map.setCenter(center);
  }

  if (typeof map.setZoom === "function") {
    map.setZoom(zoom);
  }
}

export function syncAmapViewportForMarkerPoints(
  map: AMapMapInstance,
  points: AmapMarkerPoint[],
  markers: AMapMarkerInstance[],
  fallbackConfig: AmapBaseMapConfig = {},
  fitToMarkers = true,
) {
  if (points.length === 0) {
    syncAmapViewport(map, fallbackConfig);
    return;
  }

  if (points.length === 1) {
    syncAmapViewport(map, {
      center: points[0]?.coordinates,
      zoom: fallbackConfig.zoom ?? SINGLE_POINT_ZOOM,
    });
    return;
  }

  if (fitToMarkers && typeof map.setFitView === "function" && markers.length > 1) {
    map.setFitView(markers);
    return;
  }

  const averageCenter = getMarkerViewportCenter(points);
  syncAmapViewport(map, {
    center: averageCenter ?? fallbackConfig.center,
    zoom: fallbackConfig.zoom,
  });
}

export function destroyAmapMapInstance(map: AMapMapInstance | null | undefined) {
  map?.destroy();
}

export function getMapErrorCopy(code: AmapLoadErrorCode): MapErrorCopy {
  switch (code) {
    case "missing_js_key":
      return {
        title: "前端地图 Key 还没配好",
        description: "这台设备暂时没法把地图加载出来，但行程内容还是可以正常看。",
      };
    case "ssr_unavailable":
      return {
        title: "地图需要在浏览器里打开",
        description: "当前环境还不能直接显示地图，换到浏览器里就能继续加载。",
      };
    case "script_load_failed":
      return {
        title: "地图脚本这次没接上",
        description: "先保留这个占位，行程仍可正常查看，稍后再刷新试一次。",
      };
    case "amap_not_available":
      return {
        title: "地图没有完成初始化",
        description: "这次地图没有顺利准备好，但不会影响你继续看行程和路线信息。",
      };
    default:
      return {
        title: "地图暂时不可用",
        description: "先看文字版行程，地图恢复后再补上。",
      };
  }
}
