const fs = require("fs");
const path = require("path");

const MANIFEST_SCHEMA_VERSION = "1.0.0";

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickDefined(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function mapByAssetRequestId(items, label) {
  const mapped = new Map();

  for (const item of toArray(items)) {
    if (!item || typeof item !== "object" || !item.asset_request_id) {
      continue;
    }

    if (mapped.has(item.asset_request_id)) {
      throw new Error(`Duplicate asset_request_id "${item.asset_request_id}" found in ${label}.`);
    }

    mapped.set(item.asset_request_id, item);
  }

  return mapped;
}

function buildSubjectSnapshot(assetRequest) {
  const subject = assetRequest.subject || {};
  const location = subject.location || {};
  const timeContext = subject.time_context || {};

  return pickDefined({
    entity_type: subject.entity_type,
    entity_id: subject.entity_id,
    entity_ref: subject.entity_ref,
    title: subject.title,
    location_name: location.name,
    day_index: timeContext.day_index,
    part_of_day: timeContext.part_of_day
  });
}

function buildProviderInfo(jobResult) {
  return pickDefined({
    provider_id: jobResult.provider_id,
    provider_label: jobResult.provider_id,
    model_id: jobResult.model_id,
    model_label: jobResult.model_id
  });
}

function buildGenerationInfo(jobResult) {
  const firstFile = toArray(jobResult.files)[0];
  const submittedAt = jobResult.submitted_at;
  const completedAt = jobResult.completed_at;
  const durationMs = submittedAt && completedAt
    ? Math.max(0, new Date(completedAt).getTime() - new Date(submittedAt).getTime())
    : undefined;

  return pickDefined({
    submitted_at: submittedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    provider_request_id: jobResult.provider_job_id,
    size: firstFile
      ? pickDefined({
          width: firstFile.width,
          height: firstFile.height
        })
      : undefined,
    parameters: jobResult.parameters
  });
}

function buildFiles(jobResult) {
  return toArray(jobResult.files).map((file) =>
    pickDefined({
      file_kind: file.file_kind,
      storage_ref: file.storage_ref,
      mime_type: file.mime_type,
      width: file.width,
      height: file.height,
      size_bytes: file.size_bytes,
      checksum: file.checksum
    })
  );
}

function buildReview() {
  return {
    status: "pending",
    notes: "Initialized by manifest writer stub."
  };
}

function buildAssetId(assetRequestId) {
  return `asset_${assetRequestId.replace(/^assetreq_/, "")}`;
}

function buildVariantAssetId(assetRequestId, variantIndex) {
  return `${buildAssetId(assetRequestId)}_variant_${String(variantIndex).padStart(3, "0")}`;
}

function buildGenerationInfoFromFile(jobResult, file, providerRequestId, submittedAt, completedAt) {
  const durationMs = submittedAt && completedAt
    ? Math.max(0, new Date(completedAt).getTime() - new Date(submittedAt).getTime())
    : undefined;

  return pickDefined({
    submitted_at: submittedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    provider_request_id: providerRequestId,
    size: file
      ? pickDefined({
          width: file.width,
          height: file.height
        })
      : undefined,
    parameters: jobResult.parameters
  });
}

function buildFilesFromSingleFile(file) {
  if (!file) {
    return [];
  }

  return [
    pickDefined({
      file_kind: file.file_kind,
      storage_ref: file.storage_ref,
      mime_type: file.mime_type,
      width: file.width,
      height: file.height,
      size_bytes: file.size_bytes,
      checksum: file.checksum
    })
  ];
}

function buildVariantAssetRecords(assetRequest, jobResult) {
  return toArray(jobResult.variants).map((variant) => {
    const file = variant.file;

    return {
      asset_id: buildVariantAssetId(assetRequest.asset_request_id, variant.variant_index),
      asset_request_id: assetRequest.asset_request_id,
      asset_role: assetRequest.asset_role,
      status: variant.status === "completed" ? "completed" : "failed",
      subject_snapshot: buildSubjectSnapshot(assetRequest),
      provider: buildProviderInfo(jobResult),
      generation: buildGenerationInfoFromFile(
        jobResult,
        file,
        variant.provider_request_id,
        variant.submitted_at,
        variant.completed_at
      ),
      files: buildFilesFromSingleFile(file),
      review: buildReview(),
      metadata: pickDefined({
        priority: assetRequest.priority,
        variants_requested: assetRequest.variants_requested,
        variant_index: variant.variant_index,
        candidate_role: "selection_candidate"
      })
    };
  });
}

function buildAssetRecord(assetRequest, jobResult) {
  return {
    asset_id: buildAssetId(assetRequest.asset_request_id),
    asset_request_id: assetRequest.asset_request_id,
    asset_role: assetRequest.asset_role,
    status: jobResult.status === "completed" ? "completed" : "failed",
    subject_snapshot: buildSubjectSnapshot(assetRequest),
    provider: buildProviderInfo(jobResult),
    generation: buildGenerationInfo(jobResult),
    files: buildFiles(jobResult),
    review: buildReview(),
    metadata: pickDefined({
      priority: assetRequest.priority,
      variants_requested: assetRequest.variants_requested
    })
  };
}

function buildAssetManifest(imageRequest, providerJobResult) {
  assertObject(imageRequest, "imageRequest");
  assertObject(providerJobResult, "providerJobResult");

  const assetRequestMap = mapByAssetRequestId(imageRequest.asset_requests, "imageRequest.asset_requests");
  const jobResultMap = mapByAssetRequestId(providerJobResult.job_results, "providerJobResult.job_results");

  const assets = [];

  for (const [assetRequestId, assetRequest] of assetRequestMap.entries()) {
    const jobResult = jobResultMap.get(assetRequestId);

    if (!jobResult) {
      throw new Error(`Missing provider job result for asset_request_id "${assetRequestId}".`);
    }

    if (toArray(jobResult.variants).length > 0) {
      assets.push(...buildVariantAssetRecords(assetRequest, jobResult));
      continue;
    }

    assets.push(buildAssetRecord(assetRequest, jobResult));
  }

  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    manifest_id: `manifest_${imageRequest.request_id}`,
    request_id: imageRequest.request_id,
    source_document: pickDefined({
      document_type: imageRequest.source_document && imageRequest.source_document.document_type,
      document_id: imageRequest.source_document && imageRequest.source_document.document_id,
      document_version: imageRequest.source_document && imageRequest.source_document.document_version,
      source_ref: imageRequest.source_document && imageRequest.source_document.source_ref
    }),
    created_at: "2026-01-01T00:00:10.000Z",
    updated_at: "2026-01-01T00:00:10.000Z",
    assets,
    metadata: pickDefined({
      manifest_builder_version: "phase1-manifest-writer-stub",
      provider_id: providerJobResult.provider_id,
      model_id: providerJobResult.model_id
    })
  };
}

function main() {
  const [, , imageRequestArg, providerResultArg, outputArg] = process.argv;

  if (!imageRequestArg || !providerResultArg || !outputArg) {
    console.error(
      "Usage: node build_asset_manifest.js <input-image-request.json> <input-provider-job-result.json> <output-asset-manifest.json>"
    );
    process.exit(1);
  }

  const imageRequestPath = path.resolve(imageRequestArg);
  const providerResultPath = path.resolve(providerResultArg);
  const outputPath = path.resolve(outputArg);

  const imageRequest = JSON.parse(fs.readFileSync(imageRequestPath, "utf8"));
  const providerJobResult = JSON.parse(fs.readFileSync(providerResultPath, "utf8"));
  const manifest = buildAssetManifest(imageRequest, providerJobResult);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

module.exports = {
  buildAssetManifest
};

if (require.main === module) {
  main();
}
