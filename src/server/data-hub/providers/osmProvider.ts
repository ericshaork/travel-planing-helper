import "server-only";

import { BaseDataHubProvider } from "./providerTypes";

export class OsmDataHubProvider extends BaseDataHubProvider {
  id = "osm";
  displayName = "OpenStreetMap / Overpass / Nominatim";
  capabilities = {};

  constructor(readonly options: { overpassApiUrl: string | null; nominatimBaseUrl: string | null; osmUserAgent: string | null }) {
    super();
  }
}
