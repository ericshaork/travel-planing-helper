const state = {
  plans: [],
  filteredPlans: [],
  currentPlanId: null,
  currentPlan: null,
  currentSource: "library",
  importedPlan: null,
  importedFileName: "",
  planErrors: [],
  counts: {
    total: 0,
    pending: 0,
    reviewed: 0,
  },
  filters: {
    search: "",
    city: "",
    tripType: "",
    reviewStatus: "pending",
  },
  issues: [],
  selectedScore: 0,
  mapAssetsCache: new Map(),
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  cityFilter: document.getElementById("cityFilter"),
  tripTypeFilter: document.getElementById("tripTypeFilter"),
  reviewStatusFilter: document.getElementById("reviewStatusFilter"),
  resultCount: document.getElementById("resultCount"),
  statusCount: document.getElementById("statusCount"),
  planList: document.getElementById("planList"),
  emptyState: document.getElementById("emptyState"),
  detailView: document.getElementById("detailView"),
  planSourceBadge: document.getElementById("planSourceBadge"),
  planTitle: document.getElementById("planTitle"),
  planSummary: document.getElementById("planSummary"),
  metaGrid: document.getElementById("metaGrid"),
  tagList: document.getElementById("tagList"),
  itineraryList: document.getElementById("itineraryList"),
  poiList: document.getElementById("poiList"),
  foodList: document.getElementById("foodList"),
  reviewInfo: document.getElementById("reviewInfo"),
  mapFactsList: document.getElementById("mapFactsList"),
  reviewForm: document.getElementById("reviewForm"),
  manualReviewCard: document.getElementById("manualReviewCard"),
  importReviewNote: document.getElementById("importReviewNote"),
  starRating: document.getElementById("starRating"),
  issueOptions: document.getElementById("issueOptions"),
  commentInput: document.getElementById("commentInput"),
  saveButton: document.getElementById("saveButton"),
  saveMessage: document.getElementById("saveMessage"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  importMeta: document.getElementById("importMeta"),
  clearImportButton: document.getElementById("clearImportButton"),
};

function safeText(value, fallback = "N/A") {
  if (value == null || value === "") {
    return fallback;
  }
  return String(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text != null) {
    node.textContent = text;
  }
  return node;
}

function createPill(text, className = "meta-pill") {
  return createElement("span", className, text);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function renderSelectOptions(select, values) {
  const currentValue = select.value;
  select.innerHTML = '<option value="">全部</option>';

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = currentValue;
}

function explicitValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate != null && candidate !== "") {
      return candidate;
    }
  }
  return null;
}

function normalizePlan(raw, sourceFile = "") {
  const cityName = raw.city && typeof raw.city === "object" ? raw.city.name || raw.city.code || "" : raw.city || "";
  const cityCode = raw.city && typeof raw.city === "object" ? raw.city.code || "" : "";

  return {
    id: String(raw.id || sourceFile || `imported-${Date.now()}`),
    slug: String(raw.slug || ""),
    title: String(raw.title || sourceFile || "Untitled plan"),
    summary: String(raw.summary || ""),
    city: {
      code: String(cityCode),
      name: String(cityName),
      region_name: String(raw.city?.region_name || ""),
    },
    trip_type: String(explicitValue(raw.trip_type, raw.request?.trip_type, raw.request?.traveler_type) || ""),
    days: Number(raw.days || asArray(raw.daily_itinerary).length || 0),
    theme: String(explicitValue(raw.theme, raw.request?.theme) || ""),
    season: String(explicitValue(raw.season, raw.request?.season, raw.metadata?.season) || ""),
    pace: String(explicitValue(raw.pace, raw.request?.pace) || ""),
    quality: String(explicitValue(raw.quality, raw.validation?.quality, raw.metadata?.quality) || ""),
    budget: raw.budget && typeof raw.budget === "object"
      ? {
          level: String(raw.budget.level || ""),
          note: String(raw.budget.note || ""),
        }
      : null,
    tags: asArray(raw.tags).map((item) => String(item)),
    image_prompt: String(raw.image_prompt || ""),
    daily_itinerary: asArray(raw.daily_itinerary),
    pois: asArray(raw.pois),
    food: asArray(raw.food),
    source_file: sourceFile || String(raw.source_file || ""),
    review: raw.review || null,
  };
}

