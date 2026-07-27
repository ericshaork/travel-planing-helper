const { createTaskState, transitionTaskStatus } = require("../state/asset_status_manager");
const { buildPhotoQueries } = require("../search/photo_query_builder");
const { searchWikimediaPhotos } = require("../adapters/wikimedia_photo_adapter");
const { downloadImage } = require("../download/image_downloader");
const { validateImageCandidate } = require("../validation/image_validator");
const { rankPhotos } = require("../ranking/photo_ranker");
const { routePhotoSources } = require("../photo_source/photo_source_router");
const { createPhotoSourceAdapter } = require("../photo_source/adapters");
const { createProvider } = require("../providers");
const { buildAiGeneratedPromptSpecFromTask } = require("../generation/build_ai_generated_prompt_spec_from_task");
const { executeHybridTask: executeHybridTaskV1 } = require("./hybrid_executor");

function buildMockFilePath(task) {
  const assetKey = task.asset_instance_id || task.asset_id;

  return `mock://image-assets/${assetKey}.${task.mode}.jpg`;
}

function buildImageAsset(task, taskState, source) {
  return {
    asset_id: task.asset_id,
    asset_instance_id: task.asset_instance_id,
    image_slot: task.image_slot,
    source,
    file_path: buildMockFilePath(task),
    status: taskState.status
  };
}

function buildFailedRealPhotoAsset(task, reason, selection, metadata) {
  return {
    asset_id: task.asset_id,
    asset_instance_id: task.asset_instance_id,
    image_slot: task.image_slot,
    source: "real_photo",
    file_path: "",
    status: "failed",
    reason,
    retry_count: metadata && typeof metadata.retry_count === "number" ? metadata.retry_count : 0,
    last_error: metadata && Object.prototype.hasOwnProperty.call(metadata, "last_error") ? metadata.last_error : null,
    download_status: metadata && metadata.download_status ? metadata.download_status : "failed",
    fallback_available: true,
    selection,
    metadata
  };
}

function buildFailedAiGeneratedAsset(task, reason, metadata) {
  return {
    asset_id: task.asset_id,
    asset_instance_id: task.asset_instance_id,
    image_slot: task.image_slot,
    source: "ai_generated",
    file_path: "",
    status: "failed",
    reason,
    metadata
  };
}

function pickFirstGeneratedJob(providerJobResult) {
  const jobResults = Array.isArray(providerJobResult && providerJobResult.job_results)
    ? providerJobResult.job_results
    : [];

  return jobResults[0] || null;
}

function pickFirstGeneratedFile(jobResult) {
  const files = Array.isArray(jobResult && jobResult.files) ? jobResult.files : [];

  return files[0] || null;
}

function pickFirstGeneratedError(jobResult) {
  if (jobResult && jobResult.error) {
    return jobResult.error;
  }

  const variants = Array.isArray(jobResult && jobResult.variants) ? jobResult.variants : [];
  const failedVariant = variants.find((variant) => variant && variant.error);

  return failedVariant ? failedVariant.error : undefined;
}

function normalizeDownloadResult(downloadResult) {
  if (typeof downloadResult === "string") {
    return {
      filePath: downloadResult,
      retryCount: 0,
      lastError: null,
      downloadStatus: "completed"
    };
  }

  return {
    filePath: downloadResult && downloadResult.filePath ? downloadResult.filePath : "",
    retryCount: downloadResult && typeof downloadResult.retryCount === "number" ? downloadResult.retryCount : 0,
    lastError: downloadResult && Object.prototype.hasOwnProperty.call(downloadResult, "lastError")
      ? downloadResult.lastError
      : null,
    downloadStatus: downloadResult && downloadResult.downloadStatus ? downloadResult.downloadStatus : "completed"
  };
}

async function searchCandidatesFromSource(sourceCandidate, task, queries) {
  try {
    const adapter = createPhotoSourceAdapter(sourceCandidate.source);
    const result = await adapter.search(task, {
      queries,
      source_candidate: sourceCandidate
    });

    return {
      source: result.source || sourceCandidate.source,
      candidates: Array.isArray(result.candidates) ? result.candidates : [],
      error: result.error || null
    };
  } catch (error) {
    return {
      source: sourceCandidate.source,
      candidates: [],
      error: error.message || String(error)
    };
  }
}

