import "dotenv/config";

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { writeJsonFile } from "./format.js";
import { generatePlanFromRequest } from "./generateRequest.js";
import { createLlmProvider } from "./providers/llm.js";
import { GenerateRequestSchema } from "./schema.js";

import type { LlmProvider } from "./types.js";

const BatchPlanSchema = GenerateRequestSchema.extend({
  id: z.string().min(1),
});

const BatchConfigSchema = z.object({
  plans: z.array(BatchPlanSchema).min(1),
});

type BatchPlan = z.infer<typeof BatchPlanSchema>;

interface BatchError {
  id: string;
  message: string;
}

interface BatchResult {
  id: string;
  status: "success" | "failed";
  output_path?: string;
  error?: string;
}

async function loadBatchConfig(filePath: string) {
  const rawInput = await readFile(filePath, "utf8");
  return BatchConfigSchema.parse(JSON.parse(rawInput));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildOutputPath(projectRoot: string, planId: string): string {
  return path.resolve(projectRoot, "output", "explore_plans", `${planId}.json`);
}

async function runBatchPlan(options: {
  projectRoot: string;
  provider: LlmProvider;
  plan: BatchPlan;
}): Promise<BatchResult> {
  const outputPath = buildOutputPath(options.projectRoot, options.plan.id);

  if (await fileExists(outputPath)) {
    return {
      id: options.plan.id,
      status: "failed",
      error: `Output file already exists: ${outputPath}`,
    };
  }

  const generatedPlan = await generatePlanFromRequest({
    projectRoot: options.projectRoot,
    request: {
      city: options.plan.city,
      days: options.plan.days,
      trip_type: options.plan.trip_type,
      budget: options.plan.budget,
      theme: options.plan.theme,
      preferences: options.plan.preferences,
      pace: options.plan.pace,
    },
    provider: options.provider,
  });

  await writeJsonFile(outputPath, generatedPlan);

  return {
    id: options.plan.id,
    status: "success",
    output_path: outputPath,
  };
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const inputArg = process.argv[2] ?? "input/batch_config.json";
  const configPath = path.resolve(projectRoot, inputArg);
  const reportPath = path.resolve(projectRoot, "output", "batch_report.json");
  const batchConfig = await loadBatchConfig(configPath);
  const provider = createLlmProvider();

  const errors: BatchError[] = [];
  const results: BatchResult[] = [];

  for (const plan of batchConfig.plans) {
    try {
      const result = await runBatchPlan({
        projectRoot,
        provider,
        plan,
      });

      results.push(result);

      if (result.status === "failed" && result.error) {
        errors.push({
          id: plan.id,
          message: result.error,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: plan.id,
        status: "failed",
        error: message,
      });
      errors.push({
        id: plan.id,
        message,
      });
    }
  }

  const success = results.filter((result) => result.status === "success").length;
  const failed = results.length - success;

  await writeJsonFile(reportPath, {
    total: batchConfig.plans.length,
    success,
    failed,
    provider: provider.name,
    config_path: configPath,
    results,
    errors,
  });

  console.log(`Batch generation completed:
- total: ${batchConfig.plans.length}
- success: ${success}
- failed: ${failed}
- config: ${configPath}
- report: ${reportPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Batch generation failed: ${message}`);
  process.exitCode = 1;
});
