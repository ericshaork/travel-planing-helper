const WORKSPACE_ROUTE = "/workspace";

const WORKSPACE_CONTEXT_QUERY_KEYS = [
  "tripId",
  "planId",
  "draftId",
  "mode",
] as const;

type WorkspaceContextKey = (typeof WORKSPACE_CONTEXT_QUERY_KEYS)[number];

export type WorkspaceRouteContext = Partial<
  Record<WorkspaceContextKey, string | number | null | undefined>
>;

export interface BuildWorkspaceRouteInput {
  search?: string | URLSearchParams | null;
  context?: WorkspaceRouteContext;
}

function normalizeSearchParams(search?: string | URLSearchParams | null) {
  if (!search) {
    return new URLSearchParams();
  }

  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search);
  }

  const queryStart = search.indexOf("?");
  return new URLSearchParams(queryStart >= 0 ? search.slice(queryStart) : search);
}

function appendContextParam(
  params: URLSearchParams,
  key: WorkspaceContextKey,
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined) {
    return;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return;
  }

  params.set(key, normalized);
}

export function buildWorkspaceRoute(input: BuildWorkspaceRouteInput = {}) {
  const sourceParams = normalizeSearchParams(input.search);
  const workspaceParams = new URLSearchParams();

  for (const key of WORKSPACE_CONTEXT_QUERY_KEYS) {
    appendContextParam(workspaceParams, key, sourceParams.get(key));
  }

  for (const [key, value] of Object.entries(input.context ?? {}) as Array<
    [WorkspaceContextKey, WorkspaceRouteContext[WorkspaceContextKey]]
  >) {
    appendContextParam(workspaceParams, key, value);
  }

  const query = workspaceParams.toString();
  return query ? `${WORKSPACE_ROUTE}?${query}` : WORKSPACE_ROUTE;
}

export function buildWorkspaceRouteFromCurrentLocation(
  context?: WorkspaceRouteContext,
) {
  if (typeof window === "undefined") {
    return buildWorkspaceRoute({ context });
  }

  return buildWorkspaceRoute({
    search: window.location.search,
    context,
  });
}