function populateFilters() {
  const cities = [...new Set(state.plans.map((plan) => plan.city.name || plan.city.code).filter(Boolean))];
  const tripTypes = [...new Set(state.plans.map((plan) => plan.trip_type).filter(Boolean))];

  renderSelectOptions(elements.cityFilter, cities.sort((a, b) => a.localeCompare(b, "zh-CN")));
  renderSelectOptions(elements.tripTypeFilter, tripTypes.sort((a, b) => a.localeCompare(b, "zh-CN")));
}

function applyFilters() {
  const search = state.filters.search.trim().toLowerCase();

  state.filteredPlans = state.plans.filter((plan) => {
    const matchesSearch =
      !search ||
      [
        plan.title,
        plan.city.name,
        plan.city.code,
        plan.trip_type,
        plan.theme,
        plan.source_file,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));

    const cityName = plan.city.name || plan.city.code || "";
    const matchesCity = !state.filters.city || cityName === state.filters.city;
    const matchesTripType = !state.filters.tripType || plan.trip_type === state.filters.tripType;
    const matchesReviewStatus =
      !state.filters.reviewStatus ||
      (state.filters.reviewStatus === "reviewed" && plan.reviewed) ||
      (state.filters.reviewStatus === "pending" && !plan.reviewed);

    return matchesSearch && matchesCity && matchesTripType && matchesReviewStatus;
  });
}

function renderPlanList() {
  elements.planList.innerHTML = "";
  elements.resultCount.textContent = `${state.filteredPlans.length} 条计划`;
  elements.statusCount.textContent = `未审核 ${state.counts.pending} / 已审核 ${state.counts.reviewed}`;

  if (state.filteredPlans.length === 0) {
    elements.planList.appendChild(createElement("div", "empty-card", "当前筛选下没有计划。"));
    return;
  }

  state.filteredPlans.forEach((plan) => {
    const item = createElement("button", "plan-item");
    item.type = "button";
    if (state.currentSource === "library" && plan.id === state.currentPlanId) {
      item.classList.add("active");
    }

    item.appendChild(createElement("h3", "", safeText(plan.title)));

    const meta = createElement("div", "plan-item-meta");
    [
      safeText(plan.city.name || plan.city.code),
      safeText(plan.trip_type),
      plan.days ? `${plan.days} days` : "N/A days",
      `theme: ${safeText(plan.theme)}`,
    ].forEach((text) => meta.appendChild(createPill(text)));

    const statusText = plan.reviewed
      ? `已审核${plan.score ? ` / ${plan.score} 星` : ""}`
      : "未审核";
    const statusClass = plan.reviewed ? "status-pill reviewed" : "status-pill";

    item.appendChild(meta);
    item.appendChild(createPill(statusText, statusClass));
    item.addEventListener("click", () => loadPlanDetail(plan.id));
    elements.planList.appendChild(item);
  });
}

function renderStars(score) {
  elements.starRating.innerHTML = "";

  for (let value = 1; value <= 5; value += 1) {
    const button = createElement("button", `star-button ${value <= score ? "active" : ""}`, `${value}★`);
    button.type = "button";
    button.addEventListener("click", () => {
      state.selectedScore = value;
      renderStars(value);
    });
    elements.starRating.appendChild(button);
  }
}

function renderIssues(selectedIssues) {
  elements.issueOptions.innerHTML = "";
  const selectedSet = new Set(selectedIssues);

  state.issues.forEach((issue) => {
    const label = createElement("label", "checkbox-item");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = issue;
    input.checked = selectedSet.has(issue);
    label.appendChild(input);
    label.appendChild(createElement("span", "", issue));
    elements.issueOptions.appendChild(label);
  });
}

function getSelectedIssues() {
  return [...elements.issueOptions.querySelectorAll("input:checked")].map((input) => input.value);
}

