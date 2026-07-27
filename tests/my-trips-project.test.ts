import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTripsGetHandler } from "../app/api/trips/route";
import { createProjectTripsService } from "../lib/projects/trips/service";
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

function createSupabaseClientMock(options?: {
  projectRows?: Array<Record<string, unknown>>;
  versionRows?: Record<string, Record<string, unknown>>;
  sourceRows?: Record<string, Array<Record<string, unknown>>>;
  tripPlanRows?: Array<Record<string, unknown>>;
}) {
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

          const applyRows = () => {
            if (table === "travel_projects") {
              return options?.projectRows ?? [];
            }

            if (table === "travel_project_versions") {
              const projectId = state.filters.project_id as string;
              const versionId = state.filters.id as string;
              const version = options?.versionRows?.[projectId]?.[versionId];
              return version ? [version] : [];
            }

            if (table === "travel_project_sources") {
              const projectId = state.filters.project_id as string;
              return options?.sourceRows?.[projectId] ?? [];
            }

            if (table === "trip_plans") {
              return options?.tripPlanRows ?? [];
            }

            return [];
          };

          const queryResult = {
            then(resolve: (value: { data: unknown; error: unknown }) => unknown) {
              return Promise.resolve(resolve({ data: applyRows(), error: null }));
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
              data: applyRows()[0] ?? null,
              error: null,
            }),
            then: queryResult.then,
          };

          return base;
        },
      };
    },
  };
}

describe("project trips service", () => {
  it("returns project summaries with current version information", async () => {
    const client = createSupabaseClientMock({
      projectRows: [
        {
          id: "project-1",
          user_id: "user-1",
          title: "Yunnan trip",
          lifecycle_state: "workspace",
          current_flow_stage: "workspace_ready",
          current_version_id: "version-2",
          last_activity_at: "2026-07-23T10:00:00.000Z",
          created_at: "2026-07-23T09:00:00.000Z",
          updated_at: "2026-07-23T10:00:00.000Z",
        },
      ],
      versionRows: {
        "project-1": {
          "version-2": {
            id: "version-2",
            project_id: "project-1",
            version_number: 2,
            version_status: "accepted",
            created_from: "ai_adjust",
            trip_plan_json: {
              destination: "Yunnan",
              days: 5,
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
          },
        },
      },
      sourceRows: {
        "project-1": [
          {
            id: "source-1",
            project_id: "project-1",
            source_type: "blank_input",
            source_title: null,
            source_payload_json: {},
            created_at: "2026-07-23T09:00:00.000Z",
            updated_at: "2026-07-23T09:00:00.000Z",
          },
        ],
      },
    });
    const service = createProjectTripsService({
      listProjectsByUser: async () =>
        (await client.from("travel_projects").select("*").eq("user_id", "user-1").order("last_activity_at")).data as never,
      getCurrentVersion: async () =>
        (await client
          .from("travel_project_versions")
          .select("*")
          .eq("project_id", "project-1")
          .eq("id", "version-2")
          .maybeSingle()).data as never,
      listSources: async () =>
        (await client
          .from("travel_project_sources")
          .select("*")
          .eq("project_id", "project-1")
          .order("created_at")).data as never,
    } as never);

    const summaries = await service.listUserProjects("user-1");

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.projectId).toBe("project-1");
    expect(summaries[0]?.currentVersionId).toBe("version-2");
    expect(summaries[0]?.destinationCity).toBe("Yunnan");
    expect(summaries[0]?.days).toBe(5);
  });
});

describe("my trips project integration", () => {
  it("returns project trips together with legacy trip_plans when both exist", async () => {
    const client = createSupabaseClientMock({
      projectRows: [
        {
          id: "project-1",
          user_id: "user-1",
          title: "Yunnan trip",
          lifecycle_state: "workspace",
          current_flow_stage: "workspace_ready",
          current_version_id: "version-2",
          last_activity_at: "2026-07-23T10:00:00.000Z",
          created_at: "2026-07-23T09:00:00.000Z",
          updated_at: "2026-07-23T10:00:00.000Z",
        },
      ],
      versionRows: {
        "project-1": {
          "version-2": {
            id: "version-2",
            project_id: "project-1",
            version_number: 2,
            version_status: "accepted",
            created_from: "ai_adjust",
            trip_plan_json: {
              destination: "Yunnan",
              days: 5,
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
          },
        },
      },
      sourceRows: {
        "project-1": [
          {
            id: "source-1",
            project_id: "project-1",
            source_type: "uploaded_file",
            source_title: "import.md",
            source_payload_json: {},
            created_at: "2026-07-23T09:00:00.000Z",
            updated_at: "2026-07-23T09:00:00.000Z",
          },
        ],
      },
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
          last_opened_at: "2026-07-24T09:00:00.000Z",
          created_at: "2026-07-20T10:00:00.000Z",
          updated_at: "2026-07-24T09:00:00.000Z",
        },
      ],
    });
    const handler = createTripsGetHandler(() => client as never);

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
    expect(payload.trips).toHaveLength(2);
    expect(payload.trips.map((trip) => trip.id)).toEqual([
      "trip-legacy-1",
      "project:project-1",
    ]);
    expect(payload.trips[1]?.entity_type).toBe("project");
    expect(payload.trips[1]?.source_type).toBe("file_import");
    expect(payload.trips[1]?.project_source_type).toBe("uploaded_file");
  });

  it("falls back to legacy trip_plans when no travel projects exist", async () => {
    const client = createSupabaseClientMock({
      projectRows: [],
      tripPlanRows: [
        {
          id: "trip-1",
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
    });
    const handler = createTripsGetHandler(() => client as never);

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
    expect(payload.ok).toBe(true);
    expect(payload.trips[0]?.id).toBe("trip-1");
  });

  it("restores workspace project context when opening a project item", async () => {
    const storage = new MemoryStorage();

    await openSavedTripIntoWorkspace(
      {
        id: "project:project-1",
        entity_type: "project",
        project_id: "project-1",
        current_version_id: "version-3",
        project_lifecycle_state: "workspace",
        title: "Yunnan trip",
        destination_city: "Yunnan",
        start_date: null,
        end_date: null,
        days: 5,
        budget: 6000,
        cover_image_url: null,
        source_type: "ai_generated",
        status: "saved",
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

    const session = getProjectSession(storage);
    expect(session?.projectId).toBe("project-1");
    expect(session?.versionId).toBe("version-3");
    expect(session?.sourceType).toBe("ai_prompt");
    expect(session?.flowStage).toBe("workspace_ready");
  });

  it("keeps file import projects mapped to uploaded_file when opening workspace", async () => {
    const storage = new MemoryStorage();

    await openSavedTripIntoWorkspace(
      {
        id: "project:project-file-1",
        entity_type: "project",
        project_id: "project-file-1",
        current_version_id: "version-1",
        project_source_type: "uploaded_file",
        project_lifecycle_state: "workspace",
        title: "Imported trip",
        destination_city: "Kyoto",
        start_date: null,
        end_date: null,
        days: 4,
        budget: 4000,
        cover_image_url: null,
        source_type: "file_import",
        status: "saved",
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

    const session = getProjectSession(storage);
    expect(session?.projectId).toBe("project-file-1");
    expect(session?.versionId).toBe("version-1");
    expect(session?.sourceType).toBe("uploaded_file");
  });
});
