import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RevisionSuggestionCard } from "../components/create/RevisionSuggestionCard";
import {
  buildRevisionApplySuccessMessage,
  buildRevisionChangeInstruction,
  buildRevisionModificationRequest,
  buildRevisionVersionDescription,
} from "../lib/projects/revision-mode";
import type { RevisionModificationSuggestion } from "../lib/projects/revision-chat/revision-chat-types";

describe("revision mode helpers", () => {
  it("builds a deterministic replace instruction", () => {
    expect(
      buildRevisionChangeInstruction({
        day: 2,
        action: "replace",
        target: "Tea House",
        replacement: "Riverside Walk",
        reason: "A slower evening fits the trip better.",
      }),
    ).toContain("2");
  });

  it("combines revision changes into a workspace modification request", () => {
    const request = buildRevisionModificationRequest({
      changes: [
        {
          day: 2,
          action: "replace",
          target: "Tea House",
          replacement: "Riverside Walk",
          reason: "A slower evening fits the trip better.",
        },
        {
          day: 3,
          action: "add",
          target: "Evening plan",
          replacement: "Night market walk",
          reason: "Add a relaxed night activity.",
        },
      ],
    });

    expect(request).toContain("2");
    expect(request).toContain("Tea House");
    expect(request).toContain("Riverside Walk");
    expect(request).toContain("Night market walk");
    expect(request).toContain("A slower evening fits the trip better.");
    expect(request).toContain("Add a relaxed night activity.");
  });

  it("describes revision versions in user-facing language", () => {
    expect(
      buildRevisionVersionDescription({
        createdFrom: "ai_generate",
        versionNumber: 1,
      }),
    ).toBe("初始旅行方案");
    expect(
      buildRevisionVersionDescription({
        createdFrom: "ai_adjust",
        versionNumber: 2,
      }),
    ).toBe("AI调整版本");
  });

  it("builds a friendly apply success message", () => {
    expect(buildRevisionApplySuccessMessage(2)).toContain("V2");
    expect(buildRevisionApplySuccessMessage()).toContain("新版本");
  });
});

describe("revision suggestion card apply states", () => {
  const suggestion: RevisionModificationSuggestion = {
    type: "modification_suggestion",
    message: "Adjust day two to feel lighter.",
    changes: [
      {
        day: 2,
        action: "replace",
        target: "Tea House",
        replacement: "Riverside Walk",
        reason: "A slower evening fits the trip better.",
      },
    ],
  };

  it("renders the apply button as loading when a request is in progress", () => {
    const markup = renderToStaticMarkup(
      createElement(RevisionSuggestionCard, {
        suggestion,
        onApply: () => {},
        isApplying: true,
      }),
    );

    expect(markup).toContain("revision-suggestion-apply");
    expect(markup).toContain("disabled");
  });

  it("renders success and error feedback when provided", () => {
    const successMarkup = renderToStaticMarkup(
      createElement(RevisionSuggestionCard, {
        suggestion,
        onApply: () => {},
        applySuccessMessage: "Preview request sent successfully.",
      }),
    );

    const errorMarkup = renderToStaticMarkup(
      createElement(RevisionSuggestionCard, {
        suggestion,
        onApply: () => {},
        applyError: "Preview request failed.",
      }),
    );

    expect(successMarkup).toContain("Preview request sent successfully.");
    expect(errorMarkup).toContain("Preview request failed.");
  });
});
