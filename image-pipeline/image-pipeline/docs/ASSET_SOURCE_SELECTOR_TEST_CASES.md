# ASSET_SOURCE_SELECTOR_TEST_CASES

## 1. Test Case Purpose

This document defines behavioral test standards for the future Wanderly Asset Source Selector.

These cases are not used to validate algorithm accuracy.
They are used to define expected selector behavior before implementation.

Each case is meant to answer:

- when a visual asset request appears, which source strategy should win
- why that strategy should win
- why other strategies should not win
- whether the decision remains explainable under conflict

This document should become the acceptance reference for future selector implementation.

## 2. Standard Test Case Schema

All selector test cases should use this structure:

```json
{
  "case_id": "",
  "scenario": "",
  "inputs": {
    "asset_role": "",
    "subject": "",
    "plan_suggestion": "",
    "existing_asset_status": "",
    "city_knowledge_influence": "",
    "scene_requirement": "",
    "brand_requirement": "",
    "realism_requirement": "",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "",
    "winning_factors": [],
    "rejected_options": [],
    "conflict_notes": ""
  }
}
```

Notes:

- `manual_override` may be empty when not used.
- `subject` is optional but recommended when the case depends on a specific place, food, or experience.
- `existing_asset_status` should use:
  - `none`
  - `weak_match`
  - `strong_match`

## 3. Core Validation Goals

This suite is designed to validate:

- whether source priority matches Wanderly product intent
- whether `generated`, `external`, `existing`, and `hybrid` are chosen in the right contexts
- whether conflict resolution remains understandable
- whether future code implementation has a stable testing target

## 4. Required Test Cases

### Case 1: Hangzhou Trip Cover

```json
{
  "case_id": "selector_case_001",
  "scenario": "Hangzhou travel cover for an Explore article.",
  "inputs": {
    "asset_role": "cover",
    "subject": "Hangzhou trip cover",
    "plan_suggestion": "generated",
    "existing_asset_status": "none",
    "city_knowledge_influence": "Hangzhou cover should avoid collapsing into generic lake postcard imagery.",
    "scene_requirement": "high",
    "brand_requirement": "high",
    "realism_requirement": "medium",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "generated_first",
    "winning_factors": [
      "cover role prefers generated",
      "plan suggestion is generated",
      "brand requirement is high",
      "scene requirement is high"
    ],
    "rejected_options": [
      "external rejected because Wanderly cover needs stronger style control",
      "existing rejected because no approved matching asset exists"
    ],
    "conflict_notes": "Generated should win because Wanderly cover is a brand-facing editorial asset."
  }
}
```

### Case 2: Xi'an Terracotta Warriors Place Image

```json
{
  "case_id": "selector_case_002",
  "scenario": "Place image for Terracotta Warriors in Xi'an.",
  "inputs": {
    "asset_role": "place",
    "subject": "Terracotta Warriors",
    "plan_suggestion": "external",
    "existing_asset_status": "none",
    "city_knowledge_influence": "Terracotta Warriors is a highly recognizable real-world landmark.",
    "scene_requirement": "low",
    "brand_requirement": "medium",
    "realism_requirement": "high",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "external_first",
    "winning_factors": [
      "place role prefers external",
      "plan suggestion is external",
      "realism requirement is high",
      "city knowledge increases authenticity value"
    ],
    "rejected_options": [
      "generated rejected because recognizability and realism are more important",
      "existing rejected because no approved matching asset exists"
    ],
    "conflict_notes": "Real location understanding should be prioritized over editorial stylization."
  }
}
```

### Case 3: Chengdu Hotpot Food Image

```json
{
  "case_id": "selector_case_003",
  "scenario": "Food image for Chengdu hotpot in an Explore article.",
  "inputs": {
    "asset_role": "food",
    "subject": "Chengdu hotpot",
    "plan_suggestion": "external",
    "existing_asset_status": "none",
    "city_knowledge_influence": "Food should preserve regional identity and believable dining texture.",
    "scene_requirement": "medium",
    "brand_requirement": "medium",
    "realism_requirement": "high",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "external_first",
    "winning_factors": [
      "food role prefers external",
      "plan suggestion is external",
      "realism requirement is high"
    ],
    "rejected_options": [
      "generated rejected because food trust and texture matter more than style control",
      "existing rejected because no approved matching food asset exists"
    ],
    "conflict_notes": "This case validates that food should default toward realism-first sourcing."
  }
}
```

### Case 4: Strong Existing Hangzhou Cover Asset

```json
{
  "case_id": "selector_case_004",
  "scenario": "An excellent approved Hangzhou cover already exists.",
  "inputs": {
    "asset_role": "cover",
    "subject": "Hangzhou trip cover",
    "plan_suggestion": "generated",
    "existing_asset_status": "strong_match",
    "city_knowledge_influence": "Existing asset already represents Hangzhou appropriately.",
    "scene_requirement": "medium",
    "brand_requirement": "high",
    "realism_requirement": "medium",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "existing_first",
    "winning_factors": [
      "strong approved existing asset is available",
      "existing asset already satisfies brand requirement",
      "reuse avoids unnecessary generation and review"
    ],
    "rejected_options": [
      "generated rejected because strong existing asset can override default strategy",
      "external rejected because cover remains a brand-led asset"
    ],
    "conflict_notes": "This case explicitly validates that strong existing assets can override the default generated-first cover policy."
  }
}
```

### Case 5: Weak Existing Legacy Asset

