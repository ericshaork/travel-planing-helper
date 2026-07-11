import type {
  ExploreTripContent,
  ExploreTripDailyActivity,
  ExploreTripDayContent,
  InspirationSelection,
} from "./types";
import type {
  ItineraryItem,
  ItineraryItemType,
  TripPlan,
  TripPlanDraft,
  TripRequestDraft,
} from "../trip/types";

function inferItemType(activity: ExploreTripDailyActivity): ItineraryItemType {
  if (activity.foodRefs.length > 0) {
    return "food";
  }

  if (activity.poiRefs.length > 0) {
    return "attraction";
  }

  return "other";
}

function inferSlot(timeBlock: string): "morning" | "afternoon" | "evening" {
  const normalized = timeBlock.trim().toLowerCase();

  if (
    normalized.includes("morning") ||
    normalized.includes("am") ||
    normalized.includes("breakfast") ||
    normalized.includes("early")
  ) {
    return "morning";
  }

  if (
    normalized.includes("evening") ||
    normalized.includes("night") ||
    normalized.includes("pm") ||
    normalized.includes("dinner")
  ) {
    return "evening";
  }

  return "afternoon";
}

function buildGuide(activity: ExploreTripDailyActivity) {
  const guide: string[] = [activity.description];

  if (activity.poiRefs.length > 0) {
    guide.push(`POI refs: ${activity.poiRefs.join(", ")}`);
  }

  if (activity.foodRefs.length > 0) {
    guide.push(`Food refs: ${activity.foodRefs.join(", ")}`);
  }

  return guide;
}

function toItineraryItem(
  activity: ExploreTripDailyActivity,
  day: ExploreTripDayContent,
): ItineraryItem {
  return {
    timeLabel: activity.timeBlock,
    placeName: activity.poiRefs[0] ?? activity.foodRefs[0] ?? `${day.title} stop`,
    type: inferItemType(activity),
    reason: activity.description,
    guide: buildGuide(activity),
    matchedInterests: [...activity.poiRefs, ...activity.foodRefs],
  };
}

function buildDailyPlan(day: ExploreTripDayContent) {
  const nextDay = {
    day: day.dayNumber,
    theme: day.title,
    routeOrder: [] as string[],
    routeReason: day.summary,
    morning: [] as ItineraryItem[],
    afternoon: [] as ItineraryItem[],
    evening: [] as ItineraryItem[],
    dailyTips: [day.summary],
  };

  for (const activity of day.activities) {
    const item = toItineraryItem(activity, day);
    const slot = inferSlot(activity.timeBlock);
    nextDay[slot].push(item);

    if (item.placeName) {
      nextDay.routeOrder.push(item.placeName);
    }
  }

  return nextDay;
}

function buildTripRequestDraft(content: ExploreTripContent): TripRequestDraft {
  return {
    destinationCity: content.city,
    days: content.days,
    interests: [...content.tags],
    travelStyles: [content.tripType, content.theme, content.pace].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ),
    mustVisitPlaces: content.pois.slice(0, 5).map((poi) => poi.name),
    specialRequirements:
      content.archiveIntro ??
      `Started from the archive "${content.title}" and ready for personal edits.`,
  };
}

function buildTripPlanSeed(content: ExploreTripContent): TripPlan {
  return {
    tripTitle: content.title,
    summary: content.summary,
    destination: content.city,
    days: content.days,
    travelStyleSummary: [content.tripType, content.theme, content.pace]
      .filter((value): value is string => Boolean(value))
      .join(" · "),
    weatherSummary: {
      available: false,
      overview: "Weather will be refreshed after this archive becomes a personal trip.",
      dailyForecast: [],
      alerts: [],
      reminders: ["Refresh weather after creating your personal version."],
      dataNote: "Explore archives do not carry live weather.",
    },
    budgetSummary: {
      totalEstimate: content.budgetLevel ?? "TBD",
      transport: "TBD",
      hotel: "TBD",
      food: "TBD",
      tickets: "TBD",
      localTransport: "TBD",
      flexibleSpending: "TBD",
      note:
        content.budgetNote ??
        "Budget details will be recalculated after you create your version.",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "Transport advice will be regenerated for the personal version.",
      options: [],
      suggestedPlatforms: [],
      note: "Explore archive content keeps the inspiration layer only.",
    },
    dailyItinerary: content.dailyItinerary.map(buildDailyPlan),
    generalTips: [...content.highlights],
    warnings: [
      "This trip seed comes from a public Explore archive and should be adjusted before use.",
    ],
  };
}

