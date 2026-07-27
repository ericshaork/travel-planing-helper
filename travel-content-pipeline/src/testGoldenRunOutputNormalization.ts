import { access } from "node:fs/promises";
import path from "node:path";

const goldenRunIds = [
  "beijing_couple_v1",
  "beijing_student_v1",
  "beijing_solo_v1",
];

const requiredFiles = [
  "explore_plan.json",
  "image_manifest.json",
  "generation_report.json",
];

async function assertFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Missing golden run output file: ${filePath}`);
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();

  for (const goldenRunId of goldenRunIds) {
    const runDir = path.resolve(projectRoot, "output", "golden_runs", goldenRunId);

    for (const requiredFile of requiredFiles) {
      await assertFileExists(path.resolve(runDir, requiredFile));
    }
  }

  console.log("Golden run output normalization check passed:");
  for (const goldenRunId of goldenRunIds) {
    console.log(`- output/golden_runs/${goldenRunId}: ${requiredFiles.join(", ")}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Golden run output normalization check failed: ${message}`);
  process.exitCode = 1;
});
