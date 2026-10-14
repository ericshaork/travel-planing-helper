import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export type OssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  endpoint: string;
  rawBucket: string;
  publicBucket: string;
};

export type OssBucketKind = "raw" | "public";

export type OssUploadInput = {
  bucket: string;
  objectKey: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  objectAcl?: OssObjectAcl;
};

export type OssObjectAcl = "default" | "private" | "public-read" | "public-read-write";

export type OssUploadResult = {
  bucket: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  status: number;
  etag: string | null;
  requestId: string | null;
  url: string;
};

export type OssPublicReadResult = {
  url: string;
  ok: boolean;
  status: number;
  sizeBytes: number;
  sha256: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export type OssHeadObjectResult = {
  bucket: string;
  objectKey: string;
  status: number;
  ok: boolean;
  sizeBytes: number | null;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  requestId: string | null;
};

export type OssAclResult = {
  bucket: string;
  objectKey?: string;
  status: number;
  ok: boolean;
  grant: string | null;
  requestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export const OSS_ENV_KEYS = [
  "ALIYUN_ACCESS_KEY_ID",
  "ALIYUN_ACCESS_KEY_SECRET",
  "ALIYUN_OSS_REGION",
  "ALIYUN_OSS_ENDPOINT",
  "ALIYUN_OSS_RAW_BUCKET",
  "ALIYUN_OSS_PUBLIC_BUCKET",
] as const;

type OssEnvKey = (typeof OSS_ENV_KEYS)[number];

export function parseDotEnvFile(envPath: string): Record<string, string> {
  const absolutePath = resolve(envPath);
  const text = readFileSync(absolutePath, "utf8");
  const values: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

export function readOssConfigFromEnv(env: Record<string, string | undefined>): {
  config: OssConfig | null;
  missingKeys: OssEnvKey[];
} {
  const missingKeys = OSS_ENV_KEYS.filter((key) => !env[key]?.trim());
  if (missingKeys.length > 0) {
    return { config: null, missingKeys };
  }

  return {
    config: {
      accessKeyId: env.ALIYUN_ACCESS_KEY_ID!.trim(),
      accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET!.trim(),
      region: env.ALIYUN_OSS_REGION!.trim(),
      endpoint: env.ALIYUN_OSS_ENDPOINT!.trim(),
      rawBucket: env.ALIYUN_OSS_RAW_BUCKET!.trim(),
      publicBucket: env.ALIYUN_OSS_PUBLIC_BUCKET!.trim(),
    },
    missingKeys: [],
  };
}

export function loadOssConfigFromEnvFile(envPath: string): {
  config: OssConfig | null;
  missingKeys: OssEnvKey[];
} {
  return readOssConfigFromEnv(parseDotEnvFile(envPath));
}

export function sha256Hex(input: Buffer | Uint8Array | string): string {
  const body = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return createHash("sha256").update(body).digest("hex");
}

export function ossBucketName(config: OssConfig, kind: OssBucketKind): string {
  return kind === "raw" ? config.rawBucket : config.publicBucket;
}

export function createOssObjectKey(parts: Array<string | number | Date | undefined | null>): string {
  return parts
    .filter((part): part is string | number | Date => part !== undefined && part !== null)
    .map((part) => {
      if (part instanceof Date) {
        return part.toISOString().slice(0, 10);
      }
      return String(part)
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .replace(/\\/g, "/")
        .replace(/\/{2,}/g, "/");
    })
    .filter(Boolean)
    .join("/");
}

export function ossObjectUrl(config: OssConfig, bucket: string, objectKey: string): string {
  const endpointUrl = normalizeEndpointUrl(config.endpoint);
  endpointUrl.hostname = `${bucket}.${endpointUrl.hostname}`;
  endpointUrl.pathname = encodeObjectKey(objectKey);
  endpointUrl.search = "";
  endpointUrl.hash = "";
  return endpointUrl.toString();
}

export async function uploadTextToOss(
  config: OssConfig,
  input: Omit<OssUploadInput, "body" | "contentType"> & { text: string; contentType?: string },
): Promise<OssUploadResult> {
  return uploadOssObject(config, {
    bucket: input.bucket,
    objectKey: input.objectKey,
    body: input.text,
    contentType: input.contentType ?? "text/plain; charset=utf-8",
  });
}

export async function uploadJsonToOss(
  config: OssConfig,
  input: Omit<OssUploadInput, "body" | "contentType"> & { value: unknown },
): Promise<OssUploadResult> {
  return uploadOssObject(config, {
    bucket: input.bucket,
    objectKey: input.objectKey,
    body: JSON.stringify(input.value, null, 2),
    contentType: "application/json; charset=utf-8",
  });
}

export async function uploadBinaryToOss(
  config: OssConfig,
  input: Omit<OssUploadInput, "body"> & { body: Buffer | Uint8Array },
): Promise<OssUploadResult> {
  return uploadOssObject(config, {
    bucket: input.bucket,
    objectKey: input.objectKey,
    body: input.body,
    contentType: input.contentType ?? "application/octet-stream",
  });
}

export async function uploadOssObject(config: OssConfig, input: OssUploadInput): Promise<OssUploadResult> {
  const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
  const contentType = input.contentType ?? "application/octet-stream";
  const url = ossObjectUrl(config, input.bucket, input.objectKey);
  const requestBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const ossHeaders: Record<string, string> = input.objectAcl ? { "x-oss-object-acl": input.objectAcl } : {};

  const response = await signedOssFetch(config, {
    method: "PUT",
    bucket: input.bucket,
    objectKey: input.objectKey,
    contentType,
    ossHeaders,
    body: requestBody,
    contentLength: body.byteLength,
  });

  if (!response.ok) {
    const errorText = sanitizeSecretText(await response.text(), config);
    throw new Error(`OSS upload failed for ${input.bucket}/${input.objectKey}: ${response.status} ${errorText}`);
  }

  return {
    bucket: input.bucket,
    objectKey: input.objectKey,
    sizeBytes: body.byteLength,
    sha256: sha256Hex(body),
    status: response.status,
    etag: response.headers.get("etag"),
    requestId: response.headers.get("x-oss-request-id"),
    url,
  };
}

export async function headOssObject(config: OssConfig, bucket: string, objectKey: string): Promise<OssHeadObjectResult> {
  const response = await signedOssFetch(config, {
    method: "HEAD",
    bucket,
    objectKey,
  });

  return {
    bucket,
    objectKey,
    status: response.status,
    ok: response.ok,
    sizeBytes: parseContentLength(response.headers.get("content-length")),
    contentType: response.headers.get("content-type"),
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    requestId: response.headers.get("x-oss-request-id"),
  };
}

export async function getBucketAcl(config: OssConfig, bucket: string): Promise<OssAclResult> {
  const response = await signedOssFetch(config, {
    method: "GET",
    bucket,
    subresource: "acl",
  });
  const text = await response.text();
  return parseAclResponse({
    bucket,
    status: response.status,
    ok: response.ok,
    requestId: response.headers.get("x-oss-request-id"),
    text,
  });
}

export async function getObjectAcl(config: OssConfig, bucket: string, objectKey: string): Promise<OssAclResult> {
  const response = await signedOssFetch(config, {
    method: "GET",
    bucket,
    objectKey,
    subresource: "acl",
  });
  const text = await response.text();
  return parseAclResponse({
    bucket,
    objectKey,
    status: response.status,
    ok: response.ok,
    requestId: response.headers.get("x-oss-request-id"),
    text,
  });
}

export async function putObjectAcl(
  config: OssConfig,
  bucket: string,
  objectKey: string,
  objectAcl: Exclude<OssObjectAcl, "default">,
): Promise<OssAclResult> {
  const response = await signedOssFetch(config, {
    method: "PUT",
    bucket,
    objectKey,
    subresource: "acl",
    ossHeaders: { "x-oss-object-acl": objectAcl },
  });
  const text = await response.text();
  return parseAclResponse({
    bucket,
    objectKey,
    status: response.status,
    ok: response.ok,
    requestId: response.headers.get("x-oss-request-id"),
    text,
  });
}

export async function readPublicOssObject(url: string): Promise<OssPublicReadResult> {
  const response = await fetch(url, { method: "GET" });
  const body = Buffer.from(await response.arrayBuffer());
  const text = response.ok ? "" : body.toString("utf8");

  return {
    url,
    ok: response.ok,
    status: response.status,
    sizeBytes: body.byteLength,
    sha256: sha256Hex(body),
    errorCode: response.ok ? null : parseXmlField(text, "Code"),
    errorMessage: response.ok ? null : parseXmlField(text, "Message"),
  };
}

export function storageSmokeObjectKey(kind: OssBucketKind, date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  if (kind === "raw") {
    return createOssObjectKey(["raw/admin/datav", date, "smoke", `oss-storage-smoke-${timestamp}.json`]);
  }
  return createOssObjectKey(["manifests/smoke", date, `oss-storage-smoke-${timestamp}.json`]);
}

export function safeConfigSummary(config: OssConfig): Omit<OssConfig, "accessKeyId" | "accessKeySecret"> {
  return {
    region: config.region,
    endpoint: config.endpoint,
    rawBucket: config.rawBucket,
    publicBucket: config.publicBucket,
  };
}

export function envFileDisplayName(envPath: string): string {
  return basename(resolve(envPath));
}

function normalizeEndpointUrl(endpoint: string): URL {
  const value = endpoint.trim().replace(/\/+$/g, "");
  return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
}

function encodeObjectKey(objectKey: string): string {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

function ossRequestUrl(config: OssConfig, bucket: string, objectKey?: string, subresource?: string): string {
  const endpointUrl = normalizeEndpointUrl(config.endpoint);
  endpointUrl.hostname = `${bucket}.${endpointUrl.hostname}`;
  endpointUrl.pathname = objectKey ? encodeObjectKey(objectKey) : "/";
  endpointUrl.search = subresource ? `?${subresource}` : "";
  endpointUrl.hash = "";
  return endpointUrl.toString();
}

type SignedOssFetchInput = {
  method: string;
  bucket: string;
  objectKey?: string;
  subresource?: "acl";
  contentType?: string;
  ossHeaders?: Record<string, string>;
  body?: BodyInit;
  contentLength?: number;
};

async function signedOssFetch(config: OssConfig, input: SignedOssFetchInput): Promise<Response> {
  const date = new Date().toUTCString();
  const contentType = input.contentType ?? "";
  const canonicalizedResource = canonicalizedOssResource(input.bucket, input.objectKey, input.subresource);
  const normalizedOssHeaders = normalizeOssHeaders(input.ossHeaders ?? {});
  const canonicalizedOssHeaders = Object.entries(normalizedOssHeaders)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
  const stringToSign = [
    input.method.toUpperCase(),
    "",
    contentType,
    date,
    `${canonicalizedOssHeaders}${canonicalizedResource}`,
  ].join("\n");
  const signature = createHmac("sha1", config.accessKeySecret).update(stringToSign).digest("base64");
  const headers: Record<string, string> = {
    Authorization: `OSS ${config.accessKeyId}:${signature}`,
    Date: date,
    ...normalizedOssHeaders,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (input.contentLength !== undefined) {
    headers["Content-Length"] = String(input.contentLength);
  }

  return fetch(ossRequestUrl(config, input.bucket, input.objectKey, input.subresource), {
    method: input.method,
    headers,
    body: input.body,
  });
}

function canonicalizedOssResource(bucket: string, objectKey?: string, subresource?: string): string {
  const path = objectKey ? `/${bucket}/${objectKey}` : `/${bucket}/`;
  return subresource ? `${path}?${subresource}` : path;
}

function normalizeOssHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value.trim();
  }
  return normalized;
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAclResponse(input: {
  bucket: string;
  objectKey?: string;
  status: number;
  ok: boolean;
  requestId: string | null;
  text: string;
}): OssAclResult {
  return {
    bucket: input.bucket,
    ...(input.objectKey ? { objectKey: input.objectKey } : {}),
    status: input.status,
    ok: input.ok,
    grant: input.ok ? parseXmlField(input.text, "Grant") : null,
    requestId: input.requestId,
    errorCode: input.ok ? null : parseXmlField(input.text, "Code"),
    errorMessage: input.ok ? null : parseXmlField(input.text, "Message"),
  };
}

function parseXmlField(text: string, field: string): string | null {
  const match = text.match(new RegExp(`<${field}>([\\s\\S]*?)</${field}>`));
  return match ? match[1].trim() : null;
}

function sanitizeSecretText(text: string, config: OssConfig): string {
  const redacted = text
    .replaceAll(config.accessKeyId, "[redacted-access-key-id]")
    .replaceAll(config.accessKeySecret, "[redacted-access-key-secret]");

  if (!redacted.includes("<Error>")) {
    return redacted;
  }

  const fields = ["Code", "Message", "RequestId", "NoPermissionType", "AuthAction", "EC", "RecommendDoc"];
  const summary = fields
    .map((field) => {
      const match = redacted.match(new RegExp(`<${field}>([\\s\\S]*?)</${field}>`));
      return match ? `${field}=${match[1].trim()}` : null;
    })
    .filter(Boolean);

  return summary.length > 0 ? summary.join(" ") : "OSS returned an error response.";
}