function buildPlaceholderTripPlanSeed(
  title: string,
  destination: string,
  summary: string,
  travelStyleSummary: string,
): TripPlan {
  return {
    tripTitle: title,
    summary,
    destination,
    days: 1,
    travelStyleSummary,
    weatherSummary: {
      available: false,
      overview: "Live weather will be added after the final route is generated.",
      dailyForecast: [],
      alerts: [],
      reminders: ["Use this as an idea draft before generating the full trip."],
      dataNote: "Explore inspiration drafts do not include live weather.",
    },
    budgetSummary: {
      totalEstimate: "TBD",
      transport: "TBD",
      hotel: "TBD",
      food: "TBD",
      tickets: "TBD",
      localTransport: "TBD",
      flexibleSpending: "TBD",
      note: "Budget will be estimated after the AI route is generated.",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "Transport advice will be generated after the route is confirmed.",
      options: [
        {
          mode: "other",
          pros: ["Keeps the inspiration draft lightweight."],
          cons: ["No route-specific transport recommendation yet."],
          recommendation:
            "Generate the full trip first, then transport guidance can be refreshed.",
        },
      ],
      suggestedPlatforms: [],
      note: "This placeholder seed exists only to keep the Create flow connected.",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "Inspiration draft",
        routeOrder: [destination],
        routeReason: summary,
        morning: [
          {
            placeName: destination,
            type: "other",
            reason: summary,
            guide: ["Review the inspiration selections and refine them in Create."],
          },
        ],
        afternoon: [],
        evening: [],
        dailyTips: ["Turn this inspiration into a full route in the next step."],
      },
    ],
    generalTips: ["This is an Explore inspiration draft, not a finished route."],
    warnings: [
      "Destination, dates, and budget may still need confirmation before AI generation.",
    ],
  };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildInspirationSummary(selection: InspirationSelection) {
  const summaryParts = [
    selection.location?.length ? `Location: ${selection.location.join(", ")}` : "",
    selection.food?.length ? `Food: ${selection.food.join(", ")}` : "",
    selection.season?.length ? `Season: ${selection.season.join(", ")}` : "",
    selection.companion?.length
      ? `Companion: ${selection.companion.join(", ")}`
      : "",
  ].filter(Boolean);

  return summaryParts.length > 0
    ? summaryParts.join(" | ")
    : "Explore inspiration draft";
}

export function buildTripPlanDraftFromExplore(
  content: ExploreTripContent,
): TripPlanDraft {
  return {
    tripTitle: content.title,
    sourceType: "explore_archive",
    sourceExploreId: content.id,
    sourceExploreSlug: content.slug,
    tripRequestDraft: buildTripRequestDraft(content),
    tripPlanSeed: buildTripPlanSeed(content),
  };
}

export function buildTripPlanDraftFromInspiration(
  selection: InspirationSelection,
  options?: {
    cityQuery?: string;
    sourceExploreId?: string;
    sourceExploreSlug?: string;
  },
): TripPlanDraft {
  const locationValues = selection.location ?? [];
  const destinationCity = options?.cityQuery?.trim() || undefined;
  const interestValues = unique([
    ...locationValues,
    ...(selection.food ?? []),
    ...(selection.season ?? []),
    ...(selection.companion ?? []),
  ]);
  const travelStyles = unique([
    ...(selection.season ?? []),
    ...(selection.companion ?? []),
    "explore-inspiration",
  ]);
  const summary = buildInspirationSummary(selection);
  const title = destinationCity
    ? `${destinationCity} inspiration draft`
    : "Explore inspiration draft";
  const seedDestination =
    destinationCity ?? locationValues[0] ?? "To be decided";

  return {
    tripTitle: title,
    sourceType: "explore_inspiration",
    sourceExploreId: options?.sourceExploreId,
    sourceExploreSlug: options?.sourceExploreSlug,
    tripRequestDraft: {
      destinationCity,
      days: 3,
      interests: interestValues,
      travelStyles,
      specialRequirements: summary,
    },
    tripPlanSeed: buildPlaceholderTripPlanSeed(
      title,
      seedDestination,
      summary,
      travelStyles.join(" · "),
    ),
  };
}
