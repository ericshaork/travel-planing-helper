import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MapPOIAsset, RouteFact, RouteMode } from "../types.js";

export interface MapAssetRepositoryOptions {
  projectRoot?: string;
  city?: string;
}

interface MapAssetDataset {
  pois: MapPOIAsset[];
  routes: RouteFact[];
}

export class MapAssetRepository {
  private readonly projectRoot: string;
  private readonly city: string;
  private datasetPromise: Promise<MapAssetDataset> | undefined;

  constructor(options?: MapAssetRepositoryOptions) {
    this.projectRoot = options?.projectRoot ?? process.cwd();
    this.city = options?.city ?? "beijing";
  }

  async getAllPois(): Promise<MapPOIAsset[]> {
    const dataset = await this.loadDataset();
    return dataset.pois;
  }

  async getAllRouteFacts(): Promise<RouteFact[]> {
    const dataset = await this.loadDataset();
    return dataset.routes;
  }

  async getPoiByName(name: string): Promise<MapPOIAsset | undefined> {
    const dataset = await this.loadDataset();
    const normalizedTarget = normalizeName(name);

    return dataset.pois.find((poi) => normalizeName(poi.name) === normalizedTarget);
  }

  async getRouteFact(from: string, to: string, mode: RouteMode): Promise<RouteFact | undefined> {
    const dataset = await this.loadDataset();
    const normalizedFrom = normalizeName(from);
    const normalizedTo = normalizeName(to);

    return dataset.routes.find(
      (route) =>
        normalizeName(route.from) === normalizedFrom &&
        normalizeName(route.to) === normalizedTo &&
        route.mode === mode,
    );
  }

  private async loadDataset(): Promise<MapAssetDataset> {
    if (!this.datasetPromise) {
      this.datasetPromise = this.readDataset();
    }

    return this.datasetPromise;
  }

  private async readDataset(): Promise<MapAssetDataset> {
    const baseDir = path.resolve(this.projectRoot, "input", "maps_v1", this.city);
    const poiFilePath = path.join(baseDir, "poi_assets.json");
    const routeFilePath = path.join(baseDir, "route_facts.json");

    const [poiContent, routeContent] = await Promise.all([
      readFile(poiFilePath, "utf8"),
      readFile(routeFilePath, "utf8"),
    ]);

    const pois = JSON.parse(poiContent) as MapPOIAsset[];
    const routes = JSON.parse(routeContent) as RouteFact[];

    return {
      pois,
      routes,
    };
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
