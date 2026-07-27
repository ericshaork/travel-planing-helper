function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function titleizeAssetId(assetId) {
  if (!assetId || typeof assetId !== "string") {
    return "Generated cover";
  }

  return assetId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function isCoverSlot(imageSlot) {
  return imageSlot === "cover" || imageSlot === "explore_cover" || imageSlot === "day_cover";
}

function resolveLocationContext(task) {
  const metadata = task.metadata || {};
  return metadata.location_context || metadata.location || {};
}

function buildSubject(task) {
  const locationContext = resolveLocationContext(task);
  const title = locationContext.poi ||
    locationContext.name ||
    locationContext.city ||
    titleizeAssetId(task.asset_id);

  return {
    title,
    summary: task.prompt || task.decision_reason || "",
    location_context: typeof locationContext === "object" && !Array.isArray(locationContext)
      ? locationContext
      : {
          name: String(locationContext)
        }
  };
}

function buildGlobalContext(task) {
  const locationContext = resolveLocationContext(task);

  if (!locationContext || typeof locationContext !== "object" || Array.isArray(locationContext)) {
    return {};
  }

  return {
    destination: {
      city: locationContext.city,
      country: locationContext.country,
      district: locationContext.district,
      poi: locationContext.poi || locationContext.name
    }
  };
}

function buildStyleReference(task) {
  const styleReference = task.metadata && task.metadata.style_reference;

  if (!styleReference || typeof styleReference !== "object") {
    return undefined;
  }

  return {
    ...styleReference,
    images: toArray(styleReference.images)
  };
}

function buildAiGeneratedPromptSpecFromTask(task) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error("task must be an object.");
  }

  if (!isCoverSlot(task.image_slot)) {
    throw new Error(`AI-generated Seedream executor currently only supports cover slots. Received "${task.image_slot}".`);
  }

  const promptSpec = {
    asset_request_id: task.asset_instance_id || task.asset_id,
    asset_role: "cover",
    subject: buildSubject(task),
    style_profile: {
      style_profile_id: task.metadata && task.metadata.style_profile_id
        ? task.metadata.style_profile_id
        : "wanderly_travel_journal"
    },
    output_spec: {
      min_width: task.metadata && task.metadata.min_width ? task.metadata.min_width : 1024,
      min_height: task.metadata && task.metadata.min_height ? task.metadata.min_height : 1280,
      aspect_ratio: task.metadata && task.metadata.aspect_ratio ? task.metadata.aspect_ratio : "4:5",
      orientation: task.metadata && task.metadata.orientation ? task.metadata.orientation : "portrait",
      variant_count: 1,
      transparent_background: false
    },
    constraints: {
      quality_requirements: [
        "original travel cover image",
        "no text",
        "no watermark",
        "no logo"
      ]
    },
    provider_notes: [
      task.prompt || "",
      task.decision_reason || ""
    ].filter(Boolean)
  };

  const styleReference = buildStyleReference(task);

  if (styleReference) {
    promptSpec.style_reference = styleReference;
  }

  return {
    request_id: `${task.task_id || task.asset_instance_id || task.asset_id}_ai_generated`,
    manifest_id: task.manifest_id,
    global_context: buildGlobalContext(task),
    prompt_specs: [promptSpec]
  };
}

module.exports = {
  buildAiGeneratedPromptSpecFromTask
};
