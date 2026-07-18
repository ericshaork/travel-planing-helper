const fs = require("fs");
const path = require("path");
const { MockImageProvider } = require("./mock_provider");
const { SeedreamImageProvider } = require("./seedream_provider");
const { loadEnv } = require("../config/load_env");

function loadProviderConfig(configPath) {
  const resolvedPath = configPath || path.resolve(__dirname, "..", "..", "config", "provider.config.json");
  const config = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const envConfig = loadEnv({
    projectRoot: path.resolve(__dirname, "..", "..")
  });

  return {
    ...config,
    default_provider: envConfig.defaultProvider || config.default_provider
  };
}

function resolveProviderId(providerId, config) {
  return providerId || config.default_provider;
}

function createProvider(providerId, options = {}) {
  const config = options.config || loadProviderConfig(options.configPath);
  const envConfig = options.envConfig || loadEnv({
    projectRoot: path.resolve(__dirname, "..", "..")
  });
  const resolvedProviderId = resolveProviderId(providerId, config);
  const providerEntry = config.providers && config.providers[resolvedProviderId];

  if (!providerEntry) {
    throw new Error(`Provider "${resolvedProviderId}" is not defined in provider.config.json.`);
  }

  if (!providerEntry.enabled) {
    throw new Error(`Provider "${resolvedProviderId}" is disabled in provider.config.json.`);
  }

  if (resolvedProviderId === "mock") {
    return new MockImageProvider(providerEntry);
  }

  if (resolvedProviderId === "seedream" || resolvedProviderId === "ark_seedream") {
    return new SeedreamImageProvider(providerEntry, {
      envConfig,
      projectRoot: path.resolve(__dirname, "..", ".."),
      outputDir: options.outputDir
    });
  }

  throw new Error(`Unsupported provider "${resolvedProviderId}". No adapter is implemented yet.`);
}

module.exports = {
  createProvider,
  loadProviderConfig
};
