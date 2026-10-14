const path = require("node:path");
const {
  auditTraceFiles,
  clearAuditManifest,
  writeAuditManifest,
} = require("./trace-audit");

async function captureTraceAudit(root = process.cwd()) {
  const traceRoot = path.join(root, ".next");
  await clearAuditManifest(root);
  const summary = await auditTraceFiles([traceRoot]);
  await writeAuditManifest(summary, root);
  console.log(
    `[asset-audit:prepack] build command completed before Netlify plugins; root=${traceRoot}; status=${summary.status}; traceFiles=${summary.traceCount}; excluded asset references=${summary.referenceCount}.`,
  );
  if (summary.referenceCount > 0) {
    throw new Error(
      `Found ${summary.referenceCount} excluded asset reference(s) in Next.js traces. Check outputFileTracingExcludes before packaging Netlify Functions.`,
    );
  }
  return summary;
}

if (require.main === module) {
  captureTraceAudit().catch((error) => {
    console.error(`[asset-audit:prepack] Trace audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { captureTraceAudit };
