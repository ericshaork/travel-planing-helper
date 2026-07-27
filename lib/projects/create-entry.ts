export type CreateEntrySource = "ai" | "explore_archive" | "revision";
export type CreateEntryMode = "chat";

export interface ResolvedCreateEntry {
  entrySource?: CreateEntrySource;
  archiveSlug?: string;
  projectId?: string;
  versionId?: string;
  mode?: CreateEntryMode;
  continueSession?: boolean;
}

function isCreateEntrySource(value: string | null): value is CreateEntrySource {
  return value === "ai" || value === "explore_archive" || value === "revision";
}

function isCreateEntryMode(value: string | null): value is CreateEntryMode {
  return value === "chat";
}

export function resolveCreateEntry(
  searchParams: URLSearchParams,
): ResolvedCreateEntry {
  const source = searchParams.get("source");
  const archiveSlug = searchParams.get("archiveSlug");
  const projectId = searchParams.get("projectId");
  const versionId = searchParams.get("versionId");
  const mode = searchParams.get("mode");
  const continueSession = searchParams.get("continue") === "1";

  if (isCreateEntrySource(source) && source === "explore_archive") {
    return {
      entrySource: "explore_archive",
      archiveSlug: archiveSlug?.trim() || undefined,
      mode: isCreateEntryMode(mode) ? mode : undefined,
      continueSession: true,
    };
  }

  if (isCreateEntrySource(source) && source === "ai") {
    return continueSession
      ? { entrySource: "ai", continueSession: true }
      : { entrySource: "ai", continueSession: false };
  }

  if (
    isCreateEntrySource(source) &&
    source === "revision" &&
    projectId?.trim() &&
    versionId?.trim()
  ) {
    return {
      entrySource: "revision",
      projectId: projectId.trim(),
      versionId: versionId.trim(),
      continueSession: true,
    };
  }

  return {};
}
