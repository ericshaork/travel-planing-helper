import type { DedupeSummary, PoiDraft } from "./types.js";

function toHalfWidth(value: string): string {
  return value.replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, "");
}

function normalizeSuffix(value: string): string {
  return value
    .replace(/旅游景区$/u, "")
    .replace(/风景名胜区$/u, "")
    .replace(/风景区$/u, "")
    .replace(/景区$/u, "")
    .replace(/文化旅游区$/u, "")
    .replace(/步行街$/u, "步行街")
    .replace(/老街区$/u, "老街")
    .replace(/周边片区$/u, "片区");
}

export function normalizePoiName(city: string, name: string): string {
  const normalizedCity = normalizeWhitespace(toHalfWidth(city.trim().toLowerCase()));
  const normalizedName = normalizeWhitespace(toHalfWidth(name.trim().toLowerCase()))
    .replace(/[·•,，.。\-—_()（）]/g, "");
  const withoutCityPrefix = normalizedName.startsWith(normalizedCity) ? normalizedName.slice(normalizedCity.length) : normalizedName;

  return normalizeSuffix(withoutCityPrefix);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function choosePreferredName(currentName: string, nextName: string, city: string): string {
  const normalizedCity = city.trim();
  const currentHasCityPrefix = currentName.startsWith(normalizedCity);
  const nextHasCityPrefix = nextName.startsWith(normalizedCity);

  if (currentHasCityPrefix !== nextHasCityPrefix) {
    return currentHasCityPrefix ? nextName : currentName;
  }

  return nextName.length > currentName.length ? nextName : currentName;
}

function chooseDescription(currentDescription: string, nextDescription: string): string {
  return nextDescription.length > currentDescription.length ? nextDescription : currentDescription;
}

function chooseDuration(currentDuration: number, nextDuration: number): number {
  const average = Math.round((currentDuration + nextDuration) / 2 / 5) * 5;
  return Math.min(360, Math.max(30, average));
}

function chooseImageQuery(currentQuery: string, nextQuery: string): string {
  return nextQuery.length > currentQuery.length ? nextQuery : currentQuery;
}

export function dedupePoiDrafts(drafts: PoiDraft[]): { poiDrafts: PoiDraft[]; summary: DedupeSummary } {
  const dedupedMap = new Map<string, PoiDraft>();
  const mergedKeys = new Set<string>();

  for (const draft of drafts) {
    const normalizedKey = `${draft.city}::${normalizePoiName(draft.city, draft.name)}`;
    const existing = dedupedMap.get(normalizedKey);

    if (!existing) {
      dedupedMap.set(normalizedKey, {
        ...draft,
        tags: unique(draft.tags),
      });
      continue;
    }

    mergedKeys.add(normalizedKey);
    dedupedMap.set(normalizedKey, {
      ...existing,
      name: choosePreferredName(existing.name, draft.name, draft.city),
      tags: unique([...existing.tags, ...draft.tags]),
      description: chooseDescription(existing.description, draft.description),
      recommendedDurationMinutes: chooseDuration(existing.recommendedDurationMinutes, draft.recommendedDurationMinutes),
      imageQuery: chooseImageQuery(existing.imageQuery, draft.imageQuery),
    });
  }

  const poiDrafts = [...dedupedMap.values()].sort((left, right) => {
    if (left.city === right.city) {
      return left.name.localeCompare(right.name, "zh-CN");
    }

    return left.city.localeCompare(right.city, "zh-CN");
  });

  return {
    poiDrafts,
    summary: {
      beforeCount: drafts.length,
      afterCount: poiDrafts.length,
      removedCount: drafts.length - poiDrafts.length,
      mergedGroups: mergedKeys.size,
      normalizedKeys: [...mergedKeys].sort((left, right) => left.localeCompare(right, "zh-CN")),
    },
  };
}
