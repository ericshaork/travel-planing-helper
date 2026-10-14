export const MAPLIBRE_WORKER_URL =
  "/vendor/maplibre/maplibre-gl-csp-worker.js";

type MapLibreWorkerModule = Pick<
  typeof import("maplibre-gl"),
  "getWorkerUrl" | "setWorkerUrl"
>;

export interface MapLibreWorkerSetupResult {
  configured: boolean;
  reason: "browser" | "server" | "missing-api" | "already-configured";
  workerUrl: string;
}

export function setupMapLibreWorker(
  maplibregl: Partial<MapLibreWorkerModule>,
  workerUrl = MAPLIBRE_WORKER_URL,
): MapLibreWorkerSetupResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { configured: false, reason: "server", workerUrl };
  }

  if (typeof maplibregl.setWorkerUrl !== "function") {
    return { configured: false, reason: "missing-api", workerUrl };
  }

  if (
    typeof maplibregl.getWorkerUrl === "function" &&
    maplibregl.getWorkerUrl() === workerUrl
  ) {
    return { configured: false, reason: "already-configured", workerUrl };
  }

  maplibregl.setWorkerUrl(workerUrl);

  return { configured: true, reason: "browser", workerUrl };
}
