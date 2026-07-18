function toStringValue(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeText(value) {
  return toStringValue(value).toLowerCase();
}

function validateImageCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("candidate must be an object.");
  }

  const reasons = [];
  const title = normalizeText(candidate.title);
  const description = normalizeText(candidate.description);
  const mimeType = normalizeText(candidate.mime_type);
  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  const text = `${title} ${description}`;
  const rejectKeywords = ["map", "logo", "icon", "diagram", "flag", "chart"];
  const rejectFormats = ["image/svg+xml", "image/gif"];

  if (width < 1200) {
    reasons.push("width_below_minimum");
  }

  if (height < 800) {
    reasons.push("height_below_minimum");
  }

  if (rejectFormats.includes(mimeType)) {
    reasons.push("unsupported_format");
  }

  if (mimeType && !["image/jpeg", "image/jpg", "image/png"].includes(mimeType) && !rejectFormats.includes(mimeType)) {
    reasons.push("non_preferred_format");
  }

  for (const keyword of rejectKeywords) {
    if (text.includes(keyword)) {
      reasons.push(`rejected_keyword:${keyword}`);
      break;
    }
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}

module.exports = {
  validateImageCandidate
};
