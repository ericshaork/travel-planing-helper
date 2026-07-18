function toStringValue(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stripHtml(value) {
  return toStringValue(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseExtMetadata(extmetadata) {
  const metadata = extmetadata && typeof extmetadata === "object" ? extmetadata : {};

  return {
    author: stripHtml(metadata.Artist && metadata.Artist.value),
    license: stripHtml(metadata.LicenseShortName && metadata.LicenseShortName.value),
    license_url: toStringValue(metadata.LicenseUrl && metadata.LicenseUrl.value),
    usage_terms: stripHtml(metadata.UsageTerms && metadata.UsageTerms.value),
    attribution_required: Boolean(stripHtml(metadata.Attribution && metadata.Attribution.value))
  };
}

module.exports = {
  parseExtMetadata
};
