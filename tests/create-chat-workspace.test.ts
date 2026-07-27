import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  FIRST_TIME_INTERVIEW_QUESTIONS,
  FIRST_TIME_INTERVIEW_TOTAL,
} from "../components/create/CreateChatWorkspace";
import {
  buildInitialRequirementsEntry,
  loadChatWorkspaceSnapshot,
  resolveVersionStatusLabel,
  type ChatWorkspaceVersion,
} from "../lib/projects/chat-workspace-client";

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

function createVersion(
  overrides: Partial<ChatWorkspaceVersion> = {},
): ChatWorkspaceVersion {
  return {
    id: "version-1",
    versionNumber: 1,
    versionStatus: "accepted",
    createdFrom: "ai_generate",
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    title: "杭州 3 日",
    destination: "杭州",
    days: 3,
    isCurrent: true,
    ...overrides,
  };
}

describe("first-time interview", () => {
  it("keeps the five questions in the required order", () => {
    expect(FIRST_TIME_INTERVIEW_TOTAL).toBe(5);
    expect(FIRST_TIME_INTERVIEW_QUESTIONS).toEqual([
      "你已经有想去的目的地，还是只知道大概想怎么旅行？",
      "这次大概什么时候出发，计划玩几天？",
      "这次会和谁一起出发？",
      "旅行里你最想要什么样的体验？比如风景、美食、散步、文化或慢节奏。",
      "预算、交通、住宿，或者其他需要我特别照顾的限制条件有哪些？",
    ]);
  });
});

describe("buildInitialRequirementsEntry", () => {
  it("returns a stable entry with id '__initial_requirements__'", () => {
    const entry = buildInitialRequirementsEntry();
    expect(entry.id).toBe("__initial_requirements__");
    expect(entry.title).toBe("初始需求");
    expect(entry.isCurrent).toBe(true);
  });
});

describe("resolveVersionStatusLabel", () => {
  it("returns '当前版本' for the current version", () => {
    expect(resolveVersionStatusLabel(createVersion({ isCurrent: true }))).toBe(
      "当前版本",
    );
  });

  it("returns '调整中' for proposed versions", () => {
    expect(
      resolveVersionStatusLabel(
        createVersion({ isCurrent: false, versionStatus: "proposed" }),
      ),
    ).toBe("调整中");
  });

  it("returns '已生成' for accepted versions", () => {
    expect(
      resolveVersionStatusLabel(
        createVersion({ isCurrent: false, versionStatus: "accepted" }),
      ),
    ).toBe("已生成");
  });

  it("returns '草稿' for draft versions", () => {
    expect(
      resolveVersionStatusLabel(
        createVersion({ isCurrent: false, versionStatus: "draft" }),
      ),
    ).toBe("草稿");
  });
});

describe("loadChatWorkspaceSnapshot", () => {
  it("returns null when not authorized", async () => {
    const snapshot = await loadChatWorkspaceSnapshot("project-1", {
      fetcher: vi.fn(),
      getAccessToken: async () => null,
      allowGuestProjectAccess: false,
    });
    expect(snapshot).toBeNull();
  });

  it("returns null when the project detail request fails", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse(
        { error: { code: "UNKNOWN_ERROR", message: "not found" } },
        { status: 404 },
      ),
    );
    const snapshot = await loadChatWorkspaceSnapshot("project-missing", {
      fetcher,
      getAccessToken: async () => "token",
      allowGuestProjectAccess: false,
    });
    expect(snapshot).toBeNull();
    expect(fetcher).toHaveBeenCalled();
  });

  it("returns a snapshot with versions and marks the current version", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-1",
            currentFlowStage: "workspace_ready",
            currentVersionId: "version-2",
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          versions: [
            {
              id: "version-1",
              projectId: "project-1",
              versionNumber: 1,
              versionStatus: "accepted",
              createdFrom: "ai_generate",
              tripPlan: {
                tripTitle: "杭州 3 日",
                destination: "杭州",
                days: 3,
              },
              tripRequestSnapshot: null,
              createdAt: "2026-07-26T00:00:00.000Z",
              updatedAt: "2026-07-26T00:00:00.000Z",
            },
            {
              id: "version-2",
              projectId: "project-1",
              versionNumber: 2,
              versionStatus: "accepted",
              createdFrom: "ai_adjust",
              tripPlan: {
                tripTitle: "杭州 3 日 V2",
                destination: "杭州",
                days: 3,
              },
              tripRequestSnapshot: null,
              createdAt: "2026-07-26T01:00:00.000Z",
              updatedAt: "2026-07-26T01:00:00.000Z",
            },
          ],
        }),
      );

    const snapshot = await loadChatWorkspaceSnapshot("project-1", {
      fetcher,
      getAccessToken: async () => "token",
      allowGuestProjectAccess: false,
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.projectId).toBe("project-1");
    expect(snapshot?.flowStage).toBe("workspace_ready");
    expect(snapshot?.currentVersionId).toBe("version-2");
    expect(snapshot?.versions).toHaveLength(2);
    expect(snapshot?.versions[0]?.isCurrent).toBe(false);
    expect(snapshot?.versions[1]?.isCurrent).toBe(true);
    expect(snapshot?.versions[0]?.title).toBe("杭州 3 日");
    expect(snapshot?.versions[1]?.title).toBe("杭州 3 日 V2");
  });

  it("returns null when versions endpoint fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-1",
            currentFlowStage: "clarifying",
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          { error: { code: "UNKNOWN_ERROR", message: "forbidden" } },
          { status: 403 },
        ),
      );

    const snapshot = await loadChatWorkspaceSnapshot("project-1", {
      fetcher,
      getAccessToken: async () => "token",
      allowGuestProjectAccess: false,
    });

    expect(snapshot).toBeNull();
  });

  it("returns an empty versions list when the project has no versions", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-1",
            currentFlowStage: "clarifying",
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          versions: [],
        }),
      );

    const snapshot = await loadChatWorkspaceSnapshot("project-1", {
      fetcher,
      getAccessToken: async () => "token",
      allowGuestProjectAccess: false,
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.versions).toEqual([]);
    expect(snapshot?.currentVersionId).toBeUndefined();
  });
});
