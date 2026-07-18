const fs = require("fs");
const path = require("path");
const {
  ProviderInterface,
  validateNormalizedPromptSpec,
  validateProviderJobResult
} = require("./provider_interface");
const { loadEnv, validateEnvForProvider } = require("../config/load_env");

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatVariantFileId(assetRequestId, variantIndex) {
  return `${assetRequestId}_generated_${variantIndex}`;
}

function formatPromptJobId(providerId, assetRequestId) {
  return `${providerId}_${assetRequestId}`;
}

function sanitizeFilename(value, fallback = "asset") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function inferMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "application/octet-stream";
}

function toDataUrl(mimeType, base64Value) {
  return `data:${mimeType};base64,${base64Value}`;
}

function buildSubjectLabel(promptSpec) {
  const subject = promptSpec.subject || {};
  const location = subject.location_context || {};

  return sanitizeFilename(
    location.city ||
    location.name ||
    subject.title ||
    promptSpec.asset_request_id,
    "cover"
  );
}

function pickSceneForVariant(promptSpec, variantIndex) {
  const scene = promptSpec.scene;

  if (!scene || typeof scene !== "object") {
    return undefined;
  }

  const variantSceneMap = toArray(scene.variant_scene_map);

  return variantSceneMap.find((item) => item.variant_index === variantIndex) || undefined;
}

class SeedreamImageProvider extends ProviderInterface {
  constructor(config = {}, options = {}) {
    super(config.provider_id || "seedream", config.model_id || "");
    this.label = config.label || "Seedream / Ark";
    this.config = config;
    this.env = options.envConfig || loadEnv(options);
    this.projectRoot = options.projectRoot || path.resolve(__dirname, "..", "..");
    this.outputDir = options.outputDir || path.join(this.projectRoot, "output", "runs", "seedream", "generated");
  }

  buildCoverPrompt(promptSpec, normalizedPromptSpec, variantIndex) {
    const subject = promptSpec.subject || {};
    const destination = normalizedPromptSpec.global_context && normalizedPromptSpec.global_context.destination
      ? normalizedPromptSpec.global_context.destination
      : {};
    const title = subject.title || destination.city || "travel cover";
    const summary = subject.summary || "";
    const city = destination.city || subject.location_context && subject.location_context.city;
    const country = destination.country || subject.location_context && subject.location_context.country;
    const styleProfileId = promptSpec.style_profile && promptSpec.style_profile.style_profile_id;
    const sceneForVariant = pickSceneForVariant(promptSpec, variantIndex);
    const sceneElements = sceneForVariant ? toArray(sceneForVariant.visual_elements) : [];
    const sceneAvoid = sceneForVariant ? toArray(sceneForVariant.avoid) : [];

    return [
      `A personalized travel journal cover illustration for ${title}.`,
      city || country ? `Destination context: ${[city, country].filter(Boolean).join(", ")}.` : undefined,
      summary ? `Scene idea: ${summary}` : undefined,
      sceneForVariant ? `SCENE DIRECTION: ${sceneForVariant.name}.` : undefined,
      sceneForVariant && sceneForVariant.mood ? `Scene mood: ${sceneForVariant.mood}.` : undefined,
      sceneElements.length > 0 ? `Required visual elements: ${sceneElements.join(", ")}.` : undefined,
      sceneAvoid.length > 0 ? `Forbidden visual elements: ${sceneAvoid.join(", ")}.` : undefined,
      styleProfileId ? `Style profile: ${styleProfileId}.` : undefined,
      "Create an original travel illustration with scene-specific storytelling and a unique composition for this destination.",
      "Use a light-toned, low-saturation watercolor palette with muted gray-blue, rice white, and pale soft green.",
      "Emphasize an oriental watercolor travel journal mood with textured watercolor paper, soft ink wash, visible paper grain, and gently blurred edges.",
      "Use a balanced composition with soft layered depth, one clear primary scene, and enough breathing room for an Explore cover card without copying a template layout.",
      "Prefer a quiet poetic atmosphere, private and intimate rather than commercial, with soft calm light, restrained detail, and an original travel story specific to the destination.",
      sceneForVariant
        ? "Let the scene direction control the content, composition, and main subject. Build the image around the chosen scene rather than a generic city postcard."
        : "Only a few delicate accents are allowed, such as a small pavilion, a tiny boat, lotus, or willow branches.",
      promptSpec.style_reference
        ? "Use the provided reference image for visual language only. Learn its watercolor texture, paper feeling, pastel palette, and quiet mood, but do not copy object placement, landmark arrangement, or exact scene structure. Create a new original scene."
        : undefined,
      "Avoid multiple landmarks, avoid dense storytelling, avoid crowded elements, avoid high saturation, avoid strong contrast, avoid sharp digital illustration feeling, avoid game concept art feeling, avoid tourism poster feeling.",
      "No text, no letters, no typography, no watermark, no logo."
    ]
      .filter(Boolean)
      .join(" ");
  }

