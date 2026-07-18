function toStringValue(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function titleCaseFromSlug(value) {
  return toStringValue(value)
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferCanonicalTerms(task) {
  const assetId = toStringValue(task.asset_id).toLowerCase();
  const mapping = {
    forbidden_city: ["Forbidden City Beijing", "故宫 北京"],
    white_pagoda_temple: ["White Pagoda Temple Beijing", "白塔寺 北京"],
    art_zone_798: ["798 Art Zone Beijing", "798艺术区 北京"],
    art_zone798: ["798 Art Zone Beijing", "798艺术区 北京"],
    pagoda_temple: ["White Pagoda Temple Beijing", "白塔寺 北京"]
  };

  return mapping[assetId] || [];
}

function extractPromptTerms(task) {
  const prompt = toStringValue(task.prompt).trim();

  if (!prompt) {
    return [];
  }

  return [prompt];
}

function buildPhotoQueries(task) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error("task must be an object.");
  }

  const queries = [];
  const seen = new Set();
  const canonicalTerms = inferCanonicalTerms(task);
  const promptTerms = extractPromptTerms(task);
  const fallbackTitle = titleCaseFromSlug(task.asset_id || "photo");

  for (const query of [...canonicalTerms, ...promptTerms, fallbackTitle]) {
    const normalized = toStringValue(query).trim();

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    queries.push(normalized);
  }

  return queries;
}

module.exports = {
  buildPhotoQueries
};
