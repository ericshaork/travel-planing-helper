import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createProjectsPostHandler } from "../../app/api/projects/route";
import { createProjectDetailGetHandler } from "../../app/api/projects/[projectId]/route";
import { createProjectVersionsPostHandler } from "../../app/api/projects/[projectId]/versions/route";
import { createProjectMessagesPostHandler } from "../../app/api/projects/[projectId]/messages/route";

function buildProjectClient(options?: {
  userId?: string | null;
  projectRow?: Record<string, unknown> | null;
  sourceRows?: Record<string, unknown>[];
  versionRows?: Record<string, unknown>[];
  insertedProjectRow?: Record<string, unknown>;
  insertedSourceRow?: Record<string, unknown>;
  insertedVersionRow?: Record<string, unknown>;
  insertedMessageRow?: Record<string, unknown>;
}) {
  const userId = options?.userId ?? "user-1";
  const projectRow =
    options?.projectRow ??
    ({
      id: "project-1",
      user_id: "user-1",
      title: "Chengdu 4 days",
      lifecycle_state: "planning",
      current_flow_stage: "clarifying",
      current_version_id: null,
      last_activity_at: "2026-07-23T00:00:00.000Z",
      created_at: "2026-07-23T00:00:00.000Z",
      updated_at: "2026-07-23T00:00:00.000Z",
    } satisfies Record<string, unknown>);
  const sourceRows =
    options?.sourceRows ??
    [
      {
        id: "source-1",
        project_id: "project-1",
        source_type: "blank_input",
        source_title: "Idea",
        source_payload_json: {},
        created_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:00.000Z",
      },
    ];
  const versionRows =
    options?.versionRows ??
    [
      {
        id: "version-1",
        project_id: "project-1",
        version_number: 1,
        version_status: "accepted",
        created_from: "ai_generate",
        trip_plan_json: {
          tripTitle: "Chengdu 4 days",
          summary: "mock",
          destination: "Chengdu",
          days: 4,
          travelStyleSummary: "balanced",
          weatherSummary: {
            available: false,
            overview: "mock",
            dailyForecast: [],
            alerts: [],
            reminders: [],
            dataNote: "mock",
          },
          budgetSummary: {
            totalEstimate: "mock",
            transport: "mock",
            hotel: "mock",
            food: "mock",
            tickets: "mock",
            localTransport: "mock",
            flexibleSpending: "mock",
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
          dailyItinerary: [
            {
              day: 1,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
            {
              day: 2,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
            {
              day: 3,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
            {
              day: 4,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
          ],
          generalTips: [],
          warnings: [],
        },
        trip_request_snapshot_json: {
          departureCity: "Shenzhen",
          destinationCity: "Chengdu",
          days: 4,
          budget: 3000,
          currency: "CNY",
          interests: ["food"],
          travelStyles: ["balanced"],
          mustVisitPlaces: [],
          avoidPlaces: [],
        },
        proposal_summary_json: null,
        created_by: "assistant",
        created_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:00.000Z",
      },
    ];
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: userId ? { id: userId } : null,
      },
      error: userId ? null : new Error("unauthorized"),
    }),
  };

  function createSelectTable(tableName: string) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn((column: string, value: unknown) => {
          if (tableName === "travel_projects") {
            return {
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  column === "id" && value === "project-1" ? projectRow : null,
                error: null,
              }),
              order: vi.fn(),
              eq: vi.fn(),
            };
          }

          if (tableName === "travel_project_sources") {
            return {
              order: vi.fn().mockResolvedValue({
                data:
                  column === "project_id" && value === "project-1"
                    ? sourceRows
                    : [],
                error: null,
              }),
              maybeSingle: vi.fn(),
              eq: vi.fn(),
            };
          }

          if (tableName === "travel_project_versions") {
            return {
              eq: vi.fn((column2: string, value2: unknown) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    column === "project_id" &&
                    value === "project-1" &&
                    column2 === "id" &&
                    value2 === "version-1"
                      ? versionRows[0]
                      : null,
                  error: null,
                }),
              })),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              order: vi.fn().mockResolvedValue({
                data:
                  column === "project_id" && value === "project-1"
                    ? versionRows
                    : [],
                error: null,
              }),
            };
          }

          if (tableName === "travel_project_messages") {
            return {
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
              maybeSingle: vi.fn(),
              eq: vi.fn(),
            };
          }

          return {
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
            eq: vi.fn(),
          };
        }),
      })),
      insert: vi.fn((payload: unknown) => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data:
              tableName === "travel_projects"
                ? (options?.insertedProjectRow ??
                  ({
                    ...(projectRow as Record<string, unknown>),
                    ...((payload as Record<string, unknown>) ?? {}),
                  } satisfies Record<string, unknown>))
                : tableName === "travel_project_sources"
                  ? (options?.insertedSourceRow ??
                    ({
                      ...sourceRows[0],
                      ...((payload as Record<string, unknown>) ?? {}),
                    } satisfies Record<string, unknown>))
                  : tableName === "travel_project_versions"
                    ? (options?.insertedVersionRow ?? versionRows[0])
                    : (options?.insertedMessageRow ??
                      {
                        id: "message-1",
                        project_id: "project-1",
                        role: "user",
                        content: "Add food",
                        created_at: "2026-07-23T00:00:00.000Z",
                      }),
            error: null,
          }),
        })),
      })),
      update: vi.fn((payload: unknown) => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data:
                tableName === "travel_projects"
                  ? {
                      ...(projectRow as Record<string, unknown>),
                      ...(payload as Record<string, unknown>),
                    }
                  : null,
              error: null,
            }),
          })),
        })),
      })),
    };
  }

  return {
    auth,
    from: vi.fn((table: string) => createSelectTable(table)),
  };
}