  resolveStyleReference(promptSpec) {
    const styleReference = promptSpec.style_reference;

    if (!styleReference || typeof styleReference !== "object") {
      return undefined;
    }

    const images = toArray(styleReference.images);

    if (images.length === 0) {
      return undefined;
    }

    const primaryReference = images[0];

    if (!primaryReference || typeof primaryReference !== "object" || !primaryReference.path) {
      return undefined;
    }

    const absolutePath = path.isAbsolute(primaryReference.path)
      ? primaryReference.path
      : path.resolve(this.projectRoot, primaryReference.path);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Style reference image not found: ${absolutePath}`);
    }

    const base64 = fs.readFileSync(absolutePath, "base64");

    return {
      path: absolutePath,
      purpose: primaryReference.purpose,
      mime_type: inferMimeType(absolutePath),
      base64,
      data_url: toDataUrl(inferMimeType(absolutePath), base64)
    };
  }

  buildRequestPayload(promptSpec, normalizedPromptSpec, variantIndex) {
    if (promptSpec.asset_role !== "cover") {
      throw new Error(`Seedream real test currently only supports cover. Received "${promptSpec.asset_role}".`);
    }

    const width = promptSpec.output_spec && promptSpec.output_spec.min_width
      ? promptSpec.output_spec.min_width
      : 1024;
    const height = promptSpec.output_spec && promptSpec.output_spec.min_height
      ? promptSpec.output_spec.min_height
      : 1280;

    const styleReference = this.resolveStyleReference(promptSpec);
    const payload = {
      model: this.env.ark.modelId || this.modelId || this.config.model_id || "",
      prompt: this.buildCoverPrompt(promptSpec, normalizedPromptSpec, variantIndex),
      size: `${width}x${height}`,
      response_format: "b64_json",
      watermark: false,
      n: 1
    };

    if (styleReference) {
      payload.image = [styleReference.data_url];
    }

    return payload;
  }

  extractImageDataItems(responseBody) {
    const dataItems = toArray(responseBody && responseBody.data);
    const normalizedItems = dataItems.length > 0
      ? dataItems
      : [responseBody && responseBody.result || responseBody && responseBody.output].filter(Boolean);

    if (normalizedItems.length === 0 || typeof normalizedItems[0] !== "object") {
      throw new Error("Seedream response does not contain a supported image result payload.");
    }

    return normalizedItems.map((item) => ({
      url: item.url || item.image_url,
      base64: item.b64_json || item.base64 || item.image_base64,
      revisedPrompt: item.revised_prompt
    }));
  }

  async persistImage(imageData, filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (imageData.url) {
      const response = await fetch(imageData.url);

      if (!response.ok) {
        throw new Error(`Failed to download generated image from URL. HTTP ${response.status}.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      return;
    }

    if (imageData.base64) {
      fs.writeFileSync(filePath, Buffer.from(imageData.base64, "base64"));
      return;
    }

