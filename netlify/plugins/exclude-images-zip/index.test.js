const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const postBuildPlugin = require("./index");
const { captureTraceAudit } = require("./capture-traces");
const { getManifestPath, readAuditManifest } = require("./trace-audit");

async function makeTempDir() {
  return fs.mkdtemp(path.join(process.cwd(), "temp", "exclude-images-zip-test-"));
}

async function writeTrace(directory, files = []) {
  await fs.mkdir(directory, { recursive: true });
  const tracePath = path.join(directory, "route.js.nft.json");
  await fs.writeFile(tracePath, JSON.stringify({ files }));
  return tracePath;
}

async function invokePrepack(root) {
  const previousCwd = process.cwd();
  process.chdir(root);
  try {
    await captureTraceAudit(root);
  } finally {
    process.chdir(previousCwd);
  }
}

async function invokePostBuild({ root, publishDir, functionsDist }) {
  const failures = [];
  const previousCwd = process.cwd();
  process.chdir(root);
  try {
    await postBuildPlugin.onPostBuild({
      constants: { PUBLISH_DIR: publishDir, FUNCTIONS_DIST: functionsDist },
      utils: { build: { failBuild: (message) => failures.push(message) } },
    });
  } finally {
    process.chdir(previousCwd);
  }
  return failures;
}

async function makeBuildDirectories(root) {
  const publishDir = path.join(root, "publish");
  const functionsDist = path.join(root, "functions-output");
  await fs.mkdir(publishDir, { recursive: true });
  await fs.mkdir(functionsDist, { recursive: true });
  return { publishDir, functionsDist };
}

test("pre-package audit records normal trace files in a summary manifest", async () => {
  const root = await makeTempDir();
  try {
    await writeTrace(path.join(root, ".next", "server"));
    await writeTrace(path.join(root, ".next", "server", "nested"));
    await invokePrepack(root);

    assert.deepEqual(await readAuditManifest(root), {
      version: 1,
      status: "available",
      traceCount: 2,
      referenceCount: 0,
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("pre-package audit records missing traces as unavailable", async () => {
  const root = await makeTempDir();
  try {
    await invokePrepack(root);
    const summary = await readAuditManifest(root);
    assert.equal(summary.status, "unavailable");
    assert.equal(summary.traceCount, 0);
    assert.equal(summary.referenceCount, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("pre-package audit records images.zip trace references", async () => {
  const root = await makeTempDir();
  try {
    await writeTrace(path.join(root, ".next", "server"), ["../../public/images.zip"]);
    await invokePrepack(root);
    const summary = await readAuditManifest(root);
    assert.equal(summary.status, "available");
    assert.equal(summary.traceCount, 1);
    assert.equal(summary.referenceCount, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("postBuild fails when the pre-package audit manifest is missing", async () => {
  const root = await makeTempDir();
  try {
    const { publishDir, functionsDist } = await makeBuildDirectories(root);
    assert.equal(await fs.stat(getManifestPath(root)).catch(() => null), null);
    const failures = await invokePostBuild({ root, publishDir, functionsDist });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /manifest is missing/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("postBuild blocks traces that reference images.zip", async () => {
  const root = await makeTempDir();
  try {
    const { publishDir, functionsDist } = await makeBuildDirectories(root);
    await writeTrace(path.join(root, ".next", "server"), ["../../public/images.zip"]);
    await invokePrepack(root);
    const failures = await invokePostBuild({ root, publishDir, functionsDist });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /appears in 1 pre-package Next.js function trace reference/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("postBuild fails closed when the pre-package trace summary says unavailable", async () => {
  const root = await makeTempDir();
  try {
    const { publishDir, functionsDist } = await makeBuildDirectories(root);
    await invokePrepack(root);
    const failures = await invokePostBuild({ root, publishDir, functionsDist });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /traceAuditStatus=unavailable/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("postBuild removes only the publish copy of images.zip", async () => {
  const root = await makeTempDir();
  try {
    const { publishDir, functionsDist } = await makeBuildDirectories(root);
    await writeTrace(path.join(root, ".next", "server"));
    await invokePrepack(root);
    const publishedZip = path.join(publishDir, "images.zip");
    await fs.writeFile(publishedZip, "publish fixture");

    const failures = await invokePostBuild({ root, publishDir, functionsDist });
    assert.deepEqual(failures, []);
    assert.equal(await fs.stat(publishedZip).catch(() => null), null);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("postBuild blocks images.zip in FUNCTIONS_DIST", async () => {
  const root = await makeTempDir();
  try {
    const { publishDir, functionsDist } = await makeBuildDirectories(root);
    await writeTrace(path.join(root, ".next", "server"));
    await invokePrepack(root);
    await fs.writeFile(path.join(functionsDist, "images.zip"), "function fixture");
    const failures = await invokePostBuild({ root, publishDir, functionsDist });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /unexpectedly appears in the Netlify Functions output/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
