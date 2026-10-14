import {
  envFileDisplayName,
  getBucketAcl,
  getObjectAcl,
  headOssObject,
  loadOssConfigFromEnvFile,
  ossBucketName,
  putObjectAcl,
  readPublicOssObject,
  safeConfigSummary,
  storageSmokeObjectKey,
  uploadJsonToOss,
} from "../src/server/storage/ossStorage.ts";

type SmokeUploadSummary = {
  bucket: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  status: number;
  url?: string;
};

type SmokeResult = {
  ok: boolean;
  phase: "G3";
  envFile: string;
  config?: ReturnType<typeof safeConfigSummary>;
  uploads?: {
    raw?: SmokeUploadSummary;
    public?: SmokeUploadSummary;
  };
  uploadErrors?: {
    raw?: string;
    public?: string;
  };
  publicRead?: {
    url: string;
    ok: boolean;
    status: number;
    sizeBytes: number;
    sha256: string;
    errorCode: string | null;
    errorMessage: string | null;
  };
  diagnostics?: {
    bucketAcl?: Awaited<ReturnType<typeof getBucketAcl>>;
    headObject?: Awaited<ReturnType<typeof headOssObject>>;
    objectAclBeforeFix?: Awaited<ReturnType<typeof getObjectAcl>>;
    objectAclFix?: Awaited<ReturnType<typeof putObjectAcl>>;
    objectAclAfterFix?: Awaited<ReturnType<typeof getObjectAcl>>;
    conclusion: string;
  };
  missingEnv?: string[];
  error?: string;
};

function parseEnvPath(argv: string[]): string {
  const inline = argv.find((arg) => arg.startsWith("--env="));
  if (inline) {
    return inline.slice("--env=".length);
  }

  const index = argv.indexOf("--env");
  if (index >= 0 && argv[index + 1]) {
    return argv[index + 1];
  }

  return "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
}

