"use client";

import { useEffect, useState } from "react";

import type { TripPlan, TripRequest } from "@/lib/trip/types";
import type {
  TravelProjectVersion,
  TravelProjectVersionReason,
} from "@/lib/projects/types";
import {
  loadWorkspaceVersionSummary,
  saveWorkspacePlanAsNewVersion,
  type WorkspaceVersionSummary,
} from "@/lib/projects/version/version-client";

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

interface WorkspaceVersionSaveButtonProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
}

function getVersionReasonLabel(
  reason: TravelProjectVersionReason | null | undefined,
) {
  switch (reason) {
    case "manual_edit":
      return "手动编辑版";
    case "ai_adjust":
      return "AI 调整版";
    case "template_import":
      return "档案导入版";
    case "import_transform":
      return "导入整理版";
    case "ai_generate":
    default:
      return "初始方案";
  }
}

function buildVersionLabel(summary: WorkspaceVersionSummary | null) {
  if (!summary) {
    return "当前版本";
  }

  return `V${summary.versionNumber}`;
}

function buildStatusMessage(input: {
  summary: WorkspaceVersionSummary | null;
  saveState: SaveState;
  savedVersion: TravelProjectVersion | null;
  errorMessage?: string;
}) {
  if (input.saveState === "saving") {
    return "正在把这次修改整理成新的版本。";
  }

  if (input.saveState === "saved" && input.savedVersion) {
    return `已生成 V${input.savedVersion.versionNumber}，刷新后也会回到这一版。`;
  }

  if (input.saveState === "error") {
    return input.errorMessage ?? "这次保存没有成功，请稍后再试。";
  }

  if (input.summary) {
    return `${buildVersionLabel(input.summary)} ${getVersionReasonLabel(
      input.summary.createdFrom,
    )}`;
  }

  return "当前项目还没有可追踪的版本信息。";
}

export function WorkspaceVersionSaveButton({
  tripPlan,
  tripRequest,
}: WorkspaceVersionSaveButtonProps) {
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [summary, setSummary] = useState<WorkspaceVersionSummary | null>(null);
  const [savedVersion, setSavedVersion] = useState<TravelProjectVersion | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const nextSummary = await loadWorkspaceVersionSummary();

      if (!active) {
        return;
      }

      setSummary(nextSummary);
      setSaveState("idle");
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  async function handleSaveVersion() {
    setSaveState("saving");
    setErrorMessage(undefined);

    const version = await saveWorkspacePlanAsNewVersion({
      tripPlan,
      tripRequest,
      createdFrom: "manual_edit",
      createdBy: "workspace_manual_save",
    });

    if (!version) {
      setSaveState("error");
      setErrorMessage("当前版本上下文还没准备好，暂时不能保存新版本。");
      return;
    }

    setSavedVersion(version);
    setSummary({
      projectId: version.projectId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      createdFrom: version.createdFrom ?? null,
      tripTitle: version.tripPlan.tripTitle,
    });
    setSaveState("saved");
  }

  const isBusy = saveState === "loading" || saveState === "saving";
  const versionLabel = buildVersionLabel(summary);
  const helperMessage = buildStatusMessage({
    summary,
    saveState,
    savedVersion,
    errorMessage,
  });

  return (
    <div className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-[rgb(179_164_132_/_0.72)] bg-[linear-gradient(180deg,rgba(252,246,231,0.98)_0%,rgba(255,253,247,0.98)_100%)] px-2 py-1 text-[var(--ink)]">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--ink)]">
          {versionLabel}
        </p>
        <p
          aria-live="polite"
          className="hidden max-w-44 truncate text-[10px] text-[var(--ink-muted)] 2xl:block"
          title={helperMessage}
        >
          {helperMessage}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSaveVersion}
        disabled={isBusy}
        className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-1 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
      >
        {saveState === "saving"
          ? "保存中"
          : saveState === "saved"
            ? "已保存新版本"
            : "保存新版本"}
      </button>
    </div>
  );
}
