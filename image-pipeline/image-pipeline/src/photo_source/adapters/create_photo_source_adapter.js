const { searchWikimediaPhotos } = require("../../adapters/wikimedia_photo_adapter");
const { downloadImage } = require("../../download/image_downloader");
const { validateImageCandidate } = require("../../validation/image_validator");
const { rankPhotos } = require("../../ranking/photo_ranker");
const { createPexelsAdapter } = require("./pexels_adapter");

function buildRankingContext(task) {
  return {
    asset_id: task.asset_id,
    prompt: task.prompt,
    location: task.metadata && task.metadata.location,
    asset_role: task.image_slot
  };
}

function createCommonMethods(sourceId) {
  return {
    validate(candidate) {
      return validateImageCandidate(candidate);
    },
    rank(candidates, task) {
      return rankPhotos(candidates, buildRankingContext(task));
    },
    async download(candidate, task) {
      if (task.metadata && task.metadata.mock_download_file_path) {
        return task.metadata.mock_download_file_path;
      }

      return downloadImage(candidate, {
        outputDir: task.metadata && task.metadata.download_output_dir,
        ...(task.metadata && task.metadata.download_request_options
          ? task.metadata.download_request_options
          : {})
      });
    },
    buildFailure(error) {
      return {
        source: sourceId,
        candidates: [],
        error: error && error.message ? error.message : String(error)
      };
    }
  };
}

function createWikimediaAdapter() {
  const common = createCommonMethods("wikimedia");

  return {
    source: "wikimedia",
    async search(task, context = {}) {
      if (task.metadata && Array.isArray(task.metadata.photo_candidates)) {
        return {
          source: "wikimedia",
          candidates: task.metadata.photo_candidates,
          error: null
        };
      }

      if (task.metadata && task.metadata.mock_source_failure === "wikimedia") {
        return {
          source: "wikimedia",
          candidates: [],
          error: "mocked_wikimedia_failure"
        };
      }

      if (
        task.metadata
        && typeof task.metadata.mock_source_failure === "string"
        && task.metadata.mock_source_failure
        && task.metadata.mock_source_failure !== "wikimedia"
      ) {
        return {
          source: "wikimedia",
          candidates: [],
          error: task.metadata.mock_source_failure
        };
      }

      const queries = Array.isArray(context.queries) ? context.queries : [];
      const results = [];

      for (const query of queries) {
        const items = await searchWikimediaPhotos(query);

        if (items.length > 0) {
          results.push(...items);
          break;
        }
      }

      return {
        source: "wikimedia",
        candidates: results,
        error: null
      };
    },
    validate: common.validate,
    rank: common.rank,
    download: common.download
  };
}

function createMockGalleryAdapter() {
  const common = createCommonMethods("mock_gallery");

  return {
    source: "mock_gallery",
    async search(task) {
      const sources = task.metadata && task.metadata.mock_photo_sources
        ? task.metadata.mock_photo_sources
        : {};
      const sourceConfig = sources.mock_gallery || {};

      if (sourceConfig.error) {
        return {
          source: "mock_gallery",
          candidates: [],
          error: sourceConfig.error
        };
      }

      return {
        source: "mock_gallery",
        candidates: Array.isArray(sourceConfig.candidates) ? sourceConfig.candidates : [],
        error: null
      };
    },
    validate: common.validate,
    rank: common.rank,
    async download(candidate, task) {
      const sourceConfig = task.metadata
        && task.metadata.mock_photo_sources
        && task.metadata.mock_photo_sources.mock_gallery
        ? task.metadata.mock_photo_sources.mock_gallery
        : {};

      if (sourceConfig.download_file_path) {
        return sourceConfig.download_file_path;
      }

      return common.download(candidate, task);
    }
  };
}

function createPhotoSourceAdapter(sourceId) {
  const factories = {
    wikimedia: createWikimediaAdapter,
    pexels: createPexelsAdapter,
    mock_gallery: createMockGalleryAdapter
  };

  const factory = factories[sourceId];

  if (!factory) {
    throw new Error(`Unsupported photo source adapter "${sourceId}".`);
  }

  return factory();
}

module.exports = {
  createPhotoSourceAdapter
};