async function executeRealPhotoTask(task, taskState) {
  let selectedSource = null;
  let candidateCount = 0;
  let rejectedCount = 0;
  let selected = null;

  try {
    const queries = buildPhotoQueries(task);
    const sourceRouting = routePhotoSources(task);
    const sourceRuns = [];
    let selectedAdapter = null;
    let ranked = [];
    let hadCandidates = false;
    let hadValidationFailure = false;

    for (const sourceCandidate of sourceRouting.source_candidates) {
      const sourceRun = await searchCandidatesFromSource(sourceCandidate, task, queries);

      sourceRuns.push({
        source: sourceRun.source,
        priority: sourceCandidate.priority,
        candidate_count: sourceRun.candidates.length,
        error: sourceRun.error
      });

      if (sourceRun.candidates.length === 0) {
        continue;
      }

      hadCandidates = true;

      const adapter = createPhotoSourceAdapter(sourceCandidate.source);
      const validated = [];
      let sourceRejectedCount = 0;

      for (const candidate of sourceRun.candidates) {
        const validation = adapter.validate
          ? adapter.validate(candidate, task)
          : validateImageCandidate(candidate);

        if (!validation.valid) {
          sourceRejectedCount += 1;
          continue;
        }

        validated.push({
          ...candidate,
          validation
        });
      }

      if (validated.length === 0) {
        hadValidationFailure = true;
        candidateCount = sourceRun.candidates.length;
        rejectedCount = sourceRejectedCount;
        sourceRuns[sourceRuns.length - 1].error = "no_valid_photo_candidate";
        sourceRuns[sourceRuns.length - 1].rejected_count = sourceRejectedCount;
        continue;
      }

      selectedSource = sourceCandidate;
      selectedAdapter = adapter;
      candidateCount = sourceRun.candidates.length;
      rejectedCount = sourceRejectedCount;
      ranked = adapter.rank
        ? adapter.rank(validated, task)
        : rankPhotos(validated, {
            asset_id: task.asset_id,
            prompt: task.prompt,
            location: task.metadata && task.metadata.location,
            asset_role: task.image_slot
          });
      break;
    }

    if (ranked.length === 0) {
      const failureReason = hadCandidates && hadValidationFailure
        ? "no_valid_photo_candidate"
        : "no_photo_search_result";

      transitionTaskStatus(taskState, "failed", "No usable real photo result found from configured sources.");

      return buildFailedRealPhotoAsset(
        task,
        failureReason,
        {
          rank_score: 0,
          candidate_count: candidateCount,
          rejected_count: rejectedCount
        },
        {
          source_runs: sourceRuns
        }
      );
    }

    selected = {
      ...ranked[0],
      asset_id: task.asset_id
    };
    const downloadResult = selectedAdapter && selectedAdapter.download
      ? await selectedAdapter.download(selected, task)
      : await downloadImage(selected, {
          outputDir: task.metadata && task.metadata.download_output_dir
        });
    const normalizedDownload = normalizeDownloadResult(downloadResult);

    transitionTaskStatus(taskState, "completed", "Real photo downloaded from routed source.");

    return {
      asset_id: task.asset_id,
      asset_instance_id: task.asset_instance_id,
      image_slot: task.image_slot,
      source: selectedSource ? selectedSource.source : "wikimedia",
      file_path: normalizedDownload.filePath,
      status: taskState.status,
      retry_count: normalizedDownload.retryCount,
      last_error: normalizedDownload.lastError,
      download_status: normalizedDownload.downloadStatus,
      fallback_available: false,
      selection: {
        selected_candidate: {
          source: selectedSource ? selectedSource.source : (selected.source || "unknown"),
          candidate_id: selected.candidate_id || "",
          image_url: selected.image_url || selected.url || ""
        },
        rank_score: selected.score,
        candidate_count: candidateCount,
        rejected_count: rejectedCount
      },
      metadata: {
        source_runs: sourceRuns,
        title: selected.title,
        description: selected.description,
        author: selected.author,
        license: selected.license,
        source_url: selected.source_url,
        image_url: selected.url,
        width: selected.width,
        height: selected.height,
        mime_type: selected.mime_type,
        score_reasons: selected.score_reasons
      }
    };
  } catch (error) {
    transitionTaskStatus(taskState, "failed", error.message || "Real photo executor failed.");

    return buildFailedRealPhotoAsset(
      task,
      "real_photo_executor_error",
      {
        selected_candidate: selected
          ? {
              source: selectedSource ? selectedSource.source : (selected.source || "unknown"),
              candidate_id: selected.candidate_id || "",
              image_url: selected.image_url || selected.url || ""
            }
          : null,
        rank_score: 0,
        candidate_count: 0,
        rejected_count: 0
      },
      {
        error: error.message || String(error),
        retry_count: typeof error.retryCount === "number" ? error.retryCount : 0,
        last_error: Object.prototype.hasOwnProperty.call(error, "lastError") ? error.lastError : (error.message || String(error)),
        download_status: error.downloadStatus || "failed"
      }
    );
  }
}

