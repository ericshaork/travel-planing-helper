const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const { validatePackageReviewRules } = require("./validate_asset_review_rules");

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const rootDir = process.cwd();
  const report = await validatePackageReviewRules({
    rootDir,
    packagePath: path.join("trip_packages", "shanghai_couple_v1"),
  });
  const outputPath = path.resolve(
    rootDir,
    "output",
    "asset_review_rule_runs",
    "shanghai_couple_v1",
    "regression_report.json",
  );

  await writeJson(outputPath, report);

  assert.equal(report.status, "failed");
  assert.ok(
    report.hard_failures.some(
      (failure) =>
        failure.asset_instance_id === "ca_shanghai_city_mood_poi_gallery" &&
        failure.code === "city_mood_as_poi",
    ),
    "Shanghai regression must hard-fail city_mood_as_poi.",
  );
  assert.equal(
    report.hard_failures.some((failure) => failure.code === "food_storefront_only"),
    false,
    "Shanghai package should not invent a food_storefront_only failure from metadata.",
  );

  console.log("Asset review rules regression test passed:");
  console.log(`- package: trip_packages/shanghai_couple_v1`);
  console.log(`- expected_status: failed`);
  console.log(`- hard_failures: ${report.counts.hard_failures}`);
  console.log(`- report: ${path.relative(rootDir, outputPath).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
