const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.REVIEW_PORT ? Number(process.env.REVIEW_PORT) : 4318;
const ROOT_DIR = path.resolve(__dirname, "..");
const TOOL_DIR = __dirname;
const PLANS_DIR = path.join(ROOT_DIR, "output", "explore_plans_production");
const MAPS_DIR = path.join(ROOT_DIR, "input", "maps_v1");
const REVIEW_DIR = path.join(ROOT_DIR, "output", "review");
const PENDING_DIR = path.join(REVIEW_DIR, "pending");
const REVIEWED_DIR = path.join(REVIEW_DIR, "reviewed");
const REVIEW_FILE = path.join(REVIEW_DIR, "content_reviews.json");

const ISSUE_OPTIONS = [
  "城市特色不足",
  "太像普通攻略",
  "文案模板化",
  "路线不合理",
  "人群匹配不足",
  "POI 选择一般",
  "美食推荐不足",
  "其他",
];

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(message);
}

function readJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const sanitized = raw.replace(/^\uFEFF/, "");
  if (!sanitized.trim()) {
    return fallbackValue;
  }

  return JSON.parse(sanitized);
}

function ensureReviewStructure() {
  for (const directory of [REVIEW_DIR, PENDING_DIR, REVIEWED_DIR]) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  if (!fs.existsSync(REVIEW_FILE)) {
    fs.writeFileSync(REVIEW_FILE, "[]\n", "utf8");
  }
}

function explicitValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate != null && candidate !== "") {
      return candidate;
    }
  }
  return null;
}

function normalizePlan(raw, filename) {
  const cityName = raw.city && typeof raw.city === "object" ? raw.city.name || raw.city.code || "" : raw.city || "";
  const theme = explicitValue(raw.theme, raw.request?.theme) || "";

  return {
    id: String(raw.id || path.basename(filename, ".json")),
    slug: String(raw.slug || ""),
    title: String(raw.title || path.basename(filename, ".json")),
    summary: String(raw.summary || ""),
    city: {
      code: String(raw.city?.code || ""),
      name: String(cityName || ""),
      region_name: String(raw.city?.region_name || ""),
    },
    trip_type: String(explicitValue(raw.trip_type, raw.request?.trip_type, raw.request?.traveler_type) || ""),
    days: Number(raw.days || 0),
    theme: String(theme),
    season: String(explicitValue(raw.season, raw.request?.season, raw.metadata?.season) || ""),
    pace: String(explicitValue(raw.pace, raw.request?.pace) || ""),
    quality: String(explicitValue(raw.quality, raw.validation?.quality, raw.metadata?.quality) || ""),
    budget:
      raw.budget && typeof raw.budget === "object"
        ? {
            level: String(raw.budget.level || ""),
            note: String(raw.budget.note || ""),
          }
        : null,
    tags: Array.isArray(raw.tags) ? raw.tags.map((item) => String(item)) : [],
    image_prompt: String(raw.image_prompt || ""),
    daily_itinerary: Array.isArray(raw.daily_itinerary) ? raw.daily_itinerary : [],
    pois: Array.isArray(raw.pois) ? raw.pois : [],
    food: Array.isArray(raw.food) ? raw.food : [],
    source_file: filename,
  };
}

