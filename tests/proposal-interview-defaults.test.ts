import { describe, expect, it } from "vitest";

import { applyInterviewDefaults } from "../lib/projects/proposal/interview-defaults";
import type { TripRequestDraft } from "../lib/trip/types";

describe("applyInterviewDefaults", () => {
  it("fills missing departureCity, days, budget, currency, interests, travelStyles", () => {
    const draft: TripRequestDraft = {
      destinationCity: "杭州",
    };

    const result = applyInterviewDefaults(draft);

    expect(result.draft.destinationCity).toBe("杭州");
    expect(result.draft.departureCity).toBe("出发地待确认");
    expect(result.draft.days).toBeGreaterThan(0);
    expect(result.draft.budget).toBeGreaterThan(0);
    expect(result.draft.currency).toBe("CNY");
    expect(result.draft.interests?.length ?? 0).toBeGreaterThan(0);
    expect(result.draft.travelStyles?.length ?? 0).toBeGreaterThan(0);
    expect(result.filledFields).toEqual(
      expect.arrayContaining([
        "departureCity",
        "days",
        "budget",
        "currency",
        "interests",
        "travelStyles",
      ]),
    );
  });

  it("preserves user-provided fields and only fills gaps", () => {
    const draft: TripRequestDraft = {
      departureCity: "北京",
      destinationCity: "杭州",
      days: 4,
      budget: 5000,
      currency: "CNY",
      interests: ["美食", "历史文化"],
      travelStyles: ["轻松"],
    };

    const result = applyInterviewDefaults(draft);

    expect(result.draft).toEqual({
      departureCity: "北京",
      destinationCity: "杭州",
      days: 4,
      budget: 5000,
      currency: "CNY",
      interests: ["美食", "历史文化"],
      travelStyles: ["轻松"],
    });
    expect(result.filledFields).toEqual([]);
  });

  it("infers interests from destination keyword when interests is empty", () => {
    const draft: TripRequestDraft = {
      destinationCity: "海岛度假村",
    };

    const result = applyInterviewDefaults(draft);

    expect(result.draft.interests).toContain("海边");
  });

  it("always provides fallback interests when no signal matches", () => {
    const draft: TripRequestDraft = {
      destinationCity: "杭州",
    };

    const result = applyInterviewDefaults(draft);

    expect(result.draft.interests).toEqual(
      expect.arrayContaining(["当地体验", "城市漫步"]),
    );
  });

  it("estimates higher daily budget when travel style is relaxed", () => {
    const draft: TripRequestDraft = {
      destinationCity: "杭州",
      days: 3,
      travelStyles: ["轻松"],
    };

    const result = applyInterviewDefaults(draft);

    expect(result.draft.budget).toBe(3 * 1000);
  });

  it("estimates lower daily budget for compact travel styles", () => {
    const draft: TripRequestDraft = {
      destinationCity: "杭州",
      days: 5,
      travelStyles: ["高效率"],
    };

    const result = applyInterviewDefaults(draft);

    expect(result.draft.budget).toBe(5 * 600);
  });

  it("always marks the result as complete (never blocks generation)", () => {
    const draft: TripRequestDraft = {};

    const result = applyInterviewDefaults(draft);

    expect(result.isComplete).toBe(true);
    expect(result.filledFields.length).toBeGreaterThan(0);
  });

  it("produces a draft that passes normalizeTripRequestDraft", async () => {
    const { normalizeTripRequestDraft } = await import(
      "../lib/trip/normalize"
    );
    const draft: TripRequestDraft = {
      destinationCity: "杭州",
    };

    const result = applyInterviewDefaults(draft);
    const normalized = normalizeTripRequestDraft(result.draft);

    expect(normalized.success).toBe(true);
  });
});