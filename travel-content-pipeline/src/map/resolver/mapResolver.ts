import { MapAssetRepository, type MapAssetRepositoryOptions } from "../repository/mapAssetRepository.js";
import type { MapPOIAsset, RouteFact, RouteMode } from "../types.js";

export interface MapResolverOptions extends MapAssetRepositoryOptions {}

export class MapResolver {
  private readonly repository: MapAssetRepository;

  constructor(options?: MapResolverOptions) {
    this.repository = new MapAssetRepository(options);
  }

  async resolvePoi(name: string): Promise<MapPOIAsset | undefined> {
    return this.repository.getPoiByName(name);
  }

  async resolveRoute(from: string, to: string, mode: RouteMode): Promise<RouteFact | undefined> {
    return this.repository.getRouteFact(from, to, mode);
  }
}
