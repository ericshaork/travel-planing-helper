"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "./dev-bypass";
import type { TripPlan } from "../trip/types";
import type {
  TravelProjectFlowStage,
  TravelProjectVersion,
} from "./types";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface ChatWorkspaceVersion
  extends Pick<
    TravelProjectVersion,
    | "id"
    | "versionNumber"
    | "versionStatus"
    | "createdFrom"
    | "createdAt"
    | "updatedAt"
  > {
  title: string;
  destination: string;
  days: number;
  isCurrent: boolean;
  /**
   * Revision Mode 展示与 Workspace handoff 专用：直接透传该版本已经取回的
   * tripPlan，避免编辑模式选中历史版本时右侧摘要仍停留在当前版本。
   * 不参与任何写入路径，不改动数据库 schema 与 versionService 保存逻辑。
   */
  summary?: string;
  tripPlan?: TripPlan;
}

export interface ChatWorkspaceSnapshot {
  projectId: string;
  flowStage: TravelProjectFlowStage;
  currentVersionId?: string;
  versions: ChatWorkspaceVersion[];
}

export interface ChatWorkspaceClientDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  allowGuestProjectAccess?: boolean;
}

function statusLabelFromVersion(version: TravelProjectVersion) {
  if (version.versionStatus === "proposed") {
    return "调整中";
  }

  if (version.versionStatus === "accepted") {
    return "已生成";
  }

  return "草稿";
}

function summarizeVersion(
  version: TravelProjectVersion,
  currentVersionId: string | null,
): ChatWorkspaceVersion {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    versionStatus: version.versionStatus,
    createdFrom: version.createdFrom ?? null,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    title: version.tripPlan?.tripTitle ?? "未命名版本",
    destination: version.tripPlan?.destination ?? "目的地待补充",
    days: version.tripPlan?.days ?? 0,
    isCurrent: currentVersionId === version.id,
    ...(version.tripPlan?.summary
      ? { summary: version.tripPlan.summary }
      : {}),
    ...(version.tripPlan ? { tripPlan: version.tripPlan } : {}),
  };
}

async function fetchProjectVersions(
  projectId: string,
  dependencies: ChatWorkspaceClientDependencies,
): Promise<TravelProjectVersion[] | null> {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);
  const allowGuestProjectAccess =
    dependencies.allowGuestProjectAccess ??
    shouldSendDevelopmentGuestProjectHeader();
  const fetcher = dependencies.fetcher ?? fetch;

  if (!accessToken && !allowGuestProjectAccess) {
    return null;
  }

  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  const response = await fetcher(`/api/projects/${projectId}/versions`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    versions?: TravelProjectVersion[];
  };

  return Array.isArray(payload.versions) ? payload.versions : [];
}

async function fetchProjectDetail(
  projectId: string,
  dependencies: ChatWorkspaceClientDependencies,
): Promise<{
  projectId: string;
  flowStage: TravelProjectFlowStage;
  currentVersionId?: string;
} | null> {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);
  const allowGuestProjectAccess =
    dependencies.allowGuestProjectAccess ??
    shouldSendDevelopmentGuestProjectHeader();
  const fetcher = dependencies.fetcher ?? fetch;

  if (!accessToken && !allowGuestProjectAccess) {
    return null;
  }

  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  const response = await fetcher(`/api/projects/${projectId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    project?: {
      id?: string;
      currentFlowStage?: TravelProjectFlowStage | null;
      currentVersionId?: string | null;
    };
  };

  if (!payload.project?.id) {
    return null;
  }

  return {
    projectId: payload.project.id,
    flowStage: payload.project.currentFlowStage ?? "source_received",
    currentVersionId: payload.project.currentVersionId ?? undefined,
  };
}

export async function loadChatWorkspaceSnapshot(
  projectId: string,
  dependencies: ChatWorkspaceClientDependencies = {},
): Promise<ChatWorkspaceSnapshot | null> {
  const [detail, versions] = await Promise.all([
    fetchProjectDetail(projectId, dependencies),
    fetchProjectVersions(projectId, dependencies),
  ]);

  if (!detail || !versions) {
    return null;
  }

  return {
    projectId: detail.projectId,
    flowStage: detail.flowStage,
    currentVersionId: detail.currentVersionId,
    versions: versions.map((version) =>
      summarizeVersion(version, detail.currentVersionId ?? null),
    ),
  };
}

export function resolveVersionStatusLabel(version: ChatWorkspaceVersion) {
  if (version.isCurrent) {
    return "当前版本";
  }

  return statusLabelFromVersion({
    id: version.id,
    projectId: "",
    versionNumber: version.versionNumber,
    versionStatus: version.versionStatus,
    createdFrom: version.createdFrom,
    tripPlan: undefined as never,
    tripRequestSnapshot: null,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  });
}

export function buildInitialRequirementsEntry(): ChatWorkspaceVersion {
  return {
    id: "__initial_requirements__",
    versionNumber: 0,
    versionStatus: "draft",
    createdFrom: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    title: "初始需求",
    destination: "等待你描述旅行想法",
    days: 0,
    isCurrent: true,
  };
}
