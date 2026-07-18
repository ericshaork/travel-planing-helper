const fs = require("fs");
const path = require("path");

function writeImageAsset(filePath, imageAsset) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("filePath must be a string.");
  }

  if (!imageAsset || typeof imageAsset !== "object" || Array.isArray(imageAsset)) {
    throw new Error("imageAsset must be an object.");
  }

  const resolvedPath = path.resolve(filePath);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, `${JSON.stringify(imageAsset, null, 2)}\n`, "utf8");

  return resolvedPath;
}

module.exports = {
  writeImageAsset
};
