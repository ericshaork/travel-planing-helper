const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  ProviderInterface,
  validateNormalizedPromptSpec,
  validateProviderJobResult
} = require("./provider_interface");

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createMockTimestamp(offsetMs = 0) {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
  return new Date(base + offsetMs).toISOString();
}

class MockImageProvider extends ProviderInterface {
  constructor(config = {}) {
    super(config.provider_id || "mock", config.model_id || "mock-image-model-v1");
    this.label = config.label || "Mock Provider";
  }

  generate(normalizedPromptSpec) {
    validateNormalizedPromptSpec(normalizedPromptSpec);

    const promptSpecs = toArray(normalizedPromptSpec.prompt_specs);
    const result = {
      request_id: normalizedPromptSpec.request_id,
      provider_id: this.providerId,
      model_id: this.modelId,
      job_results: promptSpecs.map((promptSpec, index) => this.buildJobResult(promptSpec, index)),
      metadata: {
        provider_kind: "mock",
        provider_label: this.label,
        result_version: "phase1-provider-stub-v1"
      }
    };

    validateProviderJobResult(result);
    return result;
  }

  buildJobResult(promptSpec, index) {
    const hashSeed = `${promptSpec.asset_request_id}:${promptSpec.asset_role}:${index}`;
    const shortHash = crypto.createHash("md5").update(hashSeed).digest("hex").slice(0, 10);
    const submittedAt = createMockTimestamp(index * 1000);
    const completedAt = createMockTimestamp(index * 1000 + 250);

    return {
      provider_job_id: `mockjob_${shortHash}`,
      asset_request_id: promptSpec.asset_request_id,
      provider_id: this.providerId,
      model_id: this.modelId,
      status: "completed",
      submitted_at: submittedAt,
      completed_at: completedAt,
      files: [
        {
          file_id: `mockfile_${shortHash}`,
          file_kind: "generated_image",
          storage_ref: `mock://generated/${promptSpec.asset_request_id}.png`,
          mime_type: "image/png",
          width: promptSpec.output_spec && promptSpec.output_spec.min_width,
          height: promptSpec.output_spec && promptSpec.output_spec.min_height
        }
      ],
      parameters: {
        asset_role: promptSpec.asset_role,
        style_profile_id: promptSpec.style_profile && promptSpec.style_profile.style_profile_id,
        aspect_ratio: promptSpec.output_spec && promptSpec.output_spec.aspect_ratio,
        orientation: promptSpec.output_spec && promptSpec.output_spec.orientation,
        quality_requirements: promptSpec.constraints && promptSpec.constraints.quality_requirements
      }
    };
  }
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node mock_provider.js <input-normalized-prompt-spec.json> <output-provider-job-result.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  const raw = fs.readFileSync(inputPath, "utf8");
  const normalizedPromptSpec = JSON.parse(raw);
  const provider = new MockImageProvider();
  const result = provider.generate(normalizedPromptSpec);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

module.exports = {
  MockImageProvider
};

if (require.main === module) {
  main();
}
