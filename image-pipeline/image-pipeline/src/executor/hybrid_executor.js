const { createTaskState, transitionTaskStatus } = require("../state/asset_status_manager");

function inferUsageProfile(task) {
  const metadata = task.metadata || {};

  if (metadata.image_usage_profile) {
    return metadata.image_usage_profile;
  }

  if (task.image_slot === "food_gallery") {
    return "food";
  }

  if (task.image_slot === "poi_gallery" || task.image_slot === "place_gallery" || task.image_slot === "detail_image") {
    return "place";
  }

  if (task.image_slot === "day_cover" || task.type === "experience") {
    return "experience";
  }

  if (task.image_slot === "explore_cover" || task.image_slot === "trip_cover") {
    return "cover";
  }

  return "experience";
}

function summarizeAsset(imageAsset) {
  if (!imageAsset) {
    return null;
  }

  return {
    source: imageAsset.source,
    status: imageAsset.status,
    file_path: imageAsset.file_path,
    reason: imageAsset.reason,
    retry_count: imageAsset.retry_count,
    last_error: imageAsset.last_error,
    download_status: imageAsset.download_status,
    fallback_available: imageAsset.fallback_available,
    selection: imageAsset.selection,
    metadata: imageAsset.metadata
  };
}

function buildHybridAsset(task, taskState, filePath, metadata) {
  return {
    asset_id: task.asset_id,
    asset_instance_id: task.asset_instance_id,
    image_slot: task.image_slot,
    source: "hybrid",
    file_path: filePath,
    status: taskState.status,
    metadata
  };
}

function buildFailedHybridAsset(task, reason, metadata) {
  return {
    asset_id: task.asset_id,
    asset_instance_id: task.asset_instance_id,
    image_slot: task.image_slot,
    source: "hybrid",
    file_path: "",
    status: "failed",
    reason,
    metadata
  };
}

function buildRealPhotoTask(task) {
  return {
    ...task,
    mode: "real_photo",
    generation_mode: "real_photo"
  };
}

function buildAiFallbackTask(task) {
  return {
    ...task,
    mode: "ai_generated",
    generation_mode: "ai_generated"
  };
}

async function executeHybridTask(task, taskState, executors) {
  const usageProfile = inferUsageProfile(task);
  const strategy = "real_photo_first_ai_fallback";
  const realTask = buildRealPhotoTask(task);
  const realTaskState = createTaskState(realTask);
  const realPhotoAsset = await executors.executeRealPhotoTask(realTask, realTaskState);
  const realPhotoSummary = summarizeAsset(realPhotoAsset);

  if (realPhotoAsset.status === "completed" && realPhotoAsset.file_path) {
    transitionTaskStatus(taskState, "completed", "Hybrid completed with real-photo first strategy.");

    return buildHybridAsset(task, taskState, realPhotoAsset.file_path, {
      strategy,
      usage_profile: usageProfile,
      resolved_via: "real_photo",
      real_photo: realPhotoSummary,
      ai_fallback: null
    });
  }

  if (usageProfile === "place" || usageProfile === "food") {
    transitionTaskStatus(taskState, "failed", "Hybrid real-photo stage failed and AI fallback is not allowed for this usage profile.");

    return buildFailedHybridAsset(task, "hybrid_real_photo_required_failed", {
      strategy,
      usage_profile: usageProfile,
      real_photo: realPhotoSummary,
      ai_fallback: {
        attempted: false,
        reason: `${usageProfile} assets do not allow AI fallback in Hybrid v1.`
      }
    });
  }

  const aiTask = buildAiFallbackTask(task);
  const aiTaskState = createTaskState(aiTask);
  const aiAsset = await executors.executeAiGeneratedTask(aiTask, aiTaskState);
  const aiSummary = summarizeAsset(aiAsset);

  if (aiAsset.status === "completed" && aiAsset.file_path) {
    transitionTaskStatus(taskState, "completed", "Hybrid completed through AI fallback after real-photo stage failed.");

    return buildHybridAsset(task, taskState, aiAsset.file_path, {
      strategy,
      usage_profile: usageProfile,
      resolved_via: "ai_fallback",
      real_photo: realPhotoSummary,
      ai_fallback: aiSummary
    });
  }

  transitionTaskStatus(taskState, "failed", "Hybrid failed because both real-photo and AI fallback stages failed.");

  return buildFailedHybridAsset(task, "hybrid_ai_fallback_failed", {
    strategy,
    usage_profile: usageProfile,
    real_photo: realPhotoSummary,
    ai_fallback: aiSummary
  });
}

module.exports = {
  executeHybridTask,
  inferUsageProfile
};
