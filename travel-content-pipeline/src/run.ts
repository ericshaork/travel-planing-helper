import "dotenv/config";

import path from "node:path";

import { writeJsonFile } from "./format.js";
import { generatePlanFromRequest, loadRequestFile } from "./generateRequest.js";
import { createLlmProvider } from "./providers/llm.js";

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const inputArg = process.argv[2] ?? "input/request.json";
  const inputPath = path.resolve(projectRoot, inputArg);
  const outputPath = path.resolve(projectRoot, "output", "plan.json");

  const request = await loadRequestFile(inputPath);
  const provider = createLlmProvider();
  const plan = await generatePlanFromRequest({
    projectRoot,
    request,
    provider,
  });

  await writeJsonFile(outputPath, plan);

  console.log(`Explore plan generated successfully:
- provider: ${provider.name}
- input: ${inputPath}
- output: ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Generation failed: ${message}`);
  process.exitCode = 1;
});
