const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAbstractPlanFromTravelPlan,
  buildImageRequestFromPlan,
  normalizeSuggestedSource
} = require("../src/request_builder/build_image_request_from_plan");

test("normalizeSuggestedSource maps plan suggestions to selector-friendly values", () => {
  assert.equal(normalizeSuggestedSource("AI"), "generated");
  assert.equal(normalizeSuggestedSource("external"), "external");
  assert.equal(normalizeSuggestedSource("legacy"), "existing");
  assert.equal(normalizeSuggestedSource("hybrid"), "hybrid");
});

test("buildAbstractPlanFromTravelPlan maps section image requirements into entities", () => {
  const plan = {
    trip_id: "trip_hangzhou_001",
    title: "杭州三日慢游",
    destination: {
      city: "Hangzhou",
      region: "Zhejiang",
      country: "China"
    },
    sections: [
      {
        section_id: "day1_westlake",
        title: "西湖晨雾",
        image_requirement: {
          asset_role: "cover",
          suggested_source: "AI",
          description: "需要一张表现杭州清晨水雾和江南气质的封面",
          scene_hint: "misty lake morning"
        }
      }
    ]
  };

  const abstractPlan = buildAbstractPlanFromTravelPlan(plan);

  assert.equal(abstractPlan.trip_id, "trip_hangzhou_001");
  assert.equal(abstractPlan.entities.length, 1);
  assert.equal(abstractPlan.entities[0].asset_role, "cover");
  assert.equal(abstractPlan.entities[0].entity_type, "trip");
  assert.equal(abstractPlan.entities[0].suggested_source, "generated");
  assert.equal(abstractPlan.entities[0].scene_hint, "misty lake morning");
  assert.equal(abstractPlan.entities[0].location.city, "Hangzhou");
});

test("buildImageRequestFromPlan creates image_request with selection_hints preserved", () => {
  const plan = {
    trip_id: "trip_hangzhou_001",
    title: "杭州三日慢游",
    destination: {
      city: "Hangzhou",
      region: "Zhejiang",
      country: "China"
    },
    sections: [
      {
        section_id: "day1_westlake",
        title: "西湖晨雾",
        image_requirement: {
          asset_role: "cover",
          suggested_source: "AI",
          description: "需要一张表现杭州清晨水雾和江南气质的封面",
          scene_hint: "misty lake morning"
        }
      }
    ]
  };

  const imageRequest = buildImageRequestFromPlan(plan, {
    sourceRef: "memory://test-plan",
    requestedAt: "2026-07-17T12:00:00.000Z"
  });

  assert.equal(imageRequest.request_id, "imgreq_trip_hangzhou_001");
  assert.equal(imageRequest.asset_requests.length, 1);
  assert.equal(imageRequest.asset_requests[0].asset_role, "cover");
  assert.equal(imageRequest.asset_requests[0].selection_hints.suggested_source, "generated");
  assert.equal(
    imageRequest.asset_requests[0].selection_hints.description,
    "需要一张表现杭州清晨水雾和江南气质的封面"
  );
  assert.equal(imageRequest.asset_requests[0].selection_hints.scene_hint, "misty lake morning");
  assert.equal(imageRequest.requested_at, "2026-07-17T12:00:00.000Z");
});

test("buildImageRequestFromPlan ignores sections without image_requirement and keeps valid ones", () => {
  const plan = {
    trip_id: "trip_multi_001",
    title: "多段旅行计划",
    destination: {
      city: "Chengdu",
      region: "Sichuan",
      country: "China"
    },
    sections: [
      {
        section_id: "intro_only",
        title: "行前说明"
      },
      {
        section_id: "food_block",
        title: "火锅之夜",
        image_requirement: {
          asset_role: "food",
          suggested_source: "external",
          description: "需要真实可信的成都火锅图片",
          scene_hint: "night hotpot table"
        }
      }
    ]
  };

  const imageRequest = buildImageRequestFromPlan(plan);

  assert.equal(imageRequest.asset_requests.length, 1);
  assert.equal(imageRequest.asset_requests[0].asset_role, "food");
  assert.equal(imageRequest.asset_requests[0].selection_hints.suggested_source, "external");
});

test("buildImageRequestFromPlan throws when no mappable image requirements exist", () => {
  const plan = {
    trip_id: "trip_empty_001",
    title: "空白图片需求计划",
    sections: [
      {
        section_id: "plain_text",
        title: "没有图片需求"
      }
    ]
  };

  assert.throws(
    () => buildImageRequestFromPlan(plan),
    /No mappable image requirements found/
  );
});
