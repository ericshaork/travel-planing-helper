import "server-only";

import { BaseDataHubProvider } from "./providerTypes";

export class GooglePlacesDataHubProvider extends BaseDataHubProvider {
  id = "google_places";
  displayName = "Google Maps / Places";
  capabilities = {};

  constructor(readonly apiKey: string | null) {
    super();
  }
}
