import path from "node:path";

import { writeJsonFile } from "./format.js";
import { buildGenerationContext } from "./context/buildGenerationContext.ts";

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const outputPath = path.resolve(
    projectRoot,
    "output",
    "context_tests",
    "beijing_couple_first_visit_autumn_context.json",
  );

  const context = await buildGenerationContext({ projectRoot });
  await writeJsonFile(outputPath, context);

  console.log(`GenerationContext test output saved:
- output: ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`GenerationContext test failed: ${message}`);
  process.exitCode = 1;
});
