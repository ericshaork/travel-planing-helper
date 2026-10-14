const fs = require("node:fs/promises");
const path = require("node:path");
const {
  isValidAuditManifest,
  readAuditManifest,
} = require("./trace-audit");

const excludedFileName = "images.zip";

async function findNamedFiles(directory) {
  const matches = [];
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return matches;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.name.toLowerCase() === excludedFileName) {
      matches.push({ path: entryPath, isFile: entry.isFile() });
    } else if (entry.isDirectory()) {
      matches.push(...(await findNamedFiles(entryPath)));
    }
  }

  return matches;
}

module.exports = {
  onPostBuild: async ({ constants, utils }) => {
    console.log("[asset-audit:postbuild] onPostBuild started after preceding plugins.");
    const failures = [];
    const publishDir = constants.PUBLISH_DIR;
    const functionsDist = constants.FUNCTIONS_DIST;

    if (!publishDir || !functionsDist) {
      utils.build.failBuild(
        "Netlify did not provide both PUBLISH_DIR and FUNCTIONS_DIST; cannot verify asset exclusion.",
      );
      return;
    }

    const absolutePublishDir = path.resolve(process.cwd(), publishDir);
    const absoluteFunctionsDist = path.resolve(process.cwd(), functionsDist);
    const publishedCopies = await findNamedFiles(absolutePublishDir);
    console.log(
      `[asset-audit] PUBLISH_DIR=${publishDir}; ${excludedFileName} before exclusion=${publishedCopies.length}.`,
    );

    for (const copy of publishedCopies) {
      if (!copy.isFile) {
        failures.push(`Expected a regular ${excludedFileName} file in the publish directory: ${copy.path}`);
        continue;
      }

      await fs.unlink(copy.path);
    }

    const functionCopies = await findNamedFiles(absoluteFunctionsDist);
    console.log(
      `[asset-audit] FUNCTIONS_DIST=${functionsDist}; ${excludedFileName} found=${functionCopies.length}.`,
    );
    if (functionCopies.length) {
      failures.push(
        `${excludedFileName} unexpectedly appears in the Netlify Functions output; refusing to deploy it.`,
      );
    }

    let traceAudit;
    try {
      traceAudit = await readAuditManifest();
    } catch (error) {
      failures.push(`Pre-package trace audit manifest is invalid: ${error.message}`);
    }

    if (!traceAudit) {
      failures.push("Pre-package trace audit manifest is missing; refusing to pass the asset audit.");
      console.log("[asset-audit] traceAuditStatus=unavailable; manifest=missing.");
    } else if (!isValidAuditManifest(traceAudit)) {
      failures.push("Pre-package trace audit manifest has an invalid shape; refusing to pass the asset audit.");
      console.log("[asset-audit] traceAuditStatus=unavailable; manifest=invalid.");
    } else {
      console.log(
        `[asset-audit] traceAuditStatus=${traceAudit.status}; prepackTraceFiles=${traceAudit.traceCount}; images.zip references=${traceAudit.referenceCount}.`,
      );
      if (traceAudit.status !== "available" || traceAudit.traceCount === 0) {
        failures.push(
          `traceAuditStatus=unavailable: pre-package trace files were not found; refusing to pass the asset audit.`,
        );
      } else if (traceAudit.referenceCount > 0) {
        failures.push(
          `${excludedFileName} appears in ${traceAudit.referenceCount} pre-package Next.js function trace reference(s).`,
        );
      }
    }

    const remaining = await findNamedFiles(absolutePublishDir);
    console.log(
      `[asset-audit] Final check: PUBLISH_DIR ${remaining.length}; FUNCTIONS_DIST ${functionCopies.length}; source file unchanged.`,
    );
    if (remaining.length) {
      failures.push(`${excludedFileName} remains in the Netlify publish directory after exclusion.`);
    }

    if (failures.length) {
      utils.build.failBuild(failures.join(" "));
      return;
    }
  },
};
