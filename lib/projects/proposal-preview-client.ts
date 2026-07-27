"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "./dev-bypass";
import type {
  TravelProjectFlowStage,
  TravelProjectVersion,
} from "./types";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface ProposalPreviewClientDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  allowGuestProjectAccess?: boolean;
}

export interface ProposalPreviewData {
  projectId: string;
  flowStage: TravelProjectFlowStage;
  currentVersionId?: string;
  version: TravelProjectVersion | null;
}

async function fetchPreviewPayload(
  projectId: string,
  dependencies: ProposalPreviewClientDependencies,
): Promise<{
  projectId: string;
  flowStage: TravelProjectFlowStage;
  currentVersionId?: string;
  version: TravelProjectVersion | null;
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

  const [detailResponse, versionsResponse] = await Promise.all([
    fetcher(`/api/projects/${projectId}`, {
      method: "GET",
      headers,
    }).catch(() => null),
    fetcher(`/api/projects/${projectId}/versions`, {
      method: "GET",
      headers,
    }).catch(() => null),
  ]);

  if (!detailResponse || !detailResponse.ok) {
    return null;
  }

  const detail = (await detailResponse.json()) as {
    project?: {
      id?: string;
      currentFlowStage?: TravelProjectFlowStage | null;
      currentVersionId?: string | null;
    };
  };

  if (!detail.project?.id) {
    return null;
  }

  const currentVersionId = detail.project.currentVersionId ?? undefined;
  const flowStage: TravelProjectFlowStage =
    detail.project.currentFlowStage ?? "source_received";

  let version: TravelProjectVersion | null = null;

  if (versionsResponse && versionsResponse.ok) {
    const versionsPayload = (await versionsResponse.json()) as {
      versions?: TravelProjectVersion[];
    };
    const versions = Array.isArray(versionsPayload.versions)
      ? versionsPayload.versions
      : [];

    version =
      versions.find((candidate) => candidate.id === currentVersionId) ??
      versions.find((candidate) => candidate.versionStatus === "accepted") ??
      versions[0] ??
      null;
  }

  return {
    projectId: detail.project.id,
    flowStage,
    currentVersionId,
    version,
  };
}

export async function loadProposalPreview(
  projectId: string,
  dependencies: ProposalPreviewClientDependencies = {},
): Promise<ProposalPreviewData | null> {
  return fetchPreviewPayload(projectId, dependencies);
}