async function executeAiGeneratedTask(task, taskState) {
  try {
    const normalizedPromptSpec = buildAiGeneratedPromptSpecFromTask(task);
    const provider = createProvider("seedream", {
      outputDir: task.metadata && task.metadata.generated_output_dir
    });
    const providerJobResult = await provider.generate(normalizedPromptSpec);
    const jobResult = pickFirstGeneratedJob(providerJobResult);
    const generatedFile = pickFirstGeneratedFile(jobResult);

    if (!jobResult || jobResult.status !== "completed" || !generatedFile || !generatedFile.storage_ref) {
      transitionTaskStatus(taskState, "failed", "Seedream did not return a completed generated image file.");

      return buildFailedAiGeneratedAsset(
        task,
        "ai_generation_failed",
        {
          provider_id: providerJobResult && providerJobResult.provider_id,
          model_id: providerJobResult && providerJobResult.model_id,
          provider_job_id: jobResult && jobResult.provider_job_id,
          prompt: jobResult && jobResult.parameters && jobResult.parameters.prompt,
          provider_status: jobResult && jobResult.status,
          error: pickFirstGeneratedError(jobResult)
        }
      );
    }

    transitionTaskStatus(taskState, "completed", "AI-generated image completed through Seedream provider.");

    return {
      asset_id: task.asset_id,
      asset_instance_id: task.asset_instance_id,
      image_slot: task.image_slot,
      source: "ai_generated",
      file_path: generatedFile.storage_ref,
      status: taskState.status,
      metadata: {
        provider_id: providerJobResult.provider_id,
        model_id: providerJobResult.model_id,
        provider_job_id: jobResult.provider_job_id,
        prompt: jobResult.parameters && jobResult.parameters.prompt
      }
    };
  } catch (error) {
    transitionTaskStatus(taskState, "failed", error.message || "AI-generated executor failed.");

    return buildFailedAiGeneratedAsset(
      task,
      "ai_generated_executor_error",
      {
        error: error.message || String(error)
      }
    );
  }
}

async function executeHybridTask(task, taskState) {
  return executeHybridTaskV1(task, taskState, {
    executeRealPhotoTask,
    executeAiGeneratedTask
  });
}

function resolveExecutor(mode) {
  const executors = {
    real_photo: executeRealPhotoTask,
    ai_generated: executeAiGeneratedTask,
    hybrid: executeHybridTask
  };

  return executors[mode];
}

async function executeAssetTask(task) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error("task must be an object.");
  }

  const taskState = createTaskState(task);
  const executor = resolveExecutor(task.mode || task.generation_mode);

  if (!executor) {
    transitionTaskStatus(taskState, "failed", `Unsupported generation mode "${task.mode || task.generation_mode}".`);

    return {
      task,
      task_state: taskState,
      image_asset: {
        asset_id: task.asset_id,
        asset_instance_id: task.asset_instance_id,
        image_slot: task.image_slot,
        source: task.mode || task.generation_mode || "unknown",
        file_path: "",
        status: "failed"
      }
    };
  }

  transitionTaskStatus(taskState, "processing", "Executor dispatcher accepted task.");

  const imageAsset = await executor(task, taskState);

  return {
    task,
    task_state: taskState,
    image_asset: imageAsset
  };
}

module.exports = {
  executeAssetTask
};