describe("project API routes", () => {
  it("creates project successfully", async () => {
    const client = buildProjectClient();
    const POST = createProjectsPostHandler(() => client as never);

    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          title: "Chengdu 4 days",
          sourceType: "blank_input",
        }),
      }),
    );
    const payload = (await response.json()) as {
      project: { id: string };
    };

    expect(response.status).toBe(200);
    expect(payload.project.id).toBe("project-1");
  });

  it("gets project detail successfully", async () => {
    const client = buildProjectClient({
      projectRow: {
        id: "project-1",
        user_id: "user-1",
        title: "Chengdu 4 days",
        lifecycle_state: "workspace",
        current_flow_stage: "workspace_ready",
        current_version_id: "version-1",
        last_activity_at: "2026-07-23T00:00:00.000Z",
        created_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:00.000Z",
      },
    });
    const GET = createProjectDetailGetHandler(() => client as never);

    const response = await GET(
      new Request("http://localhost/api/projects/project-1", {
        method: "GET",
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      project: { id: string };
      currentVersion: { id: string } | null;
    };

    expect(response.status).toBe(200);
    expect(payload.project.id).toBe("project-1");
    expect(payload.currentVersion?.id).toBe("version-1");
  });

  it("creates version with incremented version number", async () => {
    const versionRows = [
      {
        id: "version-2",
        project_id: "project-1",
        version_number: 2,
        version_status: "accepted",
        created_from: "ai_generate",
        trip_plan_json: buildProjectClient().from,
        trip_request_snapshot_json: null,
        proposal_summary_json: null,
        created_by: "assistant",
        created_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:00.000Z",
      },
    ];
    const versionClient = buildProjectClient({
      versionRows: versionRows as never,
      insertedVersionRow: {
        ...versionRows[0],
        id: "version-3",
        version_number: 3,
        trip_plan_json: {
          tripTitle: "Chengdu 4 days",
          summary: "mock",
          destination: "Chengdu",
          days: 4,
          travelStyleSummary: "balanced",
          weatherSummary: {
            available: false,
            overview: "mock",
            dailyForecast: [],
            alerts: [],
            reminders: [],
            dataNote: "mock",
          },
          budgetSummary: {
            totalEstimate: "mock",
            transport: "mock",
            hotel: "mock",
            food: "mock",
            tickets: "mock",
            localTransport: "mock",
            flexibleSpending: "mock",
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
          dailyItinerary: [
            {
              day: 1,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
            {
              day: 2,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
            {
              day: 3,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
            {
              day: 4,
              theme: "mock",
              routeOrder: ["mock"],
              routeReason: "mock",
              morning: [],
              afternoon: [],
              evening: [],
              dailyTips: [],
            },
          ],
          generalTips: [],
          warnings: [],
        },
        trip_request_snapshot_json: {
          departureCity: "Shenzhen",
          destinationCity: "Chengdu",
          days: 4,
          budget: 3000,
          currency: "CNY",
          interests: ["food"],
          travelStyles: ["balanced"],
          mustVisitPlaces: [],
          avoidPlaces: [],
        },
      },
    });
    const POST = createProjectVersionsPostHandler(() => versionClient as never);

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/versions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          tripPlan: {
            tripTitle: "Chengdu 4 days",
            summary: "mock",
            destination: "Chengdu",
            days: 4,
            travelStyleSummary: "balanced",
            weatherSummary: {
              available: false,
              overview: "mock",
              dailyForecast: [],
              alerts: [],
              reminders: [],
              dataNote: "mock",
            },
            budgetSummary: {
              totalEstimate: "mock",
              transport: "mock",
              hotel: "mock",
              food: "mock",
              tickets: "mock",
              localTransport: "mock",
              flexibleSpending: "mock",
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
            dailyItinerary: [
              {
                day: 1,
                theme: "mock",
                routeOrder: ["mock"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
              {
                day: 2,
                theme: "mock",
                routeOrder: ["mock"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
              {
                day: 3,
                theme: "mock",
                routeOrder: ["mock"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
              {
                day: 4,
                theme: "mock",
                routeOrder: ["mock"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
            ],
            generalTips: [],
            warnings: [],
          },
          tripRequestSnapshot: {
            departureCity: "Shenzhen",
            destinationCity: "Chengdu",
            days: 4,
            budget: 3000,
            currency: "CNY",
            interests: ["food"],
            travelStyles: ["balanced"],
            mustVisitPlaces: [],
            avoidPlaces: [],
          },
          createdFrom: "ai_adjust",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      version: { versionNumber: number };
    };

    expect(response.status).toBe(200);
    expect(payload.version.versionNumber).toBe(3);
  });

  it("saves message successfully", async () => {
    const client = buildProjectClient();
    const POST = createProjectMessagesPostHandler(() => client as never);

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          role: "user",
          content: "Add more food",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      messages: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.messages[0]?.id).toBe("message-1");
  });

  it("does not reveal another user's project when repository returns null", async () => {
    const client = buildProjectClient({
      projectRow: null,
    });
    const GET = createProjectDetailGetHandler(() => client as never);

    const response = await GET(
      new Request("http://localhost/api/projects/project-2", {
        method: "GET",
        headers: {
          Authorization: "Bearer token-456",
        },
      }),
      {
        params: Promise.resolve({
          projectId: "project-2",
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
