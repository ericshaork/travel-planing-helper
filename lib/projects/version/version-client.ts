"use client";

import { getBrowserAccessToken } from "../../supabase/auth-client";
import type { StorageLike } from "../../trip/storage";
import type { TripPlan, TripRequest } from "../../trip/types";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "../dev-bypass";
import { getProjectSession, mergeProjectSession } from "../session";
import type {
  TravelProjectVersion,
  TravelProjectVersionReason,
} from "../types";
import { applyWorkspaceVersionHandoff } from "../workspace-context-client";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface VersionDetailPayload {
  version?: TravelProjectVersion;
}

interface VersionCreatePayload {
  version?: TravelProjectVersion;
}

export interface WorkspaceVersionClientDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  storage?: StorageLike;
  allowGuestProjectAccess?: boolean;
}

export interface WorkspaceVersionSummary {
  projectId: string;
  versionId: string;
  versionNumber: number;
  createdFrom?: TravelProjectVersionReason | null;
  tripTitle: string;
}

export interface SaveWorkspaceVersionInput {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
  createdFrom?: TravelProjectVersionReason;
  createdBy?: string | null;
}

interface AuthorizedClient {
  fetcher: FetchLike;
  headers: Record<string, string>;
}

function getAllowedGuestAccess(
  input?: boolean,
) {
  return input ?? shouldSendDevelopmentGuestProjectHeader();
}

async function getAuthorizedClient(
  dependencies: WorkspaceVersionClientDependencies,
): Promise<AuthorizedClient | null> {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);
  const allowGuestProjectAccess = getAllowedGuestAccess(
    dependencies.allowGuestProjectAccess,
  );

  if (!accessToken && !allowGuestProjectAccess) {
    return null;
  }

  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  return {
    fetcher: (dependencies.fetcher ?? fetch).bind(globalThis),
    headers,
  };
}

async function fetchWorkspaceVersionDetail(
  projectId: string,
  versionId: string,
  dependencies: WorkspaceVersionClientDependencies,
) {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    return null;
  }

  const response = await client.fetcher(
    `/api/projects/${projectId}/versions/${versionId}`,
    {
      method: "GET",
      headers: client.headers,
    },
  ).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json()) as VersionDetailPayload;
  return payload.version ?? null;
}

export async function loadWorkspaceVersionSummary(
  dependencies: WorkspaceVersionClientDependencies = {},
): Promise<WorkspaceVersionSummary | null> {
  const session = getProjectSession(dependencies.storage);

  if (!session?.projectId || !session.versionId) {
    return null;
  }

  const version = await fetchWorkspaceVersionDetail(
    session.projectId,
    session.versionId,
    dependencies,
  );

  if (!version) {
    return null;
  }

  return {
    projectId: session.projectId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    createdFrom: version.createdFrom ?? null,
    tripTitle: version.tripPlan.tripTitle,
  };
}

export async function saveWorkspacePlanAsNewVersion(
  input: SaveWorkspaceVersionInput,
  dependencies: WorkspaceVersionClientDependencies = {},
): Promise<TravelProjectVersion | null> {
  const session = getProjectSession(dependencies.storage);

  if (!session?.projectId) {
    return null;
  }

  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    return null;
  }

  const currentVersion =
    session.versionId
      ? await fetchWorkspaceVersionDetail(
          session.projectId,
          session.versionId,
          dependencies,
        )
      : null;
  if (session.versionId && !currentVersion) {
    return null;
  }
  const tripRequestSnapshot =
    input.tripRequest ?? currentVersion?.tripRequestSnapshot ?? null;

  const response = await client.fetcher(
    `/api/projects/${session.projectId}/versions`,
    {
      method: "POST",
      headers: {
        ...client.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        versionStatus: "accepted",
        createdFrom: input.createdFrom ?? "manual_edit",
        tripPlan: input.tripPlan,
        tripRequestSnapshot,
        createdBy: input.createdBy ?? "workspace_manual_save",
        setAsCurrent: true,
      }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json()) as VersionCreatePayload;
  const version = payload.version ?? null;

  if (!version?.id) {
    return null;
  }

  applyWorkspaceVersionHandoff(
    {
      versionId: version.id,
      tripPlan: version.tripPlan,
    },
    dependencies.storage,
  );
  mergeProjectSession(
    {
      projectId: session.projectId,
      versionId: version.id,
      flowStage: "workspace_ready",
    },
    dependencies.storage,
  );

  return version;
}
