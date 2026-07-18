const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const parsed = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    parsed[key] = value;
  }

  return parsed;
}

function applyEnvDefaults(parsedEnv) {
  for (const [key, value] of Object.entries(parsedEnv)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readEnvFile(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  const envLocalPath = path.join(projectRoot, ".env.local");

  const envValues = {
    ...parseEnvFile(envPath),
    ...parseEnvFile(envLocalPath)
  };

  applyEnvDefaults(envValues);
}

function loadEnv(options = {}) {
  const projectRoot = options.projectRoot || path.resolve(__dirname, "..", "..");

  readEnvFile(projectRoot);

  const config = {
    defaultProvider: process.env.DEFAULT_PROVIDER || "mock",
    pexels: {
      apiKey: process.env.PEXELS_API_KEY || ""
    },
    ark: {
      apiKey: process.env.ARK_API_KEY || "",
      baseUrl: process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com",
      imageEndpoint: process.env.ARK_IMAGE_ENDPOINT || "/api/v3/images/generations",
      modelId: process.env.ARK_MODEL_ID || ""
    }
  };

  return config;
}

function validateEnvForProvider(providerId, envConfig) {
  if (providerId !== "seedream" && providerId !== "ark_seedream") {
    return;
  }

  const missing = [];

  if (!envConfig.ark.apiKey) {
    missing.push("ARK_API_KEY");
  }

  if (!envConfig.ark.baseUrl) {
    missing.push("ARK_BASE_URL");
  }

  if (!envConfig.ark.imageEndpoint) {
    missing.push("ARK_IMAGE_ENDPOINT");
  }

  if (!envConfig.ark.modelId) {
    missing.push("ARK_MODEL_ID");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for ${providerId}: ${missing.join(", ")}`);
  }
}

module.exports = {
  loadEnv,
  validateEnvForProvider
};
