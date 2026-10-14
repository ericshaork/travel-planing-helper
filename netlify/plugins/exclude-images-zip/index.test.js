const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const test = require("node:test");
const postBuildPlugin = require("./index");
const { captureTraceAudit } = require("./capture-traces");
const { getManifestPath, isExcludedAsset, readAuditManifest } = require("./trace-audit");

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "exclude-images-zip-test-"));
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

test("pre-package audit records and rejects images.zip before packaging", async () => {
  const root = await makeTempDir();
  try {
    await writeTrace(path.join(root, ".next", "server"), ["../../public/images.zip"]);
    await assert.rejects(invokePrepack(root), /excluded asset reference/);
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
    await assert.rejects(invokePrepack(root), /excluded asset reference/);
    const failures = await invokePostBuild({ root, publishDir, functionsDist });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /appear in 1 pre-package Next.js function trace reference/);
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
    assert.match(failures[0], /unexpectedly appear in the Netlify Functions output/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("pre-package audit rejects loose assets and preserves runtime JSON references", async () => {
  const root = await makeTempDir();
  try {
    await writeTrace(path.join(root, ".next", "server"), [
      "../../public/images/landing/cover.png",
      "../../image-pipeline/image-pipeline/assets/explore/cover.webp",
      "../../trip_packages/beijing/images/photos/cover.jpg",
      "../cache/webpack/cache.pack",
      "../../trip_packages/beijing/content/explore_plan.json",
      "../../trip_packages/beijing/images/image_assets/cover.image_asset.json",
      "../../data/explore/normalized/explore_archives_v1.json",
      "../../node_modules/next/dist/server/next-server.js",
    ]);
    await assert.rejects(invokePrepack(root), /Found 4 excluded asset reference/);
    assert.equal((await readAuditManifest(root)).referenceCount, 4);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("asset detection supports Windows separators and uppercase extensions", () => {
  assert.equal(isExcludedAsset("C:\\repo\\public\\images\\cover.PNG"), true);
  assert.equal(isExcludedAsset("C:\\repo\\trip_packages\\beijing\\images\\cover.JPG"), true);
  assert.equal(isExcludedAsset("C:\\repo\\data\\explore\\images.json"), false);
});

test("pre-package audit rejects malformed trace files lists", async () => {
  const root = await makeTempDir();
  try {
    const tracePath = await writeTrace(path.join(root, ".next", "server"));
    await fs.writeFile(tracePath, JSON.stringify({ files: [null] }));
    await assert.rejects(invokePrepack(root), /invalid files list/);
    assert.equal(await readAuditManifest(root), null);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

for (const output of ["functions-output", ".netlify/functions-internal"]) {
  test(`postBuild blocks loose assets in ${output} without deleting source or public images`, async () => {
    const root = await makeTempDir();
    try {
      const { publishDir, functionsDist } = await makeBuildDirectories(root);
      await writeTrace(path.join(root, ".next", "server"));
      await invokePrepack(root);
      const assetPath = path.join(root, output, "___netlify-server-handler", "public", "images", "cover.png");
      const sourcePath = path.join(root, "public", "images", "cover.png");
      const publishedPath = path.join(publishDir, "images", "cover.png");
      for (const fixturePath of [assetPath, sourcePath, publishedPath]) {
        await fs.mkdir(path.dirname(fixturePath), { recursive: true });
        await fs.writeFile(fixturePath, "image fixture");
      }
      const failures = await invokePostBuild({ root, publishDir, functionsDist });
      assert.equal(failures.length, 1);
      assert.match(failures[0], /Excluded assets unexpectedly appear/);
      assert.equal(await fs.readFile(sourcePath, "utf8"), "image fixture");
      assert.equal(await fs.readFile(publishedPath, "utf8"), "image fixture");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
}
