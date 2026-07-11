import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type ImportStage = "read" | "parse" | "import";
type ExploreTripContentStatus =
  | "draft"
  | "reviewing"
  | "published"
  | "archived";

interface ImportFailure {
  file: string;
  stage: ImportStage;
  message: string;
}

interface CliOptions {
  dir: string;
  batchId: string;
  status: ExploreTripContentStatus;
  dryRun: boolean;
  publishedAt?: string;
  reportPath?: string;
}

const VALID_STATUSES = new Set<ExploreTripContentStatus>([
  "draft",
  "reviewing",
  "published",
  "archived",
]);

function getDefaultDirectory() {
  return path.resolve(
    process.cwd(),
    "..",
    "travel-content-pipeline",
    "output",
    "explore_plans_production",
  );
}

async function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const raw = await readFile(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dir: getDefaultDirectory(),
    batchId: `explore-import-${new Date().toISOString().slice(0, 10)}`,
    status: "reviewing",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--dir" && next) {
      options.dir = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    if (arg === "--batch-id" && next) {
      options.batchId = next;
      index += 1;
      continue;
    }

    if (arg === "--status" && next) {
      if (!VALID_STATUSES.has(next as ExploreTripContentStatus)) {
        throw new Error(
          `Invalid --status value: ${next}. Expected one of ${[
            ...VALID_STATUSES,
          ].join(", ")}.`,
        );
      }

      options.status = next as ExploreTripContentStatus;
      index += 1;
      continue;
    }

    if (arg === "--published-at" && next) {
      options.publishedAt = next;
      index += 1;
      continue;
    }

    if (arg === "--report" && next) {
      options.reportPath = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown import error";
}

async function loadJsonFile(fullPath: string) {
  const rawText = await readFile(fullPath, "utf8");
  return JSON.parse(rawText) as Record<string, unknown>;
}

async function main() {
  await loadLocalEnvFile();
  const options = parseArgs(process.argv.slice(2));
  const { buildExploreTripImport } = await import("../lib/explore/importer.ts");
  const { buildExploreTripInsertRow } = await import("../lib/explore/rows.ts");
  const repository = options.dryRun
    ? null
    : (() => {
        return {
          async upsertImportedContent(
            input: ReturnType<typeof buildExploreTripImport>,
          ) {
            const { assertSupabaseServiceRoleEnv } = await import(
              "../lib/supabase/env.ts"
            );
            const { url, serviceRoleKey } = assertSupabaseServiceRoleEnv(
              process.env,
            );
            const client = createClient(url, serviceRoleKey, {
              auth: {
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
              },
            });
            const row = buildExploreTripInsertRow(input);
            const result = await client
              .from("explore_trip_contents")
              .upsert(row, {
                onConflict: "external_id",
              })
              .select("id")
              .single();

            if (result.error || !result.data?.id) {
              throw new Error(
                JSON.stringify(
                  {
                    code: result.error?.code ?? "",
                    message: result.error?.message ?? "unknown error",
                    details: result.error?.details ?? null,
                    hint: result.error?.hint ?? null,
                  },
                  null,
                  2,
                ),
              );
            }

            return {
              id: result.data.id,
            };
          },
        };
      })();
  const failures: ImportFailure[] = [];
  const importedIds: string[] = [];
  const entries = await readdir(options.dir, {
    withFileTypes: true,
  });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  for (const fileName of jsonFiles) {
    const fullPath = path.join(options.dir, fileName);

    try {
      const raw = await loadJsonFile(fullPath);
      const normalized = buildExploreTripImport(raw, {
        batchId: options.batchId,
        status: options.status,
        publishedAt: options.publishedAt,
        sourceFilePath: fullPath,
      });

      if (repository) {
        const saved = await repository.upsertImportedContent(normalized);
        importedIds.push(saved.id);
      } else {
        importedIds.push(normalized.externalId);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push({
        file: fileName,
        stage:
          message.includes("JSON")
            ? "parse"
            : message.includes("ENOENT")
              ? "read"
              : "import",
        message,
      });
    }
  }

  const summary = {
    directory: options.dir,
    batchId: options.batchId,
    dryRun: options.dryRun,
    status: options.status,
    total: jsonFiles.length,
    success: importedIds.length,
    failed: failures.length,
    failedFiles: failures.map((item) => item.file),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failures.length > 0) {
    console.log(JSON.stringify({ failures }, null, 2));
  }

  if (options.reportPath) {
    await writeFile(
      options.reportPath,
      JSON.stringify(
        {
          ...summary,
          failures,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

await main();