    throw new Error("Seedream response did not contain url or base64 image data.");
  }

  buildGeneratedFilePath(promptSpec, index) {
    const subjectKey = buildSubjectLabel(promptSpec);
    const assetKey = sanitizeFilename(promptSpec.asset_role, "cover");
    const fileName = `${subjectKey}_${assetKey}_${String(index + 1).padStart(3, "0")}.png`;
    return path.join(this.outputDir, fileName);
  }

  buildFileRecord(promptSpec, variantIndex, filePath) {
    const stats = fs.statSync(filePath);
    return {
      file_id: formatVariantFileId(promptSpec.asset_request_id, variantIndex),
      file_kind: "generated_image",
      storage_ref: filePath,
      mime_type: "image/png",
      width: promptSpec.output_spec && promptSpec.output_spec.min_width,
      height: promptSpec.output_spec && promptSpec.output_spec.min_height,
      size_bytes: stats.size
    };
  }

  summarizeBatchStatus(variantResults) {
    const successCount = variantResults.filter((item) => item.status === "completed").length;

    if (successCount === 0) {
      return "failed";
    }

    if (successCount === variantResults.length) {
      return "completed";
    }

    return "completed";
  }

  buildVariantResult({
    promptSpec,
    variantIndex,
    sceneForVariant,
    requestPayload,
    submittedAt,
    completedAt,
    responseBody,
    fileRecord,
    errorMessage
  }) {
    const providerRequestId = String(
      responseBody && responseBody.id ||
      responseBody && responseBody.request_id ||
      `${this.providerId}_${promptSpec.asset_request_id}_${variantIndex}`
    );
    const baseRecord = {
      variant_index: variantIndex,
      provider_request_id: providerRequestId,
      submitted_at: submittedAt,
      completed_at: completedAt,
      status: errorMessage ? "failed" : "completed"
    };

    if (errorMessage) {
      return {
        ...baseRecord,
        error: {
          code: "seedream_request_failed",
          message: errorMessage,
          retryable: false
        }
      };
    }

    return {
      ...baseRecord,
      file: fileRecord,
      parameters: {
        response_format: requestPayload.response_format,
        scene_id: sceneForVariant && sceneForVariant.scene_id
      }
    };
  }

  transformResponse(promptSpec, requestPayload, variantResults, submittedAt, completedAt) {
    const successfulFiles = variantResults
      .filter((item) => item.status === "completed" && item.file)
      .map((item) => item.file);
    const revisedPrompts = variantResults
      .map((item) => item.revised_prompt)
      .filter(Boolean);

    return {
      provider_job_id: formatPromptJobId(this.providerId, promptSpec.asset_request_id),
      asset_request_id: promptSpec.asset_request_id,
      provider_id: this.providerId,
      model_id: requestPayload.model,
      status: this.summarizeBatchStatus(variantResults),
      submitted_at: submittedAt,
      completed_at: completedAt,
      files: successfulFiles,
      variants: variantResults.map((item) => ({
        variant_index: item.variant_index,
        provider_request_id: item.provider_request_id,
        submitted_at: item.submitted_at,
        completed_at: item.completed_at,
        status: item.status,
        file: item.file,
        error: item.error
      })),
      parameters: {
        asset_role: promptSpec.asset_role,
        style_profile_id: promptSpec.style_profile && promptSpec.style_profile.style_profile_id,
        aspect_ratio: promptSpec.output_spec && promptSpec.output_spec.aspect_ratio,
        orientation: promptSpec.output_spec && promptSpec.output_spec.orientation,
        prompt: requestPayload.prompt,
        response_format: requestPayload.response_format,
        style_reference_paths: toArray(promptSpec.style_reference && promptSpec.style_reference.images)
          .map((image) => image.path)
          .filter(Boolean),
        scene_selection_mode: promptSpec.scene && promptSpec.scene.selection_mode,
        scene_variant_map: toArray(promptSpec.scene && promptSpec.scene.variant_scene_map),
        requested_variants: promptSpec.output_spec && promptSpec.output_spec.variant_count
          ? promptSpec.output_spec.variant_count
          : 1,
        revised_prompts: revisedPrompts
      }
    };
  }

  buildFailedJobResult(promptSpec, requestPayload, submittedAt, completedAt, errorMessage) {
    return {
      provider_job_id: `${formatPromptJobId(this.providerId, promptSpec.asset_request_id)}_failed`,
      asset_request_id: promptSpec.asset_request_id,
      provider_id: this.providerId,
      model_id: requestPayload.model,
      status: "failed",
      submitted_at: submittedAt,
      completed_at: completedAt,
      files: [],
      parameters: {
        asset_role: promptSpec.asset_role,
        style_profile_id: promptSpec.style_profile && promptSpec.style_profile.style_profile_id,
        aspect_ratio: promptSpec.output_spec && promptSpec.output_spec.aspect_ratio,
        orientation: promptSpec.output_spec && promptSpec.output_spec.orientation,
        prompt: requestPayload.prompt,
        style_reference_paths: toArray(promptSpec.style_reference && promptSpec.style_reference.images)
          .map((image) => image.path)
          .filter(Boolean)
      },
      error: {
        code: "seedream_request_failed",
        message: errorMessage,
        retryable: false
      }
    };
  }

  async generatePromptSpec(promptSpec, normalizedPromptSpec, endpoint) {
    const variantCount = promptSpec.output_spec && promptSpec.output_spec.variant_count
      ? promptSpec.output_spec.variant_count
      : 1;

    try {
      const batchSubmittedAt = new Date().toISOString();
      const variantResults = [];
      let firstRequestPayload;

      for (let index = 0; index < variantCount; index += 1) {
        const variantIndex = index + 1;
        const variantSubmittedAt = new Date().toISOString();
        const sceneForVariant = pickSceneForVariant(promptSpec, variantIndex);
        const requestPayload = this.buildRequestPayload(promptSpec, normalizedPromptSpec, variantIndex);
        firstRequestPayload = firstRequestPayload || requestPayload;

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.env.ark.apiKey}`
            },
            body: JSON.stringify(requestPayload)
          });

          const responseText = await response.text();
          let responseBody;

          try {
            responseBody = responseText ? JSON.parse(responseText) : {};
          } catch (error) {
            throw new Error(
              `Seedream response was not valid JSON. HTTP ${response.status}. Body: ${responseText.slice(0, 300)}`
            );
          }

          if (!response.ok) {
            throw new Error(
              `Seedream API request failed. HTTP ${response.status}. Response: ${JSON.stringify(responseBody).slice(0, 500)}`
            );
          }

          const imageDataItems = this.extractImageDataItems(responseBody);
          const imageData = imageDataItems[0];

          if (!imageData) {
            throw new Error("Seedream response did not return an image for this variant.");
          }

          const filePath = this.buildGeneratedFilePath(promptSpec, index);
          await this.persistImage(imageData, filePath);
          const fileRecord = this.buildFileRecord(promptSpec, variantIndex, filePath);

          variantResults.push({
            ...this.buildVariantResult({
              promptSpec,
              variantIndex,
              sceneForVariant,
              requestPayload,
              submittedAt: variantSubmittedAt,
              completedAt: new Date().toISOString(),
              responseBody,
              fileRecord
            }),
            revised_prompt: imageData.revisedPrompt
          });
        } catch (error) {
          variantResults.push(
            this.buildVariantResult({
              promptSpec,
              variantIndex,
              sceneForVariant,
              requestPayload,
              submittedAt: variantSubmittedAt,
              completedAt: new Date().toISOString(),
              errorMessage: error.message || String(error)
            })
          );
        }
      }

      return this.transformResponse(
        promptSpec,
        firstRequestPayload,
        variantResults,
        batchSubmittedAt,
        new Date().toISOString()
      );
    } catch (error) {
      const fallbackPayload = this.buildRequestPayload(promptSpec, normalizedPromptSpec, 1);
      return this.buildFailedJobResult(
        promptSpec,
        fallbackPayload,
        new Date().toISOString(),
        new Date().toISOString(),
        error.message || String(error)
      );
    }
  }

  async generate(normalizedPromptSpec) {
    validateNormalizedPromptSpec(normalizedPromptSpec);
    validateEnvForProvider(this.providerId, this.env);
    const promptSpecs = toArray(normalizedPromptSpec.prompt_specs);

    if (promptSpecs.length === 0) {
      throw new Error("Seedream real test expects at least one prompt spec.");
    }

    const endpoint = `${this.env.ark.baseUrl}${this.env.ark.imageEndpoint}`;
    const jobResults = [];

    for (const promptSpec of promptSpecs) {
      jobResults.push(await this.generatePromptSpec(promptSpec, normalizedPromptSpec, endpoint));
    }

    const result = {
      request_id: normalizedPromptSpec.request_id,
      provider_id: this.providerId,
      model_id: this.env.ark.modelId || this.modelId || this.config.model_id || "",
      job_results: jobResults,
      metadata: {
        provider_kind: "seedream",
        provider_label: this.label,
        mode: "real_test",
        base_url: this.env.ark.baseUrl,
        endpoint: this.env.ark.imageEndpoint,
        output_dir: this.outputDir,
        prompt_spec_count: promptSpecs.length
      }
    };

    validateProviderJobResult(result);
    return result;
  }
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node seedream_provider.js <input-normalized-prompt-spec.json> <output-provider-job-result.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  const raw = fs.readFileSync(inputPath, "utf8");
  const normalizedPromptSpec = JSON.parse(raw);
  const provider = new SeedreamImageProvider();
  const result = provider.generate(normalizedPromptSpec);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

module.exports = {
  SeedreamImageProvider
};

if (require.main === module) {
  main();
}