function renderMeta(plan) {
  elements.metaGrid.innerHTML = "";

  const entries = [
    `城市: ${safeText(plan.city.name || plan.city.code)}`,
    `天数: ${plan.days ? `${plan.days}` : "N/A"}`,
    `Traveler: ${safeText(plan.trip_type)}`,
    `Season: ${safeText(plan.season)}`,
    `Theme: ${safeText(plan.theme)}`,
    `Pace: ${safeText(plan.pace)}`,
    `Budget: ${safeText(plan.budget?.level)}`,
    `Source: ${safeText(plan.source_file)}`,
  ];

  entries.forEach((entry) => {
    elements.metaGrid.appendChild(createPill(entry));
  });
}

function renderTags(tags, plan) {
  elements.tagList.innerHTML = "";
  const items = [...tags];

  if (plan.budget?.note) {
    items.push(`Budget note: ${plan.budget.note}`);
  }

  if (plan.image_prompt) {
    items.push(`Image prompt ready`);
  }

  if (items.length === 0) {
    elements.tagList.appendChild(createElement("div", "empty-card", "当前计划没有显式 tags。"));
    return;
  }

  items.forEach((tag) => {
    elements.tagList.appendChild(createPill(tag, "tag"));
  });
}

function renderItinerary(plan) {
  elements.itineraryList.innerHTML = "";
  const poiMap = new Map(asArray(plan.pois).map((poi) => [poi.id, poi.name]));
  const foodMap = new Map(asArray(plan.food).map((food) => [food.id, food.name]));

  asArray(plan.daily_itinerary).forEach((day) => {
    const card = createElement("article", "day-card");
    const header = createElement("div", "day-card-header");
    header.appendChild(createElement("span", "day-label", `Day ${safeText(day.day)}`));
    header.appendChild(createElement("h3", "day-card-title", safeText(day.title)));
    header.appendChild(createElement("p", "day-summary", safeText(day.summary)));
    card.appendChild(header);

    const activityList = createElement("div", "activity-list");
    asArray(day.activities).forEach((activity) => {
      const activityNode = createElement("article", "activity-item");
      activityNode.appendChild(createElement("span", "activity-time", safeText(activity.time_block)));
      activityNode.appendChild(createElement("p", "activity-description", safeText(activity.description)));

      const links = createElement("div", "activity-links");
      asArray(activity.poi_refs)
        .map((id) => poiMap.get(id))
        .filter(Boolean)
        .forEach((name) => links.appendChild(createPill(`POI · ${name}`)));

      asArray(activity.food_refs)
        .map((id) => foodMap.get(id))
        .filter(Boolean)
        .forEach((name) => links.appendChild(createPill(`Food · ${name}`)));

      if (links.childNodes.length > 0) {
        activityNode.appendChild(links);
      }

      activityList.appendChild(activityNode);
    });

    card.appendChild(activityList);
    elements.itineraryList.appendChild(card);
  });

  if (!elements.itineraryList.childNodes.length) {
    elements.itineraryList.appendChild(createElement("div", "empty-card", "当前计划没有 daily itinerary。"));
  }
}

function renderInfoList(container, items, type) {
  container.innerHTML = "";

  asArray(items).forEach((item) => {
    const card = createElement("article", "info-card");
    card.appendChild(createElement("h3", "", safeText(item.name)));

    const meta = createElement("div", "pill-row");
    if (type === "poi") {
      meta.appendChild(createPill(`类型: ${safeText(item.type)}`));
      meta.appendChild(createPill(`区域: ${safeText(item.district)}`));
      meta.appendChild(createPill(`推荐时长: ${safeText(item.recommended_duration_minutes)} min`));
    } else {
      meta.appendChild(createPill(`分类: ${safeText(item.category)}`));
      meta.appendChild(createPill(`区域: ${safeText(item.district)}`));
      meta.appendChild(createPill(`场景: ${safeText(item.scene || item.suitable_for)}`));
    }

    card.appendChild(meta);
    card.appendChild(createElement("p", "info-copy", safeText(item.description || item.reason)));
    container.appendChild(card);
  });

  if (!container.childNodes.length) {
    container.appendChild(createElement("div", "empty-card", "暂无可展示内容。"));
  }
}

