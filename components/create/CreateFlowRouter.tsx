"use client";

import { useCallback, useEffect, useState } from "react";

import { CreateChatWorkspace } from "@/components/create/CreateChatWorkspace";
import {
  GenerationLoadingPanel,
  type GenerationLoadingContext,
} from "@/components/create/GenerationLoadingPanel";
import {
  ProposalPreviewPanel,
  type ProposalPreviewContext,
} from "@/components/create/ProposalPreviewPanel";
import type {
  CreateEntryMode,
  CreateEntrySource,
} from "@/lib/projects/create-entry";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "@/lib/projects/dev-bypass";
import {
  clearProjectSession,
  getProjectSession,
  mergeProjectSession,
} from "@/lib/projects/session";
import type {
  TravelProjectFlowStage,
  TravelProjectMessage,
} from "@/lib/projects/types";
import { getBrowserAccessToken } from "@/lib/supabase/auth-client";
import type { StorageLike } from "@/lib/trip/storage";
import type { TripPlanDraft } from "@/lib/trip/types";

export interface CreateFlowRouterProps {
  entrySource?: CreateEntrySource;
  archiveSlug?: string;
  projectId?: string;
  versionId?: string;
  mode?: CreateEntryMode;
  initialDraft?: TripPlanDraft | null;
  continueSession?: boolean;
}

export type CreateFlowView =
  | "chat"
  | "proposal"
  | "revision"
  | "generating"
  | "workspace_pending"
  | "workspace_preview"
  | "resume";

export interface RestoredCreateFlowProject {
  projectId: string;
  flowStage: TravelProjectFlowStage;
  currentVersionId?: string;
  requestedVersionId?: string;
  messages: TravelProjectMessage[];
}

export type RestoreCreateFlowResult =
  | { status: "new" }
  | { status: "restored"; project: RestoredCreateFlowProject }
  | { status: "unavailable" };

interface RestoreCreateFlowDependencies {
  fetcher?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  getAccessToken?: () => Promise<string | null>;
  storage?: StorageLike;
  allowGuestProjectAccess?: boolean;
  continueSession?: boolean;
  entrySource?: CreateEntrySource;
  explicitProjectId?: string;
  explicitVersionId?: string;
}

type CreateFlowRouterState =
  | { status: "loading" }
  | { status: "new" }
  | { status: "restored"; project: RestoredCreateFlowProject }
  | { status: "unavailable" };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveCreateFlowView(
  flowStage: TravelProjectFlowStage,
  currentVersionId?: string | null,
): CreateFlowView {
  switch (flowStage) {
    case "proposal_ready":
      return "proposal";
    case "proposal_adjusting":
      return "revision";
    case "generating":
      return "generating";
    case "workspace_ready":
      return isNonEmptyString(currentVersionId)
        ? "workspace_preview"
        : "workspace_pending";
    case "abandoned":
      return "resume";
    case "source_received":
    case "source_review":
    case "clarifying":
    default:
      return "chat";
  }
}

function resolveLoadingContext(
  view: CreateFlowView,
  entrySource: CreateEntrySource | undefined,
): GenerationLoadingContext {
  if (view === "workspace_preview" || view === "workspace_pending") {
    return "final_confirmation";
  }

  if (entrySource === "explore_archive") {
    return "explore_archive";
  }

  return "first_version";
}

function resolveProposalContext(
  view: CreateFlowView,
  entrySource: CreateEntrySource | undefined,
): ProposalPreviewContext {
  if (entrySource === "explore_archive") {
    return "explore_archive";
  }

  if (view === "workspace_preview") {
    return "final_confirmation";
  }

  return "first_version";
}

