function toStringValue(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeText(value) {
  return toStringValue(value).toLowerCase();
}

function extractLocationKeywords(context) {
  const keywords = [];
  const assetId = normalizeText(context.asset_id).split(/[_-]+/g).filter(Boolean);
  const promptWords = normalizeText(context.prompt).split(/[^a-z0-9]+/g).filter(Boolean);
  const locationWords = normalizeText(context.location).split(/[^a-z0-9]+/g).filter(Boolean);

  for (const word of [...assetId, ...promptWords, ...locationWords]) {
    if (word.length >= 3 && !keywords.includes(word)) {
      keywords.push(word);
    }
  }

  const canonicalMap = {
    forbidden: ["forbidden city", "palace museum", "beijing"],
    city: ["forbidden city", "palace museum", "beijing"],
    pagoda: ["white pagoda", "baita", "beijing"],
    temple: ["white pagoda", "baita", "beijing"],
    798: ["798", "art zone", "beijing"],
    art: ["798", "art district", "beijing"]
  };

  for (const word of assetId) {
    for (const extra of canonicalMap[word] || []) {
      if (!keywords.includes(extra)) {
        keywords.push(extra);
      }
    }
  }

  return keywords;
}

function scoreCandidate(candidate, context = {}) {
  const title = normalizeText(candidate.title);
  const description = normalizeText(candidate.description);
  const text = `${title} ${description}`;
  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  const license = normalizeText(candidate.license);
  const keywords = extractLocationKeywords(context);
  const reasons = [];
  let score = 0;

  if (keywords.some((keyword) => keyword && text.includes(keyword))) {
    score += 30;
    reasons.push("location_match");
  }

  if (width >= 3000 || height >= 3000) {
    score += 20;
    reasons.push("high_resolution_3000");
  } else if (width >= 2000 || height >= 2000) {
    score += 10;
    reasons.push("good_resolution_2000");
  }

  if (license.includes("cc0")) {
    score += 15;
    reasons.push("license_cc0");
  } else if (license.includes("cc by")) {
    score += 10;
    reasons.push("license_cc_by");
  }

  if (["landscape", "architecture", "street", "travel"].some((keyword) => text.includes(keyword))) {
    score += 10;
    reasons.push("wanderly_fit");
  }

  if (["selfie", "crowd", "night", "poster"].some((keyword) => text.includes(keyword))) {
    score -= 20;
    reasons.push("penalty_low_quality_context");
  }

  return {
    ...candidate,
    score,
    score_reasons: reasons
  };
}

function rankPhotos(candidates, context = {}) {
  if (!Array.isArray(candidates)) {
    throw new Error("candidates must be an array.");
  }

  return candidates
    .map((candidate) => scoreCandidate(candidate, context))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return Number(right.width || 0) - Number(left.width || 0);
    });
}

module.exports = {
  rankPhotos,
  scoreCandidate
};
