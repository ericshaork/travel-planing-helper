"use client";

import { postGenerateTrip } from "../ai/generate-client";
import { ensureWorkspaceProjectEntry } from "./entry-client";
import { submitInterviewParseTrip } from "./create-flow-client";
import {
  getStructuredImportMissingFieldLabels,
  mergeImportedDrafts,
  parseStructuredTravelFile,
  validateStructuredImportDraft,
} from "./file-import";
import type { StorageLike } from "../trip/storage";
import type {
  GenerateTripResponse,
  ParseTripResponse,
  TripPlan,
  TripRequest,
} from "../trip/types";
import type { ApiErrorResponse } from "../utils/errors";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface FileImportInput {
  file: File;
  storage?: StorageLike;
}

export interface FileImportResult {
  projectId: string;
  versionId: string;
  revisionHref: string;
  tripRequest: TripRequest;
  tripPlan: TripPlan;
}

export interface FileImportDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  return (payload as Partial<ApiErrorResponse> | null)?.error?.message ?? fallback;
}

function buildRevisionHref(projectId: string, versionId: string) {
  const searchParams = new URLSearchParams({
    source: "revision",
    projectId,
    versionId,
  });

  return `/create?${searchParams.toString()}`;
}

function resolveFileMimeType(file: File, extension: string | undefined) {
  if (file.type.trim()) {
    return file.type;
  }

  if (extension === "md") {
    return "text/markdown";
  }

  return "text/plain";
}

function buildImportedProjectTitle(
  fileName: string,
  tripRequest: TripRequest,
) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim();
  const destination = tripRequest.destinationCity.trim();
  const days = tripRequest.days;

  if (destination && days > 0) {
    return `${destination} ${days} day import`;
  }

  return baseName || `${destination} import`;
}

async function readFileText(file: File) {
  return file.text();
}

export async function importStructuredTravelFile(
  input: FileImportInput,
  dependencies: FileImportDependencies = {},
): Promise<FileImportResult> {
  const extension = input.file.name.split(".").pop()?.toLowerCase();

  if (extension !== "md" && extension !== "txt") {
    throw new Error("当前仅支持导入 .md 或 .txt 文件。");
  }

  const rawText = await readFileText(input.file);
  const structured = parseStructuredTravelFile(rawText);

  if (structured.missingTemplateFields.length > 0) {
    const fieldLabels = getStructuredImportMissingFieldLabels(
      structured.missingTemplateFields,
    );
    throw new Error(
      `导入文件缺少必要旅行信息，请补充后重新导入。缺少字段：${fieldLabels.join("、")}`,
    );
  }

  let parsedResult: ParseTripResponse | null = null;

  try {
    parsedResult = await submitInterviewParseTrip(
      {
        text: structured.rawText,
      },
      {
        fetcher: dependencies.fetcher,
      },
    );
  } catch {
    parsedResult = null;
  }

  const mergedDraft = mergeImportedDrafts(
    structured.draft,
    parsedResult?.parsed,
  );
  const validated = validateStructuredImportDraft(mergedDraft);
  const generateResponse = await postGenerateTrip(
    {
      tripRequest: validated.tripRequest,
    },
    {
      fetchImpl: dependencies.fetcher,
      getAccessToken: dependencies.getAccessToken,
    },
  );
  const generatePayload = (await generateResponse
    .json()
    .catch(() => null)) as GenerateTripResponse | ApiErrorResponse | null;

  if (!generateResponse.ok || !generatePayload || !("tripPlan" in generatePayload)) {
    throw new Error(
      getApiErrorMessage(
        generatePayload,
        "导入内容暂时没能生成第一版行程，请稍后再试。",
      ),
    );
  }

  const created = await ensureWorkspaceProjectEntry(
    {
      title: buildImportedProjectTitle(input.file.name, validated.tripRequest),
      sessionSourceType: "uploaded_file",
      sourceTitle: input.file.name,
      sourcePayload: {
        rawText: structured.rawText,
        fileName: input.file.name,
        fileType: resolveFileMimeType(input.file, extension),
        parsedRequest: validated.tripRequest,
      },
      tripPlan: generatePayload.tripPlan,
      tripRequest: validated.tripRequest,
      createdFrom: "import_transform",
      lifecycleState: "workspace",
      flowStage: "workspace_ready",
      workspaceModeDefault: "read",
      storage: input.storage,
    },
    dependencies,
  );

  if (!created) {
    throw new Error("导入文件需要登录后才能创建旅行版本。");
  }

  return {
    projectId: created.projectId,
    versionId: created.versionId,
    revisionHref: buildRevisionHref(created.projectId, created.versionId),
    tripRequest: validated.tripRequest,
    tripPlan: generatePayload.tripPlan,
  };
}
