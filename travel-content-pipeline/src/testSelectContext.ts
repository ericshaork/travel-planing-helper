import path from "node:path";

import { writeJsonFile } from "./format.js";
import { buildGenerationContext } from "./context/buildGenerationContext.ts";

import type { RequestContext } from "./context/types.js";

interface TestCase {
  fileName: string;
  request: Partial<RequestContext>;
}

const testCases: TestCase[] = [
  {
    fileName: "beijing_couple_first_visit_autumn_context.json",
    request: {
      city: "beijing",
      traveler_type: "couple",
      days: 3,
      season: "autumn",
      budget: "medium",
      pace: "balanced",
      motivation: "首次到访",
      theme: "首次北京印象 / 情侣氛围路线",
    },
  },
  {
    fileName: "beijing_student_food_winter_context.json",
    request: {
      city: "beijing",
      traveler_type: "student",
      days: 3,
      season: "winter",
      budget: "low",
      pace: "balanced",
      motivation: "美食探索",
      theme: "北京冬季美食 / 学生高性价比路线",
    },
  },
  {
    fileName: "beijing_solo_revisit_spring_context.json",
    request: {
      city: "beijing",
      traveler_type: "solo",
      days: 3,
      season: "spring",
      budget: "medium",
      pace: "slow",
      motivation: "深度探索",
      theme: "北京街区纹理 / 一个人的慢行路线",
    },
  },
];

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const outputs: string[] = [];

  for (const testCase of testCases) {
    const outputPath = path.resolve(projectRoot, "output", "context_tests", testCase.fileName);
    const context = await buildGenerationContext({
      projectRoot,
      request: testCase.request,
    });

    await writeJsonFile(outputPath, context);
    outputs.push(outputPath);

    console.log(`Context Selector case:
- output: ${outputPath}
- traveler_type: ${context.request_context.traveler_type}
- motivation: ${context.request_context.motivation}
- theme: ${context.request_context.theme}
- districts: ${context.content_context.relevant_districts.map((item) => item.name).join(" | ")}
- pois: ${context.content_context.relevant_pois.map((item) => item.name).join(" | ")}
- food: ${context.content_context.relevant_food_knowledge.map((item) => item.name).join(" | ")}`);
  }

  console.log(`Context Selector outputs:
- ${outputs.join("\n- ")}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Context Selector test failed: ${message}`);
  process.exitCode = 1;
});
