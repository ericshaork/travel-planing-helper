const fs = require("node:fs/promises");
const path = require("node:path");

const excludedFileName = "images.zip";
const manifestRelativePath = path.join(".netlify", "asset-audit", "trace-audit.json");
const manifestVersion = 1;

async function findTraceFiles(roots) {
  const pending = [...new Set(roots.map((root) => path.resolve(root)))];
  const traceFiles = [];

  while (pending.length) {
    const directory = pending.pop();
    let entries;

    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".nft.json")) {
        traceFiles.push(entryPath);
      }
    }
  }

  return traceFiles;
}

async function auditTraceFiles(roots) {
  const traceFiles = await findTraceFiles(roots);
  let referenceCount = 0;

  for (const traceFile of traceFiles) {
    const trace = JSON.parse(await fs.readFile(traceFile, "utf8"));
    if (!Array.isArray(trace.files)) continue;

    referenceCount += trace.files.filter(
      (file) => path.basename(file).toLowerCase() === excludedFileName,
    ).length;
  }

  return {
    status: traceFiles.length ? "available" : "unavailable",
    traceCount: traceFiles.length,
    referenceCount,
  };
}

function getManifestPath(root = process.cwd()) {
  return path.join(root, manifestRelativePath);
}

async function clearAuditManifest(root = process.cwd()) {
  await fs.rm(getManifestPath(root), { force: true });
}

async function writeAuditManifest(summary, root = process.cwd()) {
  const manifestPath = getManifestPath(root);
  const temporaryPath = `${manifestPath}.tmp`;
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(
    temporaryPath,
    JSON.stringify({ version: manifestVersion, ...summary }),
    "utf8",
  );
  await fs.rename(temporaryPath, manifestPath);
}

async function readAuditManifest(root = process.cwd()) {
  try {
    return JSON.parse(await fs.readFile(getManifestPath(root), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function isValidAuditManifest(summary) {
  return (
    summary &&
    summary.version === manifestVersion &&
    (summary.status === "available" || summary.status === "unavailable") &&
    Number.isInteger(summary.traceCount) &&
    summary.traceCount >= 0 &&
    Number.isInteger(summary.referenceCount) &&
    summary.referenceCount >= 0
  );
}

module.exports = {
  auditTraceFiles,
  clearAuditManifest,
  getManifestPath,
  isValidAuditManifest,
  readAuditManifest,
  writeAuditManifest,
};