```json
{
  "case_id": "selector_case_005",
  "scenario": "A weak old legacy cover exists, but does not fit the new Hangzhou request well.",
  "inputs": {
    "asset_role": "cover",
    "subject": "Hangzhou trip cover",
    "plan_suggestion": "generated",
    "existing_asset_status": "weak_match",
    "city_knowledge_influence": "Current request still needs a better Hangzhou-specific editorial expression.",
    "scene_requirement": "high",
    "brand_requirement": "high",
    "realism_requirement": "medium",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "generated_first",
    "winning_factors": [
      "weak existing asset is not strong enough to win",
      "cover role prefers generated",
      "plan suggestion is generated",
      "scene and brand requirements are both high"
    ],
    "rejected_options": [
      "existing rejected because only weak match is available",
      "external rejected because cover needs stronger Wanderly style control"
    ],
    "conflict_notes": "This case validates that weak legacy assets should not block new generation."
  }
}
```

### Case 6: Travel Experience Image

```json
{
  "case_id": "selector_case_006",
  "scenario": "Travel experience image such as Sichuan opera experience, Yunnan tea-picking, or Xi'an shadow puppetry.",
  "inputs": {
    "asset_role": "experience",
    "subject": "Local cultural experience",
    "plan_suggestion": "hybrid",
    "existing_asset_status": "none",
    "city_knowledge_influence": "Local culture should remain specific and believable.",
    "scene_requirement": "high",
    "brand_requirement": "medium",
    "realism_requirement": "medium",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "hybrid",
    "winning_factors": [
      "experience role naturally supports hybrid",
      "plan suggestion is hybrid",
      "external supports realism",
      "generated supports Wanderly atmosphere and brand tone"
    ],
    "rejected_options": [
      "generated-only rejected because experience credibility may be too weak",
      "external-only rejected because emotional narrative and brand atmosphere may be too weak",
      "existing rejected because no approved matching asset exists"
    ],
    "conflict_notes": "This case validates hybrid as a first-class intended strategy rather than a fallback."
  }
}
```

### Case 7: External Recommended But No Usable Image Found

```json
{
  "case_id": "selector_case_007",
  "scenario": "External is the preferred source, but later no usable external image is available.",
  "inputs": {
    "asset_role": "place",
    "subject": "Specific POI with poor stock coverage",
    "plan_suggestion": "external",
    "existing_asset_status": "none",
    "city_knowledge_influence": "Place authenticity still matters.",
    "scene_requirement": "low",
    "brand_requirement": "medium",
    "realism_requirement": "high",
    "manual_override": ""
  },
  "expected_decision": {
    "final_strategy": "external_first",
    "winning_factors": [
      "plan suggestion is external",
      "place role prefers external",
      "realism requirement is high"
    ],
    "rejected_options": [
      "generated rejected as primary strategy because realism is still the first-order requirement",
      "existing rejected because no approved matching asset exists"
    ],
    "conflict_notes": "Selector should preserve external-first as decision intent, while later execution is allowed to fallback to generated if no usable external image is found."
  }
}
```

### Case 8: Manual Override Forces Existing

```json
{
  "case_id": "selector_case_008",
  "scenario": "An editor or operator manually specifies that an approved existing asset must be used.",
  "inputs": {
    "asset_role": "cover",
    "subject": "Hangzhou trip cover",
    "plan_suggestion": "generated",
    "existing_asset_status": "strong_match",
    "city_knowledge_influence": "Existing asset already fits destination well enough.",
    "scene_requirement": "medium",
    "brand_requirement": "high",
    "realism_requirement": "medium",
    "manual_override": "existing"
  },
  "expected_decision": {
    "final_strategy": "existing_first",
    "winning_factors": [
      "manual override has highest priority",
      "strong approved existing asset is available"
    ],
    "rejected_options": [
      "generated rejected because manual override takes precedence over plan suggestion",
      "external rejected because it is unnecessary for this case"
    ],
    "conflict_notes": "This case verifies that manual override is the highest-priority decision input."
  }
}
```

## 5. Decision Trace Example

Future selector output should be able to preserve a readable decision trace like:

```json
{
  "winning_factors": [
    "cover role prefers generated",
    "plan suggestion is generated",
    "brand requirement is high"
  ],
  "rejected_options": [
    "external rejected because style consistency is weaker",
    "existing rejected because only weak match is available"
  ],
  "final_strategy": "generated_first"
}
```

## 6. Coverage Summary

This test suite currently validates:

- cover selection
- place selection
- food selection
- experience hybrid strategy
- existing strong match override
- weak existing asset rejection
- fallback intent preservation
- manual override priority

It also creates explicit standards for:

- source priority behavior
- conflict explainability
- future selector acceptance testing

## 7. Questions To Confirm Before Implementation

Before selector code is implemented, these product questions should be confirmed:

- when `plan_suggestion` and `strong_match existing` conflict, should reuse be the default if freshness is not explicitly required
- whether fallback intent should be recorded inside `asset_source_decision` or only at execution layer
- whether `manual_override` should become part of the formal decision input schema, or remain an out-of-band operator control
- whether `hybrid` should always mean multi-source composition, or can also mean “primary plus branded support asset”
- what exact threshold should distinguish `weak_match` from `strong_match`

## 8. Recommended Next Step

The most useful next step is to create one companion document with fully expanded expected selector outputs, so later implementation can test not only final strategy, but also the exact decision payload shape.