function getPlanFiles() {
  if (!fs.existsSync(PLANS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PLANS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function getReviewEntries() {
  ensureReviewStructure();
  const data = readJsonFile(REVIEW_FILE, []);
  return Array.isArray(data) ? data : [];
}

function getReviewMap() {
  return new Map(getReviewEntries().map((entry) => [entry.id, entry]));
}

function formatPlanListItem(plan, review) {
  return {
    id: plan.id,
    title: plan.title,
    city: plan.city,
    trip_type: plan.trip_type || "-",
    days: plan.days || "-",
    theme: plan.theme || "-",
    season: plan.season || "",
    source_file: plan.source_file,
    reviewed: Boolean(review),
    score: review?.score ?? null,
    review_time: review?.review_time ?? null,
  };
}

function readPlanFile(filename) {
  const filePath = path.join(PLANS_DIR, filename);
  const raw = readJsonFile(filePath, {});
  return normalizePlan(raw, filename);
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function syncPlanReviewCopy(filename, reviewed) {
  const sourcePath = path.join(PLANS_DIR, filename);
  const pendingPath = path.join(PENDING_DIR, filename);
  const reviewedPath = path.join(REVIEWED_DIR, filename);
  const targetPath = reviewed ? reviewedPath : pendingPath;
  const stalePath = reviewed ? pendingPath : reviewedPath;

  fs.copyFileSync(sourcePath, targetPath);
  removeFileIfExists(stalePath);
}

function cleanupReviewDirectory(directoryPath, expectedFiles) {
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) {
      continue;
    }

    if (!expectedFiles.has(entry.name)) {
      removeFileIfExists(path.join(directoryPath, entry.name));
    }
  }
}

function getPlansSnapshot() {
  ensureReviewStructure();
  const reviews = getReviewMap();
  const plans = [];
  const errors = [];
  const expectedPendingFiles = new Set();
  const expectedReviewedFiles = new Set();

  for (const filename of getPlanFiles()) {
    try {
      const plan = readPlanFile(filename);
      const review = reviews.get(plan.id) || null;
      const isReviewed = Boolean(review);

      syncPlanReviewCopy(filename, isReviewed);
      if (isReviewed) {
        expectedReviewedFiles.add(filename);
      } else {
        expectedPendingFiles.add(filename);
      }

      if (plan.id) {
        plans.push(formatPlanListItem(plan, review));
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const entry = { filename, error: detail };
      errors.push(entry);
      removeFileIfExists(path.join(PENDING_DIR, filename));
      removeFileIfExists(path.join(REVIEWED_DIR, filename));
      console.error(`[review-tool] Failed to read plan file: ${filename}`);
      console.error(detail);
    }
  }

  cleanupReviewDirectory(PENDING_DIR, expectedPendingFiles);
  cleanupReviewDirectory(REVIEWED_DIR, expectedReviewedFiles);

  return {
    plans,
    errors,
    counts: {
      total: plans.length,
      pending: plans.filter((plan) => !plan.reviewed).length,
      reviewed: plans.filter((plan) => plan.reviewed).length,
    },
  };
}

function getPlanById(planId) {
  const reviewMap = getReviewMap();

  for (const filename of getPlanFiles()) {
    let plan;
    try {
      plan = readPlanFile(filename);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`[review-tool] Failed to read plan file during detail lookup: ${filename}`);
      console.error(detail);
      continue;
    }

    if (plan.id === planId) {
      const review = reviewMap.get(plan.id) || null;
      return { ...plan, review };
    }
  }

  return null;
}

function normalizePoiAsset(raw) {
  return {
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    city: String(raw.city || ""),
    address: String(raw.address || ""),
    asset_type: String(raw.asset_type || ""),
    source_provider: String(raw.source_provider || ""),
    confidence: String(raw.confidence || ""),
  };
}

function normalizeRouteFact(raw) {
  return {
    id: String(raw.id || ""),
    from: String(raw.from || ""),
    to: String(raw.to || ""),
    mode: String(raw.mode || ""),
    distance_m: Number(raw.distance_m || 0),
    duration_min: Number(raw.duration_min || 0),
    source_provider: String(raw.source_provider || ""),
    confidence: String(raw.confidence || ""),
  };
}

function getMapAssets(cityCode) {
  const normalizedCityCode = String(cityCode || "").trim().toLowerCase();
  if (!normalizedCityCode) {
    return {
      city_code: "",
      poi_assets: [],
      route_facts: [],
    };
  }

  const cityDir = path.join(MAPS_DIR, normalizedCityCode);
  const poiFile = path.join(cityDir, "poi_assets.json");
  const routeFile = path.join(cityDir, "route_facts.json");

  return {
    city_code: normalizedCityCode,
    poi_assets: readJsonFile(poiFile, []).map(normalizePoiAsset),
    route_facts: readJsonFile(routeFile, []).map(normalizeRouteFact),
  };
}

function validateReviewPayload(body) {
  if (!body || typeof body !== "object") {
    return "请求体必须是 JSON 对象";
  }

  if (!body.id || typeof body.id !== "string") {
    return "id 必填";
  }

  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) {
    return "score 必须是 1-5 的整数";
  }

  if (!Array.isArray(body.issues) || body.issues.some((issue) => !ISSUE_OPTIONS.includes(issue))) {
    return "issues 必须是有效的问题标签数组";
  }

  if (body.comment != null && typeof body.comment !== "string") {
    return "comment 必须是字符串";
  }

  return null;
}

function saveReview(body) {
  ensureReviewStructure();
  const existing = getReviewEntries();
  const nextEntry = {
    id: body.id,
    score: body.score,
    issues: body.issues,
    comment: (body.comment || "").trim(),
    review_time: new Date().toISOString(),
  };

  const index = existing.findIndex((entry) => entry.id === body.id);
  if (index >= 0) {
    existing[index] = nextEntry;
  } else {
    existing.push(nextEntry);
  }

  fs.writeFileSync(REVIEW_FILE, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
  return nextEntry;
}

function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.normalize(path.join(TOOL_DIR, requested));

  if (!resolved.startsWith(TOOL_DIR)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    sendText(response, 404, "Not Found");
    return;
  }

  const extension = path.extname(resolved);
  const contentType = STATIC_TYPES[extension] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(resolved).pipe(response);
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("无效的 JSON"));
      }
    });

    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `localhost:${PORT}`}`);
    const pathname = decodeURIComponent(url.pathname);

    if (request.method === "GET" && pathname === "/api/meta") {
      sendJson(response, 200, {
        issues: ISSUE_OPTIONS,
        plans_dir: path.relative(ROOT_DIR, PLANS_DIR).replaceAll("\\", "/"),
        review_file: path.relative(ROOT_DIR, REVIEW_FILE).replaceAll("\\", "/"),
        pending_dir: path.relative(ROOT_DIR, PENDING_DIR).replaceAll("\\", "/"),
        reviewed_dir: path.relative(ROOT_DIR, REVIEWED_DIR).replaceAll("\\", "/"),
      });
      return;
    }

    if (request.method === "GET" && pathname === "/api/plans") {
      sendJson(response, 200, getPlansSnapshot());
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/api/plans/")) {
      const planId = pathname.slice("/api/plans/".length);
      const plan = getPlanById(planId);

      if (!plan) {
        sendJson(response, 404, { error: "未找到对应计划" });
        return;
      }

      sendJson(response, 200, plan);
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/api/map-assets/")) {
      const cityCode = pathname.slice("/api/map-assets/".length);
      sendJson(response, 200, getMapAssets(cityCode));
      return;
    }

    if (request.method === "POST" && pathname === "/api/reviews") {
      const body = await parseRequestBody(request);
      const validationError = validateReviewPayload(body);

      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const plan = getPlanById(body.id);
      if (!plan) {
        sendJson(response, 404, { error: "对应计划不存在，无法保存审核" });
        return;
      }

      const saved = saveReview(body);
      syncPlanReviewCopy(plan.source_file, true);
      sendJson(response, 200, { ok: true, review: saved });
      return;
    }

    serveStatic(response, pathname);
  } catch (error) {
    sendJson(response, 500, {
      error: "服务内部错误",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, () => {
  ensureReviewStructure();
  const snapshot = getPlansSnapshot();
  console.log(`Review tool running at http://localhost:${PORT}`);
  console.log(`Plans: ${PLANS_DIR}`);
  console.log(`Reviews: ${REVIEW_FILE}`);
  console.log(`Pending copies: ${PENDING_DIR}`);
  console.log(`Reviewed copies: ${REVIEWED_DIR}`);
  console.log(`Loaded plans: ${snapshot.counts.total}, pending: ${snapshot.counts.pending}, reviewed: ${snapshot.counts.reviewed}`);
});