function fillReviewForm(review) {
  state.selectedScore = review?.score || 0;
  renderStars(state.selectedScore);
  renderIssues(review?.issues || []);
  elements.commentInput.value = review?.comment || "";
  elements.saveMessage.textContent = "";
  elements.saveMessage.className = "save-message";
}

function renderReviewInfo(plan) {
  elements.reviewInfo.innerHTML = "";

  const contentBlock = createElement("section", "review-block");
  contentBlock.appendChild(createElement("h3", "", "内容信息"));

  [
    ["Traveler", safeText(plan.trip_type)],
    ["Season", safeText(plan.season)],
    ["Quality", safeText(plan.quality)],
    ["Pace", safeText(plan.pace)],
    ["Budget", safeText(plan.budget?.level)],
    ["Plan Source", state.currentSource === "imported" ? "Imported JSON" : "Plan Library"],
  ].forEach(([label, value]) => {
    const row = createElement("div", "review-field");
    row.appendChild(createElement("span", "review-label", label));
    row.appendChild(createElement("span", "review-value", value));
    contentBlock.appendChild(row);
  });

  elements.reviewInfo.appendChild(contentBlock);
}

function normalizeCompareText(value) {
  return safeText(value, "")
    .toLowerCase()
    .replace(/[\s·,./\\|()[\]{}:：，、。-]+/g, "");
}

function buildPoiLookup(plan) {
  return new Map(asArray(plan.pois).map((poi) => [poi.id, poi]));
}

