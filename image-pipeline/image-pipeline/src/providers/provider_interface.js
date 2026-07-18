function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateNormalizedPromptSpec(normalizedPromptSpec) {
  assertObject(normalizedPromptSpec, "normalizedPromptSpec");

  if (!normalizedPromptSpec.request_id || typeof normalizedPromptSpec.request_id !== "string") {
    throw new Error("normalizedPromptSpec.request_id must be a string.");
  }

  const promptSpecs = toArray(normalizedPromptSpec.prompt_specs);

  if (promptSpecs.length === 0) {
    throw new Error("normalizedPromptSpec.prompt_specs must contain at least one item.");
  }

  for (const promptSpec of promptSpecs) {
    assertObject(promptSpec, "promptSpec");

    if (!promptSpec.asset_request_id || typeof promptSpec.asset_request_id !== "string") {
      throw new Error("Each promptSpec.asset_request_id must be a string.");
    }

    if (!promptSpec.asset_role || typeof promptSpec.asset_role !== "string") {
      throw new Error("Each promptSpec.asset_role must be a string.");
    }
  }
}

function validateProviderJobResult(providerJobResult) {
  assertObject(providerJobResult, "providerJobResult");

  if (!providerJobResult.request_id || typeof providerJobResult.request_id !== "string") {
    throw new Error("providerJobResult.request_id must be a string.");
  }

  if (!providerJobResult.provider_id || typeof providerJobResult.provider_id !== "string") {
    throw new Error("providerJobResult.provider_id must be a string.");
  }

  const jobResults = toArray(providerJobResult.job_results);

  if (jobResults.length === 0) {
    throw new Error("providerJobResult.job_results must contain at least one item.");
  }

  for (const jobResult of jobResults) {
    assertObject(jobResult, "jobResult");

    if (!jobResult.provider_job_id || typeof jobResult.provider_job_id !== "string") {
      throw new Error("Each jobResult.provider_job_id must be a string.");
    }

    if (!jobResult.asset_request_id || typeof jobResult.asset_request_id !== "string") {
      throw new Error("Each jobResult.asset_request_id must be a string.");
    }
  }
}

class ProviderInterface {
  constructor(providerId, modelId) {
    if (new.target === ProviderInterface) {
      throw new Error("ProviderInterface is abstract and cannot be instantiated directly.");
    }

    this.providerId = providerId;
    this.modelId = modelId;
  }

  generate(normalizedPromptSpec) {
    validateNormalizedPromptSpec(normalizedPromptSpec);
    throw new Error("ProviderInterface.generate must be implemented by subclasses.");
  }
}

module.exports = {
  ProviderInterface,
  validateNormalizedPromptSpec,
  validateProviderJobResult
};
