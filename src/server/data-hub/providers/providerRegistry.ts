import "server-only";

import { getDataHubEnv, type EnvironmentSource } from "../env";
import { AmapDataHubProvider } from "./amapProvider";
import { GooglePlacesDataHubProvider } from "./googlePlacesProvider";
import { OsmDataHubProvider } from "./osmProvider";
import type { DataHubProviderAdapter } from "./providerTypes";
import { WeatherDataHubProvider } from "./weatherProvider";
import { WikimediaDataHubProvider } from "./wikimediaProvider";

export interface DataHubProviderRegistry {
  providers: DataHubProviderAdapter[];
  byId(id: string): DataHubProviderAdapter | null;
  supporting(capability: keyof DataHubProviderAdapter["capabilities"]): DataHubProviderAdapter[];
}

export interface CreateProviderRegistryOptions {
  source?: EnvironmentSource;
  fetchImplementation?: typeof fetch;
  now?: () => Date;
}

export function createProviderRegistry(options: CreateProviderRegistryOptions = {}): DataHubProviderRegistry {
  const env = getDataHubEnv(options.source);
  const providers: DataHubProviderAdapter[] = [
    new AmapDataHubProvider({ apiKey: env.amapApiKey, fetchImplementation: options.fetchImplementation, now: options.now }),
    new GooglePlacesDataHubProvider(env.googleMapsApiKey),
    new WikimediaDataHubProvider({
      wikipediaApiUrl: env.wikipediaApiUrl,
      wikipediaZhApiUrl: env.wikipediaZhApiUrl,
      wikipediaEnApiUrl: env.wikipediaEnApiUrl,
      wikimediaCommonsApiUrl: env.wikimediaCommonsApiUrl,
      wikidataSparqlUrl: env.wikidataSparqlUrl,
      fetchImplementation: options.fetchImplementation,
      now: options.now,
    }),
    new OsmDataHubProvider({ overpassApiUrl: env.overpassApiUrl, nominatimBaseUrl: env.nominatimBaseUrl, osmUserAgent: env.osmUserAgent }),
    new WeatherDataHubProvider({ apiKey: env.qweatherApiKey, baseUrl: env.qweatherBaseUrl, provider: env.weatherProvider }),
  ];

  return {
    providers,
    byId(id: string) {
      return providers.find((provider) => provider.id === id) ?? null;
    },
    supporting(capability) {
      return providers.filter((provider) => provider.capabilities[capability]);
    },
  };
}