function printResult(result: SmokeResult): void {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function uploadSummary(upload: Awaited<ReturnType<typeof uploadJsonToOss>>, includeUrl: boolean): SmokeUploadSummary {
  return {
    bucket: upload.bucket,
    objectKey: upload.objectKey,
    sizeBytes: upload.sizeBytes,
    sha256: upload.sha256,
    status: upload.status,
    ...(includeUrl ? { url: upload.url } : {}),
  };
}

function errorSummary(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPublicGrant(grant: string | null): boolean {
  return grant === "public-read" || grant === "public-read-write";
}

async function main(): Promise<void> {
  const envPath = parseEnvPath(process.argv.slice(2));
  const { config, missingKeys } = loadOssConfigFromEnvFile(envPath);

  if (!config) {
    printResult({
      ok: false,
      phase: "G3",
      envFile: envFileDisplayName(envPath),
      missingEnv: missingKeys,
      error: "OSS smoke test skipped because required environment variables are missing.",
    });
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  const rawBucket = ossBucketName(config, "raw");
  const publicBucket = ossBucketName(config, "public");
  const rawObjectKey = storageSmokeObjectKey("raw", now);
  const publicObjectKey = storageSmokeObjectKey("public", now);
  const smokeId = `wanderly-oss-g3-${now.toISOString()}`;

  const rawPayload = {
    smokeId,
    phase: "G3",
    bucketRole: "raw",
    purpose: "private raw-bucket upload smoke test",
    createdAt: now.toISOString(),
  };

  const publicPayload = {
    smokeId,
    phase: "G3",
    bucketRole: "public",
    purpose: "public bucket upload and anonymous-read smoke test",
    createdAt: now.toISOString(),
  };

  let rawUpload: Awaited<ReturnType<typeof uploadJsonToOss>> | null = null;
  let publicUpload: Awaited<ReturnType<typeof uploadJsonToOss>> | null = null;
  const uploadErrors: SmokeResult["uploadErrors"] = {};

  try {
    rawUpload = await uploadJsonToOss(config, {
      bucket: rawBucket,
      objectKey: rawObjectKey,
      value: rawPayload,
    });
  } catch (error) {
    uploadErrors.raw = errorSummary(error);
  }

  try {
    publicUpload = await uploadJsonToOss(config, {
      bucket: publicBucket,
      objectKey: publicObjectKey,
      value: publicPayload,
    });
  } catch (error) {
    uploadErrors.public = errorSummary(error);
  }

  try {
    if (!publicUpload) {
      const ok = false;
      printResult({
        ok,
        phase: "G3",
        envFile: envFileDisplayName(envPath),
        config: safeConfigSummary(config),
        uploads: {
          ...(rawUpload ? { raw: uploadSummary(rawUpload, false) } : {}),
        },
        uploadErrors,
        error: "Public bucket upload failed, so anonymous read verification was skipped.",
      });
      process.exitCode = 1;
      return;
    }

    const bucketAcl = await getBucketAcl(config, publicBucket);
    const headObject = await headOssObject(config, publicBucket, publicObjectKey);
    const objectAclBeforeFix = await getObjectAcl(config, publicBucket, publicObjectKey);
    let objectAclFix: Awaited<ReturnType<typeof putObjectAcl>> | undefined;
    let objectAclAfterFix: Awaited<ReturnType<typeof getObjectAcl>> | undefined;

    if (objectAclBeforeFix.ok && !isPublicGrant(objectAclBeforeFix.grant)) {
      objectAclFix = await putObjectAcl(config, publicBucket, publicObjectKey, "public-read");
      objectAclAfterFix = await getObjectAcl(config, publicBucket, publicObjectKey);
    }

    const effectiveObjectAcl = objectAclAfterFix ?? objectAclBeforeFix;
    const publicRead = await readPublicOssObject(publicUpload.url);
    const ok = Boolean(rawUpload) && publicRead.ok && publicRead.sha256 === publicUpload.sha256;
    const conclusion = buildConclusion({
      publicReadOk: publicRead.ok,
      publicReadStatus: publicRead.status,
      publicReadErrorCode: publicRead.errorCode,
      bucketGrant: bucketAcl.grant,
      objectGrant: effectiveObjectAcl.grant,
      objectAclFixOk: objectAclFix?.ok,
      headObjectOk: headObject.ok,
    });

    printResult({
      ok,
      phase: "G3",
      envFile: envFileDisplayName(envPath),
      config: safeConfigSummary(config),
      uploads: {
        ...(rawUpload ? { raw: uploadSummary(rawUpload, false) } : {}),
        public: uploadSummary(publicUpload, true),
      },
      ...(Object.keys(uploadErrors).length > 0 ? { uploadErrors } : {}),
      publicRead,
      diagnostics: {
        bucketAcl,
        headObject,
        objectAclBeforeFix,
        ...(objectAclFix ? { objectAclFix } : {}),
        ...(objectAclAfterFix ? { objectAclAfterFix } : {}),
        conclusion,
      },
      ...(ok ? {} : { error: "One or more OSS smoke checks failed." }),
    });

    if (!ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    printResult({
      ok: false,
      phase: "G3",
      envFile: envFileDisplayName(envPath),
      config: safeConfigSummary(config),
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  }
}

function buildConclusion(input: {
  publicReadOk: boolean;
  publicReadStatus: number;
  publicReadErrorCode: string | null;
  bucketGrant: string | null;
  objectGrant: string | null;
  objectAclFixOk: boolean | undefined;
  headObjectOk: boolean;
}): string {
  if (input.publicReadOk) {
    return "public-read is effective for the smoke object; endpoint, object key, content-type, and anonymous GET are working.";
  }
  if (!input.headObjectOk) {
    return "signed HEAD failed, so diagnose object existence or signed OSS permissions before public-read policy.";
  }
  if (!isPublicGrant(input.objectGrant)) {
    return "object ACL is not public-read; anonymous GET is expected to fail unless bucket policy grants public access.";
  }
  if (input.objectAclFixOk === false) {
    return "object ACL could not be changed to public-read; check oss:PutObjectAcl permission.";
  }
  if (input.publicReadStatus === 403 && input.publicReadErrorCode === "AccessDenied" && isPublicGrant(input.objectGrant)) {
    return "object ACL is public-read but anonymous GET is still denied; likely bucket-level public-access block, bucket policy, or referer/hotlink protection.";
  }
  return "anonymous GET failed after upload; inspect bucket policy, referer rules, and public endpoint settings.";
}

void main();
