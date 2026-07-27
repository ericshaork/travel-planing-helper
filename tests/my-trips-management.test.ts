import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createProjectPatchHandler } from "../app/api/projects/[projectId]/route";
import { createTripsGetHandler } from "../app/api/trips/route";
import { getProjectSession } from "../lib/projects/session";
import { openSavedTripIntoWorkspace } from "../lib/trips/open-flow";
import type { StorageLike } from "../lib/trip/storage";

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

function createProjectClientMock(options?: {
  projectRow?: Record<string, unknown> | null;
  versionRow?: Record<string, unknown> | null;
  sourceRows?: Array<Record<string, unknown>>;
  tripPlanRows?: Array<Record<string, unknown>>;
  allowUpdate?: boolean;
}) {
  const projectRow = {
    id: "project-1",
    user_id: "user-1",
    title: "Yunnan trip",
    lifecycle_state: "workspace",
    current_flow_stage: "workspace_ready",
    current_version_id: "version-1",
    last_activity_at: "2026-07-23T10:00:00.000Z",
    created_at: "2026-07-23T09:00:00.000Z",
    updated_at: "2026-07-23T10:00:00.000Z",
    ...(options?.projectRow ?? {}),
  };
  const versionRow = {
    id: "version-1",
    project_id: "project-1",
    version_number: 1,
    version_status: "accepted",
    created_from: "ai_generate",
    trip_plan_json: {
      tripTitle: "Yunnan trip",
      summary: "mock",
      destination: "Yunnan",
      days: 5,
      travelStyleSummary: "relaxed",
      weatherSummary: {
        available: false,
        overview: "mock",
        dailyForecast: [],
        alerts: [],
        reminders: [],
        dataNote: "mock",
      },
      budgetSummary: {
        totalEstimate: "6000",
        transport: "1200",
        hotel: "2200",
        food: "1000",
        tickets: "800",
        localTransport: "300",
        flexibleSpending: "500",
        note: "mock",
      },
      hotelAreaAdvice: [],
      transportAdvice: {
        summary: "mock",
        options: [
          {
            mode: "other",
            pros: ["mock"],
            cons: ["mock"],
            recommendation: "mock",
          },
        ],
        suggestedPlatforms: [],
        note: "mock",
      },
      dailyItinerary: Array.from({ length: 5 }, (_, index) => ({
        day: index + 1,
        theme: "mock",
        routeOrder: ["mock"],
        routeReason: "mock",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      })),
      generalTips: [],
      warnings: [],
    },
    trip_request_snapshot_json: {
      departureCity: "Shenzhen",
      destinationCity: "Yunnan",
      days: 5,
      budget: 6000,
      currency: "CNY",
      interests: ["food"],
      travelStyles: ["relaxed"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    },
    proposal_summary_json: null,
    created_by: "assistant",
    created_at: "2026-07-23T10:00:00.000Z",
    updated_at: "2026-07-23T10:00:00.000Z",
    ...(options?.versionRow ?? {}),
  };
  const sourceRows = options?.sourceRows ?? [
    {
      id: "source-1",
      project_id: "project-1",
      source_type: "blank_input",
      source_title: null,
      source_payload_json: {},
      created_at: "2026-07-23T09:00:00.000Z",
      updated_at: "2026-07-23T09:00:00.000Z",
    },
  ];

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
          },
        },
        error: null,
      }),
    },
    from(table: string) {
      return {
        select() {
          const state: Record<string, unknown> = { filters: {} };
          const rowsForTable = () => {
            if (table === "travel_projects") {
              return options?.projectRow === null ? [] : [projectRow];
            }

            if (table === "travel_project_versions") {
              return versionRow ? [versionRow] : [];
            }

            if (table === "travel_project_sources") {
              return sourceRows;
            }

            if (table === "trip_plans") {
              return options?.tripPlanRows ?? [];
            }

            return [];
          };

          const queryResult = {
            then(resolve: (value: { data: unknown; error: unknown }) => unknown) {
              return Promise.resolve(resolve({ data: rowsForTable(), error: null }));
            },
          };

          const base = {
            eq(column: string, value: unknown) {
              state.filters[column] = value;
              return base;
            },
            ilike(_column: string, _value: string) {
              return base;
            },
            order(_column: string, _options?: { ascending?: boolean; nullsFirst?: boolean }) {
              return base;
            },
            maybeSingle: async () => ({
              data: rowsForTable()[0] ?? null,
              error: null,
            }),
            then: queryResult.then,
          };

          return base;
        },
        update(payload: Record<string, unknown>) {
          return {
            eq(_column: string, _value: unknown) {
              return {
                select() {
                  return {
                    maybeSingle: async () => {
                      if (options?.allowUpdate === false || options?.projectRow === null) {
                        return {
                          data: null,
                          error: null,
                        };
                      }

                      Object.assign(projectRow, payload, {
                        updated_at: "2026-07-23T12:00:00.000Z",
                        last_activity_at:
                          typeof payload.last_activity_at === "string"
                            ? payload.last_activity_at
                            : "2026-07-23T12:00:00.000Z",
                      });

                      return {
                        data: projectRow,
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("my trips management", () => {
  it("renames a project successfully", async () => {
    const handler = createProjectPatchHandler(
      () => createProjectClientMock() as never,
    );

    const response = await handler(
      new Request("http://localhost/api/projects/project-1", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Yunnan food trip",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      project: {
        title: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.project.title).toBe("Yunnan food trip");
  });

  it("archives a project successfully", async () => {
    const handler = createProjectPatchHandler(
      () => createProjectClientMock() as never,
    );

    const response = await handler(
      new Request("http://localhost/api/projects/project-1", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lifecycleState: "archived",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      project: {
        lifecycleState: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.project.lifecycleState).toBe("archived");
  });

  it("keeps archived projects restorable into workspace", async () => {
    const storage = new MemoryStorage();

    await openSavedTripIntoWorkspace(
      {
        id: "project:project-1",
        entity_type: "project",
        project_id: "project-1",
        current_version_id: "version-1",
        project_lifecycle_state: "archived",
        title: "Archived Yunnan trip",
        destination_city: "Yunnan",
        start_date: null,
        end_date: null,
        days: 5,
        budget: 6000,
        cover_image_url: null,
        source_type: "ai_generated",
        status: "archived",
        trip_preferences_json: {},
        local_draft_id: null,
        last_opened_at: null,
        created_at: "2026-07-23T09:00:00.000Z",
        updated_at: "2026-07-23T10:00:00.000Z",
      },
      {
        storage,
        navigate: vi.fn(),
      },
    );

    expect(getProjectSession(storage)?.projectId).toBe("project-1");
    expect(getProjectSession(storage)?.versionId).toBe("version-1");
  });

  it("blocks updates when the project is not accessible to the current user", async () => {
    const handler = createProjectPatchHandler(
      () => createProjectClientMock({ projectRow: null, allowUpdate: false }) as never,
    );

    const response = await handler(
      new Request("http://localhost/api/projects/project-2", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Forbidden rename",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-2",
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("keeps legacy trip_plans fallback unchanged", async () => {
    const handler = createTripsGetHandler(
      () =>
        createProjectClientMock({
          projectRow: null,
          tripPlanRows: [
            {
              id: "trip-legacy-1",
              title: "Legacy trip",
              destination_city: "Chengdu",
              start_date: null,
              end_date: null,
              days: 4,
              budget: 3000,
              cover_image_url: null,
              source_type: "ai_generated",
              status: "saved",
              trip_preferences_json: {},
              local_draft_id: null,
              last_opened_at: null,
              created_at: "2026-07-20T10:00:00.000Z",
              updated_at: "2026-07-21T10:00:00.000Z",
            },
          ],
        }) as never,
    );

    const response = await handler(
      new Request("http://localhost/api/trips", {
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    );
    const payload = (await response.json()) as {
      ok: true;
      trips: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(payload.trips[0]?.id).toBe("trip-legacy-1");
  });
});