function getOrderedPoiTransitions(plan) {
  const poiLookup = buildPoiLookup(plan);
  const transitions = [];
  const seen = new Set();

  asArray(plan.daily_itinerary).forEach((day) => {
    let previousPoi = null;

    asArray(day.activities).forEach((activity) => {
      const currentPoiRef = asArray(activity.poi_refs)[0];
      const currentPoi = currentPoiRef ? poiLookup.get(currentPoiRef) : null;

      if (previousPoi && currentPoi) {
        const key = `${previousPoi.id}::${currentPoi.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          transitions.push({
            from: previousPoi,
            to: currentPoi,
            day: day.day,
          });
        }
      }

      if (currentPoi) {
        previousPoi = currentPoi;
      }
    });
  });

  return transitions;
}

function namesRoughlyMatch(left, right) {
  const normalizedLeft = normalizeCompareText(left);
  const normalizedRight = normalizeCompareText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function findRouteFact(routeFacts, fromName, toName) {
  return asArray(routeFacts).find((fact) => {
    return namesRoughlyMatch(fact.from, fromName) && namesRoughlyMatch(fact.to, toName);
  });
}

function renderMapFacts(plan, mapAssets) {
  elements.mapFactsList.innerHTML = "";

  const sectionTitle = createElement("section", "review-block");
  sectionTitle.appendChild(createElement("h3", "", "地图事实"));
  elements.mapFactsList.appendChild(sectionTitle);

  const transitions = getOrderedPoiTransitions(plan);
  const matches = transitions
    .map((transition) => {
      const fact = findRouteFact(mapAssets.route_facts, transition.from.name, transition.to.name);
      if (!fact) {
        return null;
      }
      return { transition, fact };
    })
    .filter(Boolean);

  if (matches.length === 0) {
    elements.mapFactsList.appendChild(
      createElement("div", "empty-card", "N/A：当前 JSON 中没有可直接命中的 verified route facts。"),
    );
    return;
  }

  matches.forEach(({ transition, fact }) => {
    const card = createElement("article", "fact-card");
    card.appendChild(
      createElement(
        "h3",
        "",
        `Day ${safeText(transition.day)} · ${safeText(transition.from.name)} → ${safeText(transition.to.name)}`,
      ),
    );

    const meta = createElement("div", "fact-meta");
    meta.appendChild(createPill(`${safeText(fact.distance_m)} m`));
    meta.appendChild(createPill(`${safeText(fact.duration_min)} min`));
    meta.appendChild(createPill(safeText(fact.mode)));
    card.appendChild(meta);

    const status = createElement(
      "p",
      "fact-copy",
      `${safeText(fact.source_provider)} verified`,
    );
    status.classList.add("fact-status");
    card.appendChild(status);

    elements.mapFactsList.appendChild(card);
  });
}

async function ensureMapAssets(cityCode) {
  const normalizedCityCode = safeText(cityCode, "").trim().toLowerCase();
  if (!normalizedCityCode) {
    return { poi_assets: [], route_facts: [] };
  }

  if (state.mapAssetsCache.has(normalizedCityCode)) {
    return state.mapAssetsCache.get(normalizedCityCode);
  }

  try {
    const payload = await fetchJson(`/api/map-assets/${encodeURIComponent(normalizedCityCode)}`);
    state.mapAssetsCache.set(normalizedCityCode, payload);
    return payload;
  } catch (error) {
    console.warn("[review-tool] Failed to load map assets", error);
    const fallback = { poi_assets: [], route_facts: [] };
    state.mapAssetsCache.set(normalizedCityCode, fallback);
    return fallback;
  }
}

function toggleManualReview(isImported) {
  elements.importReviewNote.classList.toggle("hidden", !isImported);
  elements.reviewForm.classList.toggle("hidden", isImported);
}

async function renderPlanDetail(plan, source) {
  state.currentPlan = plan;
  state.currentPlanId = plan.id;
  state.currentSource = source;

  elements.emptyState.classList.add("hidden");
  elements.detailView.classList.remove("hidden");
  elements.planSourceBadge.textContent = source === "imported" ? "Imported JSON" : "Library Plan";
  elements.planTitle.textContent = safeText(plan.title);
  elements.planSummary.textContent = safeText(plan.summary);

  renderMeta(plan);
  renderTags(plan.tags, plan);
  renderItinerary(plan);
  renderInfoList(elements.poiList, plan.pois, "poi");
  renderInfoList(elements.foodList, plan.food, "food");
  renderReviewInfo(plan);

  const mapAssets = await ensureMapAssets(plan.city.code);
  renderMapFacts(plan, mapAssets);

  toggleManualReview(source === "imported");
  fillReviewForm(plan.review);
  renderPlanList();
}

async function loadPlanDetail(planId) {
  try {
    const plan = await fetchJson(`/api/plans/${encodeURIComponent(planId)}`);
    await renderPlanDetail(normalizePlan(plan, plan.source_file), "library");
  } catch (error) {
    elements.saveMessage.textContent = error.message;
    elements.saveMessage.className = "save-message error";
  }
}

function bindFilters() {
  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    applyFilters();
    renderPlanList();
  });

  elements.cityFilter.addEventListener("change", (event) => {
    state.filters.city = event.target.value;
    applyFilters();
    renderPlanList();
  });

  elements.tripTypeFilter.addEventListener("change", (event) => {
    state.filters.tripType = event.target.value;
    applyFilters();
    renderPlanList();
  });

  elements.reviewStatusFilter.addEventListener("change", (event) => {
    state.filters.reviewStatus = event.target.value;
    applyFilters();
    renderPlanList();
  });
}

async function submitReview(event) {
  event.preventDefault();

  if (!state.currentPlan || state.currentSource !== "library") {
    return;
  }

  if (!state.selectedScore) {
    elements.saveMessage.textContent = "请先选择 1-5 星评分。";
    elements.saveMessage.className = "save-message error";
    return;
  }

  elements.saveButton.disabled = true;
  elements.saveMessage.textContent = "保存中...";
  elements.saveMessage.className = "save-message";

  try {
    await fetchJson("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: state.currentPlan.id,
        score: state.selectedScore,
        issues: getSelectedIssues(),
        comment: elements.commentInput.value,
      }),
    });

    elements.saveMessage.textContent = "审核结果已保存。";
    elements.saveMessage.className = "save-message success";
    await loadInitialData(state.currentPlan.id);
  } catch (error) {
    elements.saveMessage.textContent = error.message;
    elements.saveMessage.className = "save-message error";
  } finally {
    elements.saveButton.disabled = false;
  }
}

function renderImportMeta(plan, fileName) {
  elements.importMeta.innerHTML = "";
  [
    `文件: ${safeText(fileName)}`,
    `城市: ${safeText(plan.city.name || plan.city.code)}`,
    `Traveler: ${safeText(plan.trip_type)}`,
    `Days: ${plan.days ? plan.days : "N/A"}`,
  ].forEach((text) => {
    elements.importMeta.appendChild(createPill(text, "status-pill imported"));
  });

  elements.importMeta.classList.remove("hidden");
  elements.clearImportButton.classList.remove("hidden");
}

async function importPlanFile(file) {
  if (!file) {
    return;
  }

  const text = await file.text();
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    elements.saveMessage.textContent = "导入失败：文件不是有效 JSON。";
    elements.saveMessage.className = "save-message error";
    return;
  }

  const plan = normalizePlan(parsed, file.name);
  state.importedPlan = plan;
  state.importedFileName = file.name;
  renderImportMeta(plan, file.name);
  await renderPlanDetail(plan, "imported");
}

function clearImportedPlan() {
  state.importedPlan = null;
  state.importedFileName = "";
  elements.importMeta.innerHTML = "";
  elements.importMeta.classList.add("hidden");
  elements.clearImportButton.classList.add("hidden");
  elements.fileInput.value = "";

  if (state.currentSource === "imported") {
    const candidateId = state.filteredPlans[0]?.id;
    if (candidateId) {
      loadPlanDetail(candidateId);
      return;
    }

    state.currentPlan = null;
    state.currentPlanId = null;
    state.currentSource = "library";
    elements.detailView.classList.add("hidden");
    elements.emptyState.classList.remove("hidden");
  }
}

function bindImportControls() {
  elements.fileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    await importPlanFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName !== "drop") {
        elements.dropZone.classList.remove("dragging");
      }
    });
  });

  elements.dropZone.addEventListener("drop", async (event) => {
    elements.dropZone.classList.remove("dragging");
    const [file] = event.dataTransfer?.files || [];
    await importPlanFile(file);
  });

  elements.clearImportButton.addEventListener("click", clearImportedPlan);
}

async function loadInitialData(preferredPlanId) {
  const [meta, planList] = await Promise.all([fetchJson("/api/meta"), fetchJson("/api/plans")]);
  state.issues = meta.issues || [];
  state.plans = asArray(planList.plans).map((plan) => ({
    ...plan,
    city: typeof plan.city === "object"
      ? plan.city
      : {
          code: "",
          name: String(plan.city || ""),
          region_name: "",
        },
  }));
  state.planErrors = asArray(planList.errors);
  state.counts = planList.counts || {
    total: state.plans.length,
    pending: state.plans.filter((plan) => !plan.reviewed).length,
    reviewed: state.plans.filter((plan) => plan.reviewed).length,
  };

  if (state.planErrors.length > 0) {
    console.warn("[review-tool] Some plan files were skipped:", state.planErrors);
  }

  populateFilters();
  applyFilters();
  renderPlanList();

  if (state.currentSource === "imported" && state.importedPlan) {
    await renderPlanDetail(state.importedPlan, "imported");
    return;
  }

  const candidateId =
    preferredPlanId && state.filteredPlans.some((plan) => plan.id === preferredPlanId)
      ? preferredPlanId
      : state.currentPlanId && state.filteredPlans.some((plan) => plan.id === state.currentPlanId)
        ? state.currentPlanId
        : state.filteredPlans[0]?.id;

  if (candidateId) {
    await loadPlanDetail(candidateId);
    return;
  }

  state.currentPlan = null;
  state.currentPlanId = null;
  elements.detailView.classList.add("hidden");
  elements.emptyState.classList.remove("hidden");
  elements.emptyState.innerHTML =
    "<h2>当前筛选下没有可审核计划</h2><p>可以切换到“全部”或导入新的 JSON 文件继续阅读。</p>";
}

function start() {
  bindFilters();
  bindImportControls();
  elements.reviewForm.addEventListener("submit", submitReview);
  elements.reviewStatusFilter.value = state.filters.reviewStatus;
  renderStars(0);
  loadInitialData().catch((error) => {
    elements.emptyState.innerHTML = `<h2>加载失败</h2><p>${error.message}</p>`;
  });
}

start();
