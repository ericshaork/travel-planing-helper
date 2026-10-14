import "server-only";

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function normalizeEnvValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function firstEnvValue(source: EnvironmentSource, names: readonly string[]): string | null {
  for (const name of names) {
    const value = normalizeEnvValue(source[name]);
    if (value) return value;
  }
  return null;
}

export const GOOGLE_ENV_ALIASES = ["Google_MAP_API", "GOOGLE_MAPS_API_KEY", "GOOGLE_PLACES_API_KEY"] as const;
export const WIKIMEDIA_ENV_ALIASES = [
  "WIKIDATA_SPARQL_URL",
  "WIKIDATA_SPARQL_ENDPOINT",
  "WIKIMEDIA_API_URL",
  "WIKIMEDIA_COMMONS_API_URL",
  "WIKIPEDIA_API_URL",
  "WIKIPEDIA_ZH_API_URL",
  "WIKIPEDIA_EN_API_URL",
] as const;
export const OSM_ENV_ALIASES = ["NOMINATIM_BASE_URL", "OVERPASS_API_URL", "OSM_USER_AGENT"] as const;

export interface DataHubEnv {
  amapApiKey: string | null;
  googleMapsApiKey: string | null;
  wikidataSparqlUrl: string | null;
  wikimediaApiUrl: string | null;
  wikimediaCommonsApiUrl: string | null;
  wikipediaApiUrl: string | null;
  wikipediaZhApiUrl: string | null;
  wikipediaEnApiUrl: string | null;
  overpassApiUrl: string | null;
  nominatimBaseUrl: string | null;
  osmUserAgent: string | null;
  qweatherApiKey: string | null;
  qweatherBaseUrl: string | null;
  weatherProvider: string | null;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
}

export interface DataHubEnvStatus {
  amapConfigured: boolean;
  googleConfigured: boolean;
  wikimediaConfigured: boolean;
  osmConfigured: boolean;
  weatherConfigured: boolean;
  supabaseServiceConfigured: boolean;
}

export function getDataHubEnv(source: EnvironmentSource = process.env): DataHubEnv {
  return {
    amapApiKey: normalizeEnvValue(source.AMAP_API_KEY),
    googleMapsApiKey: firstEnvValue(source, GOOGLE_ENV_ALIASES),
    wikidataSparqlUrl: firstEnvValue(source, ["WIKIDATA_SPARQL_URL", "WIKIDATA_SPARQL_ENDPOINT"]),
    wikimediaApiUrl: normalizeEnvValue(source.WIKIMEDIA_API_URL),
    wikimediaCommonsApiUrl: normalizeEnvValue(source.WIKIMEDIA_COMMONS_API_URL),
    wikipediaApiUrl: normalizeEnvValue(source.WIKIPEDIA_API_URL),
    wikipediaZhApiUrl: normalizeEnvValue(source.WIKIPEDIA_ZH_API_URL),
    wikipediaEnApiUrl: normalizeEnvValue(source.WIKIPEDIA_EN_API_URL),
    overpassApiUrl: normalizeEnvValue(source.OVERPASS_API_URL),
    nominatimBaseUrl: normalizeEnvValue(source.NOMINATIM_BASE_URL),
    osmUserAgent: normalizeEnvValue(source.OSM_USER_AGENT),
    qweatherApiKey: normalizeEnvValue(source.QWEATHER_API_KEY),
    qweatherBaseUrl: normalizeEnvValue(source.QWEATHER_BASE_URL),
    weatherProvider: normalizeEnvValue(source.WEATHER_PROVIDER),
    supabaseUrl: normalizeEnvValue(source.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRoleKey: normalizeEnvValue(source.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export function getDataHubEnvStatus(source: EnvironmentSource = process.env): DataHubEnvStatus {
  const env = getDataHubEnv(source);
  return {
    amapConfigured: env.amapApiKey !== null,
    googleConfigured: env.googleMapsApiKey !== null,
    wikimediaConfigured:
      env.wikidataSparqlUrl !== null ||
      env.wikimediaApiUrl !== null ||
      env.wikimediaCommonsApiUrl !== null ||
      env.wikipediaApiUrl !== null ||
      env.wikipediaZhApiUrl !== null ||
      env.wikipediaEnApiUrl !== null,
    osmConfigured: env.overpassApiUrl !== null || env.nominatimBaseUrl !== null || env.osmUserAgent !== null,
    weatherConfigured: env.qweatherApiKey !== null || env.weatherProvider !== null,
    supabaseServiceConfigured: env.supabaseUrl !== null && env.supabaseServiceRoleKey !== null,
  };
}
