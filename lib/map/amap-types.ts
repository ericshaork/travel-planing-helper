export type AmapLoaderStatus = "idle" | "loading" | "ready" | "error";

export type AmapLoadErrorCode =
  | "ssr_unavailable"
  | "missing_js_key"
  | "script_load_failed"
  | "amap_not_available";

export interface AMapSecurityConfig {
  securityJsCode: string;
}

export type AMapLngLatTuple = [lng: number, lat: number];
export type AMapLngLatLike = AMapLngLatTuple;
export type AMapMapFeature = "bg" | "point" | "road" | "building";
export type AMapOverlayInstance =
  | AMapMarkerInstance
  | AMapPolygonInstance
  | AMapPolylineInstance;

export interface AMapMapInstance {
  destroy: () => void;
  setCenter?: (center: AMapLngLatTuple) => void;
  setZoom?: (zoom: number) => void;
  setZoomAndCenter?: (zoom: number, center: AMapLngLatTuple) => void;
  setFitView?: (items?: Array<AMapOverlayInstance | AMapLngLatLike>) => void;
  setMapStyle?: (mapStyle: string) => void;
  getZoom?: () => number;
  getCenter?: () => AMapLngLatLike | AMapDistrictBoundaryPoint | string;
  getBounds?: () => AMapBoundsInstance;
  getContainer?: () => HTMLElement;
  lngLatToContainer?: (
    lngLat: AMapLngLatLike | AMapDistrictBoundaryPoint | string,
  ) => unknown;
  add?: (overlays: AMapOverlayInstance | AMapOverlayInstance[]) => void;
  remove?: (overlays: AMapOverlayInstance | AMapOverlayInstance[]) => void;
  on?: (eventName: string, handler: () => void) => void;
  off?: (eventName: string, handler: () => void) => void;
}

export interface AMapMapOptions {
  zoom: number;
  center: AMapLngLatTuple;
  mapStyle?: string;
  features?: AMapMapFeature[];
  showLabel?: boolean;
}

export interface AMapMapConstructor {
  new (container: HTMLElement, options: AMapMapOptions): AMapMapInstance;
}

export interface AMapMarkerLabel {
  content: string;
  direction?: "top" | "right" | "bottom" | "left";
  offset?: [x: number, y: number];
}

export interface AMapMarkerOptions {
  position: AMapLngLatLike;
  title?: string;
  content?: string | HTMLElement;
  offset?: [x: number, y: number];
  anchor?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "middle-left"
    | "center"
    | "middle-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  label?: AMapMarkerLabel;
  zIndex?: number;
}

export interface AMapMarkerInstance {
  setMap: (map: AMapMapInstance | null) => void;
  setContent?: (content: string | HTMLElement) => void;
  setPosition?: (position: AMapLngLatLike) => void;
  setLabel?: (label: AMapMarkerLabel) => void;
  setTitle?: (title: string) => void;
  setzIndex?: (zIndex: number) => void;
  on?: (eventName: string, handler: () => void) => void;
}

export interface AMapMarkerConstructor {
  new (options: AMapMarkerOptions): AMapMarkerInstance;
}

export interface AMapPolygonOptions {
  path: AMapLngLatLike[];
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  zIndex?: number;
  extData?: unknown;
}

export interface AMapPolylineOptions {
  path: AMapLngLatLike[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  strokeStyle?: "solid" | "dashed";
  lineJoin?: "miter" | "round" | "bevel";
  lineCap?: "butt" | "round" | "square";
  zIndex?: number;
  extData?: unknown;
}

export interface AMapPolygonInstance {
  setMap: (map: AMapMapInstance | null) => void;
  setOptions?: (options: Partial<AMapPolygonOptions>) => void;
  setPath?: (path: AMapLngLatLike[]) => void;
  on?: (eventName: string, handler: () => void) => void;
}

export interface AMapPolylineInstance {
  setMap: (map: AMapMapInstance | null) => void;
  setOptions?: (options: Partial<AMapPolylineOptions>) => void;
  setPath?: (path: AMapLngLatLike[]) => void;
  on?: (eventName: string, handler: () => void) => void;
}

export interface AMapTrafficLayerOptions {
  zIndex?: number;
  opacity?: number;
  autoRefresh?: boolean;
}

export interface AMapTrafficLayerInstance {
  setMap: (map: AMapMapInstance | null) => void;
  setOpacity?: (opacity: number) => void;
  setOptions?: (options: Partial<AMapTrafficLayerOptions>) => void;
}

export interface AMapDistrictSearchOptions {
  extensions?: "all" | "base";
  subdistrict?: number;
  level?: "country" | "province" | "city" | "district" | "biz_area";
  showbiz?: boolean;
}

export interface AMapDistrictBoundaryPoint {
  getLng?: () => number;
  getLat?: () => number;
  lng?: number;
  lat?: number;
}

export interface AMapDistrictSearchDistrict {
  name?: string;
  adcode?: string;
  level?: string;
  center?: string | AMapLngLatLike | AMapDistrictBoundaryPoint;
  boundaries?: Array<Array<AMapLngLatLike | AMapDistrictBoundaryPoint>>;
  districtList?: AMapDistrictSearchDistrict[];
}

export interface AMapDistrictSearchResult {
  districtList?: AMapDistrictSearchDistrict[];
}

export interface AMapPolygonConstructor {
  new (options: AMapPolygonOptions): AMapPolygonInstance;
}

export interface AMapPolylineConstructor {
  new (options: AMapPolylineOptions): AMapPolylineInstance;
}

export interface AMapTrafficLayerConstructor {
  new (options?: AMapTrafficLayerOptions): AMapTrafficLayerInstance;
}

export interface AMapDistrictSearchInstance {
  search: (
    keyword: string,
    callback: (
      status: string,
      result: AMapDistrictSearchResult | string,
    ) => void,
  ) => void;
}

export interface AMapDistrictSearchConstructor {
  new (options?: AMapDistrictSearchOptions): AMapDistrictSearchInstance;
}

export interface AMapBoundsInstance {
  contains?: (lngLat: AMapLngLatLike) => boolean;
  getSouthWest?: () => AMapLngLatLike | AMapDistrictBoundaryPoint | string;
  getNorthEast?: () => AMapLngLatLike | AMapDistrictBoundaryPoint | string;
}

export interface AMapGlobal {
  Map?: AMapMapConstructor;
  Marker?: AMapMarkerConstructor;
  Polygon?: AMapPolygonConstructor;
  Polyline?: AMapPolylineConstructor;
  TrafficLayer?: AMapTrafficLayerConstructor;
  DistrictSearch?: AMapDistrictSearchConstructor;
  TileLayer?: {
    Traffic?: AMapTrafficLayerConstructor;
  };
  Bounds?: new (...args: unknown[]) => AMapBoundsInstance;
  plugin?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

export interface AmapLoadError {
  code: AmapLoadErrorCode;
  message: string;
  status: Exclude<AmapLoaderStatus, "idle" | "ready">;
}

export type AmapLoadResult =
  | {
      ok: true;
      status: "ready";
      amap: AMapGlobal;
      source: "window" | "script";
    }
  | {
      ok: false;
      status: Exclude<AmapLoaderStatus, "idle" | "ready">;
      error: AmapLoadError;
    };

declare global {
  interface Window {
    AMap?: AMapGlobal;
    _AMapSecurityConfig?: AMapSecurityConfig;
  }
}

export {};
