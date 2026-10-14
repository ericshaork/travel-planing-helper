import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DataHubNormalizedReadService, stripRawProviderPayload } from "../../src/server/data-hub/normalizedReadService";

function parseEnvFile(envPath: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(envPath)) return values;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const name = match[1];
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

const runRemoteSmoke = process.env.DATAHUB_REMOTE_SMOKE === "1";

describe.runIf(runRemoteSmoke)("Data Hub normalized read remote smoke", () => {
  it("reads the Step3 normalized sample through DataHubNormalizedReadService", async () => {
    const env = parseEnvFile(resolve(process.cwd(), ".env.local"));
    const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim();
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    expect(url).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();

    const client = createClient(url!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const service = new DataHubNormalizedReadService(client as never);

    const { data: places, error: placesError } = await client
      .from("places")
      .select("id,name,source_external_id")
      .in("source_external_id", ["amap:shenzhen-bay-park", "amap:window-of-the-world-shenzhen"])
      .order("source_external_id", { ascending: true });
    expect(placesError).toBeNull();
    expect(places ?? []).toHaveLength(2);

    const shenzhenBay = places?.find((place) => place.source_external_id === "amap:shenzhen-bay-park");
    const windowOfWorld = places?.find((place) => place.source_external_id === "amap:window-of-the-world-shenzhen");
    expect(shenzhenBay?.id).toBeTruthy();
    expect(windowOfWorld?.id).toBeTruthy();

    const facts = await service.getPlaceFacts({ placeId: shenzhenBay!.id, limit: 20 });
    const weather = await service.getWeather({ provider: "qweather", limit: 5 });
    const routes = await service.getRouteCache({
      originPlaceId: shenzhenBay!.id,
      destinationPlaceId: windowOfWorld!.id,
      provider: "graphhopper",
      mode: "walking",
      limit: 5,
    });

    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0]).toHaveProperty("source");
    expect(facts[0]).toHaveProperty("verificationStatus");
    expect(weather.length).toBeGreaterThan(0);
    expect(weather[0]).toHaveProperty("source");
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]).toHaveProperty("source");

    expect(() => stripRawProviderPayload({ facts, weather, routes })).not.toThrow();
  });
});

describe.skipIf(runRemoteSmoke)("Data Hub normalized read remote smoke", () => {
  it("is skipped unless DATAHUB_REMOTE_SMOKE=1", () => {
    expect(runRemoteSmoke).toBe(false);
  });
});
