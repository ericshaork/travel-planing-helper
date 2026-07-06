import type { TripPlan } from "./types";

export const MOBILE_OVERVIEW_FALLBACK =
  "这是一份 AI 生成的初版路线，出发前请再次确认天气、交通和开放时间。";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isCorruptedText(text: string): boolean {
  const normalized = normalizeText(text);

  if (!normalized) {
    return true;
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(normalized)) {
    return true;
  }

  if (
    normalized.includes("```") ||
    normalized.includes("�") ||
    normalized.includes("€")
  ) {
    return true;
  }

  const mojibakeMarkers = normalized.match(/[锟鈥銆锛]/gu)?.length ?? 0;

  if (mojibakeMarkers > 0) {
    return true;
  }

  const kanaOrHangulCount =
    normalized.match(/[\u3040-\u30ff\u3130-\u318f\uac00-\ud7af]/gu)?.length ?? 0;

  if (kanaOrHangulCount >= 4 && kanaOrHangulCount / normalized.length > 0.2) {
    return true;
  }

  return false;
}

export function safeDisplayText(text: string, fallback: string): string {
  const normalized = normalizeText(text);
  const normalizedFallback = normalizeText(fallback);

  if (!normalized || isCorruptedText(normalized)) {
    return normalizedFallback;
  }

  return normalized;
}

export function getMobileOverviewAccentText(
  tripPlan: Pick<TripPlan, "travelStyleSummary">,
): string {
  const safeTravelStyleSummary = safeDisplayText(
    tripPlan.travelStyleSummary,
    "",
  );

  if (safeTravelStyleSummary) {
    return safeTravelStyleSummary;
  }

  return MOBILE_OVERVIEW_FALLBACK;
}
