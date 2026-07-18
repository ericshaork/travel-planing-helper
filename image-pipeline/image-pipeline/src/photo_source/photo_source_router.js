function buildBaseCandidate(source, priority, task) {
  return {
    source,
    priority,
    asset_role: task.type || task.image_slot || "unknown"
  };
}

function routePhotoSources(task) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error("task must be an object.");
  }

  const metadataCandidates = task.metadata && Array.isArray(task.metadata.photo_source_candidates)
    ? task.metadata.photo_source_candidates
    : null;
  const sourceCandidates = [];
  const imageSlot = String(task.image_slot || "").toLowerCase();
  const type = String(task.type || "").toLowerCase();

  if (metadataCandidates && metadataCandidates.length > 0) {
    for (const [index, candidate] of metadataCandidates.entries()) {
      sourceCandidates.push({
        ...buildBaseCandidate(candidate.source, candidate.priority || index + 1, task),
        selection_hint: candidate.selection_hint
      });
    }
  } else {
    sourceCandidates.push(buildBaseCandidate("wikimedia", 1, task));
    sourceCandidates.push(buildBaseCandidate("pexels", 2, task));
  }

  for (const sourceCandidate of sourceCandidates) {
    if (sourceCandidate.selection_hint) {
      continue;
    }

    if (imageSlot.includes("food") || type === "food") {
      sourceCandidate.selection_hint = "food_or_place_reference_photo";
    } else if (imageSlot.includes("place") || type === "place") {
      sourceCandidate.selection_hint = "landmark_or_location_photo";
    } else {
      sourceCandidate.selection_hint = "general_travel_reference_photo";
    }
  }

  return {
    asset_id: task.asset_id,
    asset_instance_id: task.asset_instance_id,
    source_candidates: sourceCandidates
  };
}

module.exports = {
  routePhotoSources
};
