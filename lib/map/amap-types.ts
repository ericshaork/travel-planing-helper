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

export interface AMapMapInstance {
  destroy: () => void;
  setCenter?: (center: AMapLngLatTuple) => void;
  setZoom?: (zoom: number) => void;
  setZoomAndCenter?: (zoom: number, center: AMapLngLatTuple) => void;
  setFitView?: (items?: Array<AMapMarkerInstance | AMapLngLatLike>) => void;
  add?: (overlays: AMapMarkerInstance | AMapMarkerInstance[]) => void;
  remove?: (overlays: AMapMarkerInstance | AMapMarkerInstance[]) => void;
}

export interface AMapMapOptions {
  zoom: number;
  center: AMapLngLatTuple;
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
  label?: AMapMarkerLabel;
  zIndex?: number;
}

export interface AMapMarkerInstance {
  setMap: (map: AMapMapInstance | null) => void;
  setPosition?: (position: AMapLngLatLike) => void;
  setLabel?: (label: AMapMarkerLabel) => void;
  setTitle?: (title: string) => void;
  setzIndex?: (zIndex: number) => void;
  on?: (eventName: string, handler: () => void) => void;
}

export interface AMapMarkerConstructor {
  new (options: AMapMarkerOptions): AMapMarkerInstance;
}

export interface AMapBoundsInstance {
  contains?: (lngLat: AMapLngLatLike) => boolean;
}

export interface AMapGlobal {
  Map?: AMapMapConstructor;
  Marker?: AMapMarkerConstructor;
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
