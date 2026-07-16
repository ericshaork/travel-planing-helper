import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createUserSettingsGetHandler,
  createUserSettingsPatchHandler,
} from "../../app/api/user-settings/route";

function requestWithToken(method: string, body?: unknown, token?: string) {
  return new Request(`http://localhost/api/user-settings`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function createAuthenticatedClient(userId = "user-1") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: "user@example.com",
          },
        },
        error: null,
      }),
    },
  };
}

describe("GET /api/user-settings", () => {
  it("未登录时返回 401", async () => {
    const GET = createUserSettingsGetHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );

    const response = await GET(requestWithToken("GET"));
    const payload = (await response.json()) as {
      error?: { code?: string };
    };

    expect(response.status).toBe(401);
    expect(payload.error?.code).toBe("UNAUTHORIZED");
  });

  it("已登录且没有 settings 时会创建默认 settings 后返回", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "settings-1",
          user_id: "user-1",
          travel_preferences_json: {
            budget: "moderate",
            pace: "balanced",
            interests: [],
            companions: "solo",
            wakeUpPreference: "normal",
            transportPreference: "public_transport",
          },
          workspace_preferences_json: {
            defaultMode: "read",
            mapLayout: "balanced",
            mapOverlay: "expanded",
          },
          ai_preferences_json: {
            detailLevel: "standard",
            useLongTermPreferences: true,
            preferHiddenGems: false,
            preferLessWalking: false,
            preferConvenientTransport: true,
          },
          created_at: "2026-07-16T00:00:00.000Z",
          updated_at: "2026-07-16T00:00:00.000Z",
        },
        error: null,
      });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "settings-1",
        user_id: "user-1",
        travel_preferences_json: {
          budget: "moderate",
          pace: "balanced",
          interests: [],
          companions: "solo",
          wakeUpPreference: "normal",
          transportPreference: "public_transport",
        },
        workspace_preferences_json: {
          defaultMode: "read",
          mapLayout: "balanced",
          mapOverlay: "expanded",
        },
        ai_preferences_json: {
          detailLevel: "standard",
          useLongTermPreferences: true,
          preferHiddenGems: false,
          preferLessWalking: false,
          preferConvenientTransport: true,
        },
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
      error: null,
    });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({
      select,
      eq,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single,
        }),
      }),
    });
    const client = {
      ...createAuthenticatedClient(),
      from,
    };
    const GET = createUserSettingsGetHandler(() => client as never);

    const response = await GET(requestWithToken("GET", undefined, "token-123"));
    const payload = (await response.json()) as {
      settings: {
        travelPreferences: { budget: string };
      };
    };

    expect(response.status).toBe(200);
    expect(from().insert ?? insert).toBeDefined();
    expect(from.mock.results[0]?.value.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
      }),
    );
    expect(payload.settings.travelPreferences.budget).toBe("moderate");
  });

  it("已登录且已有 settings 时直接返回现有 settings", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "settings-1",
        user_id: "user-1",
        travel_preferences_json: {
          budget: "comfort",
          pace: "slow",
          interests: ["food"],
          companions: "partner",
          wakeUpPreference: "sleep_in",
          transportPreference: "taxi_first",
        },
        workspace_preferences_json: {
          defaultMode: "edit",
          mapLayout: "map_focus",
          mapOverlay: "collapsed",
        },
        ai_preferences_json: {
          detailLevel: "detailed",
          useLongTermPreferences: true,
          preferHiddenGems: true,
          preferLessWalking: true,
          preferConvenientTransport: false,
        },
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq, maybeSingle }),
      eq,
      insert: vi.fn(),
    });
    const client = {
      ...createAuthenticatedClient(),
      from,
    };
    const GET = createUserSettingsGetHandler(() => client as never);

    const response = await GET(requestWithToken("GET", undefined, "token-123"));
    const payload = (await response.json()) as {
      settings: {
        travelPreferences: { budget: string };
        workspacePreferences: { defaultMode: string };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.settings.travelPreferences.budget).toBe("comfort");
    expect(payload.settings.workspacePreferences.defaultMode).toBe("edit");
  });
});

describe("PATCH /api/user-settings", () => {
  it("未登录时返回 401", async () => {
    const PATCH = createUserSettingsPatchHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );

    const response = await PATCH(
      requestWithToken("PATCH", {
        travelPreferences: {
          budget: "comfort",
        },
      }),
    );
    const payload = (await response.json()) as {
      error?: { code?: string };
    };

    expect(response.status).toBe(401);
    expect(payload.error?.code).toBe("UNAUTHORIZED");
  });

  it("已登录时能更新当前用户自己的 settings", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "settings-1",
        user_id: "user-1",
        travel_preferences_json: {
          budget: "moderate",
          pace: "balanced",
          interests: [],
          companions: "solo",
          wakeUpPreference: "normal",
          transportPreference: "public_transport",
        },
        workspace_preferences_json: {
          defaultMode: "read",
          mapLayout: "balanced",
          mapOverlay: "expanded",
        },
        ai_preferences_json: {
          detailLevel: "standard",
          useLongTermPreferences: true,
          preferHiddenGems: false,
          preferLessWalking: false,
          preferConvenientTransport: true,
        },
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
      error: null,
    });
    const updateMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "settings-1",
        user_id: "user-1",
        travel_preferences_json: {
          budget: "comfort",
          pace: "balanced",
          interests: [],
          companions: "solo",
          wakeUpPreference: "normal",
          transportPreference: "public_transport",
        },
        workspace_preferences_json: {
          defaultMode: "read",
          mapLayout: "balanced",
          mapOverlay: "collapsed",
        },
        ai_preferences_json: {
          detailLevel: "detailed",
          useLongTermPreferences: true,
          preferHiddenGems: false,
          preferLessWalking: false,
          preferConvenientTransport: true,
        },
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T01:00:00.000Z",
      },
      error: null,
    });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
    const from = vi
      .fn()
      .mockReturnValueOnce({
        select,
      })
      .mockReturnValueOnce({
        update,
      });
    const client = {
      ...createAuthenticatedClient(),
      from,
    };
    const PATCH = createUserSettingsPatchHandler(() => client as never);

    const response = await PATCH(
      requestWithToken(
        "PATCH",
        {
          travelPreferences: {
            budget: "comfort",
          },
          workspacePreferences: {
            mapOverlay: "collapsed",
          },
          aiPreferences: {
            detailLevel: "detailed",
          },
        },
        "token-123",
      ),
    );
    const payload = (await response.json()) as {
      settings: {
        travelPreferences: { budget: string };
        workspacePreferences: { mapOverlay: string };
        aiPreferences: { detailLevel: string };
      };
    };

    expect(response.status).toBe(200);
    expect(updateEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        travel_preferences_json: expect.objectContaining({
          budget: "comfort",
        }),
        workspace_preferences_json: expect.objectContaining({
          mapOverlay: "collapsed",
        }),
        ai_preferences_json: expect.objectContaining({
          detailLevel: "detailed",
        }),
      }),
    );
    expect(payload.settings.travelPreferences.budget).toBe("comfort");
    expect(payload.settings.workspacePreferences.mapOverlay).toBe("collapsed");
    expect(payload.settings.aiPreferences.detailLevel).toBe("detailed");
  });
});