export async function restoreCreateFlowRoute(
  dependencies: RestoreCreateFlowDependencies = {},
): Promise<RestoreCreateFlowResult> {
  const explicitRevisionEntry =
    dependencies.entrySource === "revision" &&
    isNonEmptyString(dependencies.explicitProjectId) &&
    isNonEmptyString(dependencies.explicitVersionId);

  if (explicitRevisionEntry) {
    mergeProjectSession(
      {
        projectId: dependencies.explicitProjectId,
        versionId: dependencies.explicitVersionId,
        sourceType:
          getProjectSession(dependencies.storage)?.sourceType ?? "existing_trip",
        flowStage: "workspace_ready",
      },
      dependencies.storage,
    );
  }

  const session = getProjectSession(dependencies.storage);

  if (dependencies.continueSession !== true && !explicitRevisionEntry) {
    if (session?.projectId) {
      clearProjectSession(dependencies.storage);
    }
    return { status: "new" };
  }

  if (!session?.projectId) {
    return { status: "new" };
  }

  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);
  const allowGuestProjectAccess =
    dependencies.allowGuestProjectAccess ??
    shouldSendDevelopmentGuestProjectHeader();

  if (!accessToken && !allowGuestProjectAccess) {
    return { status: "unavailable" };
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  const fetcher = dependencies.fetcher ?? fetch;
  const detailResponse = await fetcher(`/api/projects/${session.projectId}`, {
    method: "GET",
    headers,
  });

  if (!detailResponse.ok) {
    return { status: "unavailable" };
  }

  const detail = (await detailResponse.json()) as {
    project?: {
      id?: string;
      currentFlowStage?: TravelProjectFlowStage | null;
      currentVersionId?: string | null;
    };
  };

  if (!isNonEmptyString(detail.project?.id)) {
    return { status: "unavailable" };
  }

  const flowStage =
    detail.project.currentFlowStage ?? session.flowStage ?? "source_received";
  const requestedVersionId = explicitRevisionEntry
    ? dependencies.explicitVersionId?.trim()
    : undefined;
  const currentVersionId =
    requestedVersionId ??
    (isNonEmptyString(detail.project.currentVersionId)
      ? detail.project.currentVersionId.trim()
      : undefined);
  const view =
    dependencies.entrySource === "revision"
      ? "revision"
      : resolveCreateFlowView(flowStage, currentVersionId);
  let messages: TravelProjectMessage[] = [];

  if (view === "chat" || view === "revision") {
    const messagesResponse = await fetcher(
      `/api/projects/${session.projectId}/messages?limit=50`,
      {
        method: "GET",
        headers,
      },
    );

    if (!messagesResponse.ok) {
      return { status: "unavailable" };
    }

    const messagePayload = (await messagesResponse.json()) as {
      messages?: TravelProjectMessage[];
    };
    messages = messagePayload.messages ?? [];
  }

  mergeProjectSession(
    {
      projectId: detail.project.id,
      versionId: currentVersionId,
      sourceType: session.sourceType,
      flowStage,
    },
    dependencies.storage,
  );

  return {
    status: "restored",
    project: {
      projectId: detail.project.id,
      flowStage,
      currentVersionId,
      requestedVersionId,
      messages,
    },
  };
}

