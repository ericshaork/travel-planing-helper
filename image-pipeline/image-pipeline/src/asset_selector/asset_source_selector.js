const SUPPORTED_ASSET_ROLES = new Set(["cover", "place", "food", "scene", "experience"]);
const SUPPORTED_STRATEGIES = new Set([
  "generated_first",
  "external_first",
  "existing_first",
  "hybrid",
  "manual_editorial_selection"
]);
const SOURCE_TYPE_ORDER = ["generated", "external", "existing"];

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toStringValue(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeText(value) {
  return toStringValue(value).trim().toLowerCase();
}

function pickDefined(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function slugify(value, fallback = "decision") {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function normalizePlanSuggestion(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "unspecified";
  }

  const mapping = {
    ai: "generated",
    model: "generated",
    generated: "generated",
    external: "external",
    stock: "external",
    existing: "existing",
    legacy: "existing",
    hybrid: "hybrid",
    unspecified: "unspecified"
  };

  return mapping[normalized] || "unspecified";
}

function normalizeExistingAssetStatus(value) {
  const normalized = normalizeText(value);

  if (normalized === "strong_match" || normalized === "weak_match" || normalized === "none") {
    return normalized;
  }

  return "none";
}

function normalizeLevel(value, fallback = "medium") {
  const normalized = normalizeText(value);

  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return fallback;
}

function normalizeOverride(value) {
  const normalized = normalizeText(value);

  if (normalized === "generated" || normalized === "external" || normalized === "existing") {
    return normalized;
  }

  if (normalized === "hybrid") {
    return "hybrid";
  }

  return "";
}

function mapSourceToStrategy(sourceType) {
  const mapping = {
    generated: "generated_first",
    external: "external_first",
    existing: "existing_first",
    hybrid: "hybrid"
  };

  return mapping[sourceType] || "manual_editorial_selection";
}

function getDefaultStrategy(assetRole) {
  const defaults = {
    cover: "generated_first",
    place: "external_first",
    food: "external_first",
    scene: "generated_first",
    experience: "hybrid"
  };

  return defaults[assetRole];
}

function getDefaultCandidateOrder(strategy) {
  const orders = {
    generated_first: ["generated", "existing", "external"],
    external_first: ["external", "existing", "generated"],
    existing_first: ["existing", "generated", "external"],
    hybrid: ["generated", "external", "existing"],
    manual_editorial_selection: ["existing", "generated", "external"]
  };

  return orders[strategy] || SOURCE_TYPE_ORDER;
}

function createCandidateSources(strategy, existingAssetStatus, enableMap = {}) {
  const order = getDefaultCandidateOrder(strategy);

  return order.map((sourceType, index) => {
    let enabled = enableMap[sourceType];

    if (enabled === undefined) {
      enabled = sourceType === "existing" ? existingAssetStatus !== "none" : true;
    }

    return {
      source_type: sourceType,
      priority: index + 1,
      enabled
    };
  });
}

function createRejectedOptions(finalStrategy, existingAssetStatus, input) {
  const finalPrimary = finalStrategy.split("_")[0];
  const rejected = [];

  if (finalPrimary !== "generated" && finalStrategy !== "hybrid") {
    rejected.push(
      input.asset_role === "cover"
        ? "generated rejected because a higher-priority reuse or realism path won."
        : "generated rejected because generation is not the best primary fit for this request."
    );
  }

  if (finalPrimary !== "external" && finalStrategy !== "hybrid") {
    rejected.push(
      input.asset_role === "cover"
        ? "external rejected because brand and editorial style control are more important."
        : "external rejected because a better source strategy exists for this request."
    );
  }

  if (finalPrimary !== "existing" && finalStrategy !== "hybrid") {
    rejected.push(
      existingAssetStatus === "none"
        ? "existing rejected because no approved matching asset exists."
        : existingAssetStatus === "weak_match"
          ? "existing rejected because only a weak approved match is available."
          : "existing rejected because reuse is not the best choice for this specific need."
    );
  }

  if (finalStrategy !== "hybrid") {
    rejected.push("hybrid rejected because a single primary source strategy is sufficient.");
  }

  return rejected;
}

function validateInput(input) {
  assertObject(input, "input");

  const assetRole = normalizeText(input.asset_role);

  if (!SUPPORTED_ASSET_ROLES.has(assetRole)) {
    throw new Error(`input.asset_role must be one of: ${Array.from(SUPPORTED_ASSET_ROLES).join(", ")}.`);
  }

  return {
    asset_role: assetRole,
    subject: toStringValue(input.subject),
    subject_type: toStringValue(input.subject_type),
    plan_suggestion: normalizePlanSuggestion(input.plan_suggestion),
    existing_asset_status: normalizeExistingAssetStatus(input.existing_asset_status),
    city_knowledge_influence: toStringValue(input.city_knowledge_influence),
    scene_requirement: normalizeLevel(input.scene_requirement, "medium"),
    brand_requirement: normalizeLevel(input.brand_requirement, "medium"),
    realism_requirement: normalizeLevel(input.realism_requirement, "medium"),
    manual_override: normalizeOverride(input.manual_override),
    request_id: toStringValue(input.request_id),
    asset_request_id: toStringValue(input.asset_request_id)
  };
}

function buildScoringProfile(input) {
  const scores = {
    generated: 0,
    external: 0,
    existing: 0,
    hybrid: 0
  };
  const winningFactors = [];

  const defaultStrategy = getDefaultStrategy(input.asset_role);
  const defaultPrimary = defaultStrategy.split("_")[0];
  scores[defaultPrimary] += 3;
  winningFactors.push(`${input.asset_role} role default favors ${defaultPrimary}`);

  if (input.plan_suggestion !== "unspecified") {
    scores[input.plan_suggestion] += 4;
    winningFactors.push(`plan suggestion favors ${input.plan_suggestion}`);
  }

  if (input.existing_asset_status === "strong_match") {
    scores.existing += 5;
    winningFactors.push("strong approved existing asset is available");
  } else if (input.existing_asset_status === "weak_match") {
    scores.existing += 1;
    winningFactors.push("a weak existing asset is available but should not dominate");
  }

  if (input.brand_requirement === "high") {
    scores.generated += 3;
    if (input.existing_asset_status !== "none") {
      scores.existing += 2;
    }
    winningFactors.push("brand requirement is high");
  } else if (input.brand_requirement === "medium") {
    scores.generated += 1;
    scores.hybrid += 1;
  }

  if (input.realism_requirement === "high") {
    scores.external += 4;
    scores.hybrid += 1;
    winningFactors.push("realism requirement is high");
  } else if (input.realism_requirement === "low") {
    scores.generated += 2;
  }

  if (input.scene_requirement === "high") {
    scores.generated += 2;
    scores.hybrid += 2;
    winningFactors.push("scene requirement is high");
  } else if (input.scene_requirement === "low") {
    scores.external += 1;
  }

  if (input.asset_role === "experience") {
    scores.hybrid += 3;
    winningFactors.push("experience role naturally supports hybrid");
  }

  if (input.asset_role === "scene") {
    scores.generated += 2;
  }

  if (input.asset_role === "food") {
    scores.external += 2;
  }

  if (input.city_knowledge_influence) {
    const cityText = normalizeText(input.city_knowledge_influence);

    if (cityText.includes("authentic") || cityText.includes("recognizable") || cityText.includes("real-world")) {
      scores.external += 2;
    }

    if (cityText.includes("editorial") || cityText.includes("story") || cityText.includes("poetic")) {
      scores.generated += 1;
    }
  }

  return {
    scores,
    winningFactors
  };
}

function resolveStrategy(input, scoringProfile) {
  if (input.manual_override) {
    return {
      finalStrategy: mapSourceToStrategy(input.manual_override),
      winner: "manual_override",
      conflictNotes: "Manual override has highest priority and wins over all other inputs."
    };
  }

  if (input.asset_role === "experience" && input.plan_suggestion === "hybrid") {
    return {
      finalStrategy: "hybrid",
      winner: "plan_suggestion",
      conflictNotes: "Hybrid is intentional here because experience needs both credibility and brand atmosphere."
    };
  }

  if (input.plan_suggestion === "hybrid" && input.existing_asset_status === "strong_match") {
    return {
      finalStrategy: "hybrid",
      winner: "plan_suggestion",
      conflictNotes: "Hybrid wins because an approved reusable asset exists and fresh generated support is still valuable."
    };
  }

  if (input.existing_asset_status === "strong_match" && input.plan_suggestion !== "external") {
    return {
      finalStrategy: "existing_first",
      winner: "existing_asset_status",
      conflictNotes:
        "Strong approved existing assets can override default strategy when freshness is not explicitly required."
    };
  }

  if (
    input.asset_role === "cover" &&
    input.plan_suggestion === "external" &&
    input.brand_requirement === "high"
  ) {
    return {
      finalStrategy: "generated_first",
      winner: "brand_requirement",
      conflictNotes:
        "Plan suggestion is external, but cover brand requirements are strong enough to keep generated as the preferred strategy."
    };
  }

  if (input.plan_suggestion !== "unspecified") {
    return {
      finalStrategy: mapSourceToStrategy(input.plan_suggestion),
      winner: "plan_suggestion",
      conflictNotes:
        input.plan_suggestion === "external"
          ? "Preferred source intent is external-first. Later execution may still fallback if coverage fails."
          : "Plan suggestion is adopted because no stronger conflicting input overrides it."
    };
  }

  const sortedScores = Object.entries(scoringProfile.scores).sort((a, b) => b[1] - a[1]);
  const topSource = sortedScores[0][0];

  return {
    finalStrategy: mapSourceToStrategy(topSource),
    winner: "scoring_model",
    conflictNotes: "Final strategy is selected from the selector scoring model."
  };
}

function buildDecisionReason(input, resolved, scoringProfile) {
  const reasons = [];

  reasons.push(`asset_role=${input.asset_role}`);
  reasons.push(`winner=${resolved.winner}`);

  if (input.plan_suggestion !== "unspecified") {
    reasons.push(`plan_suggestion=${input.plan_suggestion}`);
  }

  reasons.push(`existing_asset_status=${input.existing_asset_status}`);
  reasons.push(`brand_requirement=${input.brand_requirement}`);
  reasons.push(`realism_requirement=${input.realism_requirement}`);
  reasons.push(`scene_requirement=${input.scene_requirement}`);

  const finalPrimary = resolved.finalStrategy.split("_")[0];
  if (resolved.finalStrategy === "hybrid") {
    reasons.push("hybrid strategy is intentional for this request.");
  } else {
    reasons.push(`selected_primary_source=${finalPrimary}`);
  }

  const sortedScores = Object.entries(scoringProfile.scores)
    .sort((a, b) => b[1] - a[1])
    .map(([sourceType, score]) => `${sourceType}:${score}`);

  reasons.push(`score_tendencies=${sortedScores.join(",")}`);

  return reasons;
}

function buildFallbackPolicy(strategy) {
  const mapping = {
    generated_first: ["existing", "external"],
    external_first: ["existing", "generated"],
    existing_first: ["generated", "external"],
    hybrid: ["existing", "generated", "external"],
    manual_editorial_selection: ["existing", "generated", "external"]
  };

  return {
    allow_fallback: true,
    fallback_order: mapping[strategy] || ["existing", "generated", "external"],
    manual_review_required_on_fallback: true
  };
}

function selectAssetSource(rawInput) {
  const input = validateInput(rawInput);
  const scoringProfile = buildScoringProfile(input);
  const resolved = resolveStrategy(input, scoringProfile);

  if (!SUPPORTED_STRATEGIES.has(resolved.finalStrategy)) {
    throw new Error(`Unsupported final strategy "${resolved.finalStrategy}".`);
  }

  const decisionIdBase = input.asset_request_id || input.request_id || `${input.asset_role}_${input.subject || "item"}`;
  const candidateSources = createCandidateSources(resolved.finalStrategy, input.existing_asset_status);
  const rejectedOptions = createRejectedOptions(resolved.finalStrategy, input.existing_asset_status, input);
  const winningFactors = [];

  if (input.manual_override) {
    winningFactors.push("manual override has highest priority");
  }

  for (const factor of scoringProfile.winningFactors) {
    if (!winningFactors.includes(factor)) {
      winningFactors.push(factor);
    }
  }

  if (input.plan_suggestion === "generated" && !winningFactors.includes("plan suggestion favors generated")) {
    winningFactors.push("plan suggestion favors generated");
  }

  if (input.plan_suggestion === "external" && !winningFactors.includes("plan suggestion favors external")) {
    winningFactors.push("plan suggestion favors external");
  }

  if (input.plan_suggestion === "hybrid" && !winningFactors.includes("plan suggestion favors hybrid")) {
    winningFactors.push("plan suggestion favors hybrid");
  }

  return {
    decision_id: `srcdec_${slugify(decisionIdBase, "decision")}`,
    asset_request_id: input.asset_request_id || input.request_id || "",
    asset_role: input.asset_role,
    subject: pickDefined({
      subject_type: input.subject_type,
      title: input.subject,
      destination: undefined
    }),
    source_strategy: resolved.finalStrategy,
    candidate_sources: candidateSources,
    decision_reason: buildDecisionReason(input, resolved, scoringProfile),
    fallback_policy: buildFallbackPolicy(resolved.finalStrategy),
    constraints: {
      brand_requirement: input.brand_requirement,
      realism_requirement: input.realism_requirement,
      scene_requirement: input.scene_requirement,
      allow_existing_reuse: input.existing_asset_status !== "none"
    },
    decision_inputs: {
      plan_suggestion: input.plan_suggestion,
      existing_asset_status: input.existing_asset_status,
      city_knowledge_influence: input.city_knowledge_influence,
      scene_requirement: input.scene_requirement,
      brand_requirement: input.brand_requirement,
      realism_requirement: input.realism_requirement,
      manual_override: input.manual_override || undefined
    },
    decision_trace: {
      winning_factors: winningFactors,
      rejected_options: rejectedOptions,
      final_strategy: resolved.finalStrategy,
      conflict_notes: resolved.conflictNotes
    }
  };
}

module.exports = {
  selectAssetSource,
  normalizePlanSuggestion,
  normalizeExistingAssetStatus
};
