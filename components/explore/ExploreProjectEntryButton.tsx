"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProjectEntryChoiceDialog } from "@/components/projects/ProjectEntryChoiceDialog";
import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { prepareExploreWorkspaceEntry } from "@/lib/explore/flow";

import { GenerateTripButton } from "./GenerateTripButton";

interface ExploreProjectEntryButtonProps {
  item: ArchiveReaderViewModel;
  label?: string;
  helperText?: string;
}

interface CreatedExploreEntry {
  projectId: string;
  versionId: string;
  revisionHref: string;
}

export function ExploreProjectEntryButton({
  item,
  label = "用此档案创建",
  helperText,
}: ExploreProjectEntryButtonProps) {
  const router = useRouter();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [createdEntry, setCreatedEntry] = useState<CreatedExploreEntry | null>(
    null,
  );

  async function handleCreateEntry() {
    if (isPreparing) {
      return;
    }

    setIsPreparing(true);
    setErrorMessage(undefined);

    try {
      const entry = await prepareExploreWorkspaceEntry(item.createDraftSeed);
      setCreatedEntry(entry);
      setIsChoiceOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "这次还没能把旅行版本创建好，请稍后再试。",
      );
      throw error;
    } finally {
      setIsPreparing(false);
    }
  }

  function handleClose() {
    if (isPreparing) {
      return;
    }

    setIsChoiceOpen(false);
  }

  function handleChooseWorkspace() {
    if (!createdEntry) {
      return;
    }

    setIsChoiceOpen(false);
    router.push("/workspace");
  }

  function handleChooseRevision() {
    if (!createdEntry) {
      return;
    }

    setIsChoiceOpen(false);
    router.push(createdEntry.revisionHref);
  }

  return (
    <>
      <GenerateTripButton
        label={label}
        helperText={helperText}
        onGenerate={handleCreateEntry}
      />

      <ProjectEntryChoiceDialog
        open={isChoiceOpen}
        isWorking={isPreparing}
        errorMessage={errorMessage}
        onChooseWorkspace={handleChooseWorkspace}
        onChooseRevision={handleChooseRevision}
        onClose={handleClose}
      />
    </>
  );
}
