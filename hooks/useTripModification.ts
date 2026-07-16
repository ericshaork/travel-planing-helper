import { useState } from "react";

import type { ItineraryBlockView } from "@/lib/trip/itinerary-view";
import {
  addPendingChangeItem,
  buildPendingChangeItem,
  buildPendingChangesRequest,
  buildQuickModificationRequest,
  mergeModificationRequest,
  type PendingChangeAction,
  type PendingChangeItem,
  type QuickModificationType,
} from "@/lib/trip/modification-intents";

interface UseTripModificationResult {
  modificationDraft: string;
  pendingChanges: PendingChangeItem[];
  externalDraftVersion: number;
  setModificationDraft: (value: string) => void;
  queueBlockAction: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
  applyQuickModification: (type: QuickModificationType) => void;
  removePendingChange: (id: string) => void;
  clearPendingChanges: () => void;
  writePendingChangesToDraft: () => boolean;
  resetModificationState: () => void;
}

export function useTripModification(): UseTripModificationResult {
  const [modificationDraft, setModificationDraft] = useState("");
  const [pendingChanges, setPendingChanges] = useState<PendingChangeItem[]>([]);
  const [externalDraftVersion, setExternalDraftVersion] = useState(0);

  function queueBlockAction(
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) {
    const nextPendingChange = buildPendingChangeItem(actionType, block);

    setPendingChanges((current) =>
      addPendingChangeItem(current, nextPendingChange),
    );
  }

  function applyQuickModification(type: QuickModificationType) {
    const nextDraft = buildQuickModificationRequest(type);

    setModificationDraft(nextDraft);
    setExternalDraftVersion((currentVersion) => currentVersion + 1);
  }

  function removePendingChange(id: string) {
    setPendingChanges((current) => current.filter((item) => item.id !== id));
  }

  function clearPendingChanges() {
    setPendingChanges([]);
  }

  function writePendingChangesToDraft() {
    const compiledChanges = buildPendingChangesRequest(pendingChanges);

    if (!compiledChanges) {
      return false;
    }

    setModificationDraft((currentDraft) =>
      mergeModificationRequest(currentDraft, compiledChanges),
    );
    setPendingChanges([]);
    setExternalDraftVersion((currentVersion) => currentVersion + 1);

    return true;
  }

  function resetModificationState() {
    setPendingChanges([]);
    setModificationDraft("");
    setExternalDraftVersion(0);
  }

  return {
    modificationDraft,
    pendingChanges,
    externalDraftVersion,
    setModificationDraft,
    queueBlockAction,
    applyQuickModification,
    removePendingChange,
    clearPendingChanges,
    writePendingChangesToDraft,
    resetModificationState,
  };
}
