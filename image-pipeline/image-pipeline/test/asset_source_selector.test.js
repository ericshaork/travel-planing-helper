const test = require("node:test");
const assert = require("node:assert/strict");

const { selectAssetSource } = require("../src/asset_selector/asset_source_selector");

test("Case 1: Hangzhou cover should choose generated_first", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_hangzhou_cover",
    asset_role: "cover",
    subject: "Hangzhou trip cover",
    subject_type: "trip_cover",
    plan_suggestion: "generated",
    existing_asset_status: "none",
    city_knowledge_influence: "Hangzhou should avoid collapsing into generic lake postcard imagery.",
    scene_requirement: "high",
    brand_requirement: "high",
    realism_requirement: "medium"
  });

  assert.equal(decision.source_strategy, "generated_first");
  assert.ok(decision.decision_trace.winning_factors.includes("cover role default favors generated"));
});

test("Case 2: Xi'an Terracotta Warriors place should choose external_first", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_xian_terracotta",
    asset_role: "place",
    subject: "Terracotta Warriors",
    subject_type: "poi",
    plan_suggestion: "external",
    existing_asset_status: "none",
    city_knowledge_influence: "Terracotta Warriors is a highly recognizable real-world landmark.",
    scene_requirement: "low",
    brand_requirement: "medium",
    realism_requirement: "high"
  });

  assert.equal(decision.source_strategy, "external_first");
  assert.ok(decision.decision_trace.winning_factors.includes("plan suggestion favors external"));
});

test("Case 3: Chengdu hotpot food should choose external_first", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_chengdu_hotpot",
    asset_role: "food",
    subject: "Chengdu hotpot",
    subject_type: "food_entity",
    plan_suggestion: "external",
    existing_asset_status: "none",
    city_knowledge_influence: "Food should preserve regional identity and believable dining texture.",
    scene_requirement: "medium",
    brand_requirement: "medium",
    realism_requirement: "high"
  });

  assert.equal(decision.source_strategy, "external_first");
});

test("Case 4: strong existing cover should override generated default", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_hangzhou_existing_cover",
    asset_role: "cover",
    subject: "Hangzhou trip cover",
    subject_type: "trip_cover",
    plan_suggestion: "generated",
    existing_asset_status: "strong_match",
    city_knowledge_influence: "Existing asset already represents Hangzhou appropriately.",
    scene_requirement: "medium",
    brand_requirement: "high",
    realism_requirement: "medium"
  });

  assert.equal(decision.source_strategy, "existing_first");
  assert.equal(decision.decision_trace.final_strategy, "existing_first");
});

test("Case 5: weak existing cover should still choose generated_first", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_hangzhou_weak_existing",
    asset_role: "cover",
    subject: "Hangzhou trip cover",
    subject_type: "trip_cover",
    plan_suggestion: "generated",
    existing_asset_status: "weak_match",
    city_knowledge_influence: "Current request still needs a better Hangzhou-specific editorial expression.",
    scene_requirement: "high",
    brand_requirement: "high",
    realism_requirement: "medium"
  });

  assert.equal(decision.source_strategy, "generated_first");
});

test("Case 6: experience asset should choose hybrid", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_experience_hybrid",
    asset_role: "experience",
    subject: "Local cultural experience",
    subject_type: "experience_entity",
    plan_suggestion: "hybrid",
    existing_asset_status: "none",
    city_knowledge_influence: "Local culture should remain specific and believable.",
    scene_requirement: "high",
    brand_requirement: "medium",
    realism_requirement: "medium"
  });

  assert.equal(decision.source_strategy, "hybrid");
  assert.ok(decision.decision_trace.winning_factors.includes("experience role naturally supports hybrid"));
});

test("Case 7: external preferred should preserve intent even when fallback may be needed", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_external_fallback",
    asset_role: "place",
    subject: "Specific POI with poor stock coverage",
    subject_type: "poi",
    plan_suggestion: "external",
    existing_asset_status: "none",
    city_knowledge_influence: "Place authenticity still matters.",
    scene_requirement: "low",
    brand_requirement: "medium",
    realism_requirement: "high"
  });

  assert.equal(decision.source_strategy, "external_first");
  assert.deepEqual(decision.fallback_policy.fallback_order, ["existing", "generated"]);
});

test("Case 8: manual override should win with existing_first", () => {
  const decision = selectAssetSource({
    asset_request_id: "assetreq_manual_override",
    asset_role: "cover",
    subject: "Hangzhou trip cover",
    subject_type: "trip_cover",
    plan_suggestion: "generated",
    existing_asset_status: "strong_match",
    city_knowledge_influence: "Existing asset already fits destination well enough.",
    scene_requirement: "medium",
    brand_requirement: "high",
    realism_requirement: "medium",
    manual_override: "existing"
  });

  assert.equal(decision.source_strategy, "existing_first");
  assert.ok(decision.decision_trace.winning_factors.includes("manual override has highest priority"));
});