interface CreateFlowPlaceholderProps {
  testId: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function CreateFlowPlaceholder({
  testId,
  title,
  description,
  action,
}: CreateFlowPlaceholderProps) {
  return (
    <section
      data-testid={testId}
      className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-4 py-5"
    >
      <p className="journey-kicker">Create Flow</p>
      <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}

interface CreateFlowGeneratingProps {
  view: CreateFlowView;
  entrySource: CreateEntrySource | undefined;
  onRetry: () => void;
}

function CreateFlowGeneratingPanel({
  view,
  entrySource,
  onRetry,
}: CreateFlowGeneratingProps) {
  return (
    <GenerationLoadingPanel
      context={resolveLoadingContext(view, entrySource)}
      destinationLabel="这段旅程"
      onRetry={onRetry}
    />
  );
}

interface CreateFlowWorkspacePreviewProps {
  projectId: string;
  entrySource: CreateEntrySource | undefined;
}

function CreateFlowWorkspacePreviewPanel({
  projectId,
  entrySource,
}: CreateFlowWorkspacePreviewProps) {
  return (
    <ProposalPreviewPanel
      projectId={projectId}
      context={resolveProposalContext("workspace_preview", entrySource)}
    />
  );
}

export function CreateFlowRouterView({
  view,
  onRetry,
  projectId,
  currentVersionId,
  entrySource,
}: {
  view: Exclude<CreateFlowView, "chat" | "revision">;
  onRetry?: () => void;
  projectId?: string;
  currentVersionId?: string;
  entrySource?: CreateEntrySource;
}) {
  if (view === "proposal") {
    if (!projectId) {
      return (
        <CreateFlowPlaceholder
          testId="create-flow-proposal-placeholder"
          title="还没有找到这版方案"
          description="还没有拿到当前项目，去 /create 重新开始一次整理。"
        />
      );
    }
    return (
      <ProposalPreviewPanel
        projectId={projectId}
        context={resolveProposalContext("proposal", entrySource)}
      />
    );
  }

  if (view === "workspace_preview") {
    if (!projectId || !currentVersionId) {
      return (
        <CreateFlowPlaceholder
          testId="create-flow-workspace-pending"
          title="Finalising your workspace"
          description="The project is ready, but its current version is not available yet."
          action={
            onRetry ? (
              <button type="button" onClick={onRetry} className="text-sm font-semibold underline">
                Check again
              </button>
            ) : undefined
          }
        />
      );
    }
    return (
      <CreateFlowWorkspacePreviewPanel
        projectId={projectId}
        entrySource={entrySource}
      />
    );
  }

  if (view === "generating") {
    return (
      <CreateFlowGeneratingPanel
        view={view}
        entrySource={entrySource}
        onRetry={() => onRetry?.()}
      />
    );
  }

  if (view === "resume") {
    return (
      <CreateFlowPlaceholder
        testId="create-flow-resume-placeholder"
        title="This planning session is paused"
        description="Resume controls will be connected in a later Create step."
      />
    );
  }

  return (
    <CreateFlowPlaceholder
      testId="create-flow-workspace-pending"
      title="Finishing your workspace"
      description="The project is ready, but its current version is not available yet."
      action={
        onRetry ? (
          <button type="button" onClick={onRetry} className="text-sm font-semibold underline">
            Check again
          </button>
        ) : undefined
      }
    />
  );
}

export function CreateFlowRouter({
  entrySource,
  archiveSlug,
  projectId,
  versionId,
  initialDraft,
  continueSession,
}: CreateFlowRouterProps) {
  const [state, setState] = useState<CreateFlowRouterState>({ status: "loading" });

  const restore = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const result = await restoreCreateFlowRoute({
        continueSession,
        entrySource,
        explicitProjectId: projectId,
        explicitVersionId: versionId,
      });
      setState(result);
    } catch {
      setState({ status: "unavailable" });
    }
  }, [continueSession, entrySource, projectId, versionId]);

  useEffect(() => {
    let active = true;

    restoreCreateFlowRoute({
      continueSession,
      entrySource,
      explicitProjectId: projectId,
      explicitVersionId: versionId,
    })
      .then((result) => {
        if (active) {
          setState(result);
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "unavailable" });
        }
      });

    return () => {
      active = false;
    };
  }, [continueSession, entrySource, projectId, versionId]);

  const view =
    state.status === "restored"
      ? resolveCreateFlowView(
          state.project.flowStage,
          state.project.currentVersionId,
        )
      : undefined;

  if (state.status === "loading") {
    return (
      <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-4 text-sm text-[var(--ink-muted)]">
        正在检查你之前有没有继续中的 AI 规划...
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <CreateFlowPlaceholder
        testId="create-flow-restore-unavailable"
        title="We could not restore this planning session"
        description="No new project was created. Check your connection and try restoring again."
        action={
          <button type="button" onClick={() => void restore()} className="text-sm font-semibold underline">
            Try again
          </button>
        }
      />
    );
  }

  if (state.status === "new") {
    return (
      <CreateChatWorkspace
        entrySource={entrySource}
        archiveSlug={archiveSlug}
        initialDraft={initialDraft}
        initialProjectId={projectId}
        initialVersionId={versionId}
        forceRevisionMode={entrySource === "revision"}
        onFirstVersionGenerated={() => void restore()}
      />
    );
  }

  if (view === "chat" || view === "revision" || entrySource === "revision") {
    return (
      <CreateChatWorkspace
        entrySource={entrySource}
        archiveSlug={archiveSlug}
        initialDraft={initialDraft}
        initialProjectId={state.project.projectId}
        initialVersionId={
          state.project.requestedVersionId ?? state.project.currentVersionId
        }
        forceRevisionMode={entrySource === "revision"}
        onFirstVersionGenerated={() => void restore()}
      />
    );
  }

  return (
    <CreateFlowRouterView
      view={view ?? "workspace_pending"}
      onRetry={() => void restore()}
      projectId={state.status === "restored" ? state.project.projectId : undefined}
      currentVersionId={
        state.status === "restored" ? state.project.currentVersionId : undefined
      }
      entrySource={entrySource}
    />
  );
}
